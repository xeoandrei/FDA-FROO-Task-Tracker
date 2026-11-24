import { Router } from 'express';
import * as XLSX from 'xlsx';
import { pool } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../auth';
import {
  checkFisConnection,
  resolveFisDtns,
  insertFisRemarkLog,
  searchFisDtnLogs,
  getSampleFisDtns,
} from '../fisDb';

const router = Router();

/**
 * Formats a user's first and last name into a concise initial + full surname (preserving generational suffixes like ", IV").
 * Examples:
 *  - firstName: "Andrei Manuel", lastName: "Delgado" -> "A. Delgado"
 *  - firstName: "Franklin Anthony", lastName: "Tabaquin, IV" -> "F. Tabaquin, IV"
 */
export function formatShortAttributionName(firstName?: string, lastName?: string): string {
  const cleanFirst = String(firstName || '').trim();
  const cleanLast = String(lastName || '').trim();
  if (!cleanFirst && !cleanLast) return 'FROO Officer';
  if (!cleanFirst) return cleanLast;
  if (!cleanLast) return cleanFirst;
  const firstInitial = cleanFirst.charAt(0).toUpperCase();
  return `${firstInitial}. ${cleanLast}`;
}

/**
 * Builds the standardized FROO Doctrack remark string:
 * "<Raw Remark> — Remarks by: A. Delgado (ODDG-FROO | via FROO Tracker)"
 */
export function buildFinalFisRemark(
  rawRemarks: string,
  aliasName: string,
  officeCode: string
): string {
  const trimmedRemark = String(rawRemarks || '').trim();
  const trimmedAlias = String(aliasName || 'FROO Officer').trim();
  const trimmedOffice = String(officeCode || 'ODDG-FROO').trim();

  // Avoid double-appending if the remark already contains "via FROO Tracker"
  if (trimmedRemark.toLowerCase().includes('via froo tracker')) {
    return trimmedRemark;
  }

  return `${trimmedRemark} — Remarks by: ${trimmedAlias} (${trimmedOffice} | via FROO Tracker)`;
}

export interface IncomingDoctrackRow {
  rowNum: number;
  rsn: string;
  remarks: string;
}

/**
 * Server-side Excel parser using SheetJS (mirrors CDRR backend pandas read_excel validation)
 */
function parseExcelBase64ToRows(fileBase64: string): {
  rows: IncomingDoctrackRow[];
  detectedDtnCol: string | null;
  detectedRemarksCol: string | null;
  error?: string;
} {
  try {
    const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const wb = XLSX.read(buffer, { type: 'buffer' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { rows: [], detectedDtnCol: null, detectedRemarksCol: null, error: 'Excel workbook contains no sheets.' };
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
      defval: '',
      raw: false,
    });

    if (rawData.length === 0) {
      return { rows: [], detectedDtnCol: null, detectedRemarksCol: null, error: 'The uploaded Excel sheet is empty.' };
    }

    const headers = Object.keys(rawData[0] || {});
    const detectedDtnCol =
      headers.find((h) => {
        const lower = h.toLowerCase().trim();
        return lower.includes('doctrack') || lower === 'dtn' || lower.includes('dtn') || lower === 'rsn' || lower.includes('tracking');
      }) || null;

    const detectedRemarksCol =
      headers.find((h) => {
        const lower = h.toLowerCase().trim();
        return lower.includes('remark') || lower.includes('comment') || lower.includes('status') || lower.includes('note');
      }) || null;

    if (!detectedDtnCol || !detectedRemarksCol) {
      return {
        rows: [],
        detectedDtnCol,
        detectedRemarksCol,
        error: `Could not detect required columns. Expected columns containing "Doctrack" (or "DTN") and "Remarks". Found: [${headers.join(', ')}]`,
      };
    }

    const rows: IncomingDoctrackRow[] = rawData.map((record, index) => ({
      rowNum: index + 2, // Row 1 is header in Excel
      rsn: String(record[detectedDtnCol] ?? '').trim(),
      remarks: String(record[detectedRemarksCol] ?? '').trim(),
    }));

    return {
      rows,
      detectedDtnCol,
      detectedRemarksCol,
    };
  } catch (err: any) {
    return {
      rows: [],
      detectedDtnCol: null,
      detectedRemarksCol: null,
      error: err?.message || 'Failed to parse Excel file on server.',
    };
  }
}

// -----------------------------------------------------------------------------
// GET /api/doctrack/status
// Returns FIS database connection status, default attribution preview, and sample DTNs
// -----------------------------------------------------------------------------
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const fisConnection = await checkFisConnection();
    const defaultAlias = formatShortAttributionName(user.firstName, user.lastName);
    const officeCode = user.office || 'ODDG-FROO';
    const sampleDtns = await getSampleFisDtns();

    res.json({
      connection: fisConnection,
      defaultAlias,
      officeCode,
      attributionSuffixPreview: `— Remarks by: ${defaultAlias} (${officeCode} | via FROO Tracker)`,
      sampleRemarkPreview: buildFinalFisRemark('For evaluation and field inspection verification', defaultAlias, officeCode),
      sampleDtns,
    });
  } catch (error) {
    console.error('Error fetching Doctrack status:', error);
    res.status(500).json({ error: 'Failed to retrieve FIS Doctrack status.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/doctrack/bulk-upload
// Processes bulk DTN remarks from either parsed rows or base64 Excel workbook
// -----------------------------------------------------------------------------
router.post('/bulk-upload', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const {
      fileName = 'doctrack_bulk_upload.xlsx',
      rows: clientRows,
      fileBase64,
      customAlias,
      syncFrooTasks = true,
    } = req.body || {};

    let incomingRows: IncomingDoctrackRow[] = [];

    if (typeof fileBase64 === 'string' && fileBase64.trim().length > 0) {
      const parsed = parseExcelBase64ToRows(fileBase64);
      if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
      }
      incomingRows = parsed.rows;
    } else if (Array.isArray(clientRows)) {
      incomingRows = clientRows.map((r: any, idx: number) => ({
        rowNum: Number(r.rowNum) || idx + 2,
        rsn: String(r.rsn ?? r.dtn ?? '').trim(),
        remarks: String(r.remarks ?? '').trim(),
      }));
    } else {
      return res.status(400).json({
        error: 'No Excel records provided. Upload a valid .xlsx / .xls file with Doctrack Number and Remarks columns.',
      });
    }

    // Filter out completely blank trailing Excel rows
    incomingRows = incomingRows.filter((r) => r.rsn !== '' || r.remarks !== '');

    if (incomingRows.length === 0) {
      return res.status(400).json({
        error: 'The uploaded Excel file contains no data rows.',
      });
    }

    const defaultAlias = formatShortAttributionName(user.firstName, user.lastName);
    const effectiveAlias = String(customAlias || '').trim() || defaultAlias;
    const officeCode = user.office || 'ODDG-FROO';
    const uploaderFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

    const fisConnection = await checkFisConnection();

    interface FailedRecord {
      rowNum: number;
      rsn: string;
      rawRemarks: string;
      reason: string;
    }

    interface InsertedRecord {
      rowNum: number;
      rsn: string;
      docrecID: number;
      rawRemarks: string;
      finalRemarks: string;
      logdate: string;
      syncedTaskIds: string[];
    }

    const failedRecords: FailedRecord[] = [];
    const preValidatedRows: Array<{
      rowNum: number;
      rsn: string;
      rawRemarks: string;
      finalRemarks: string;
    }> = [];

    const seenPairKeys = new Set<string>();

    // Step 1: Independent backend validation of format, completeness, and in-file duplicates
    for (const row of incomingRows) {
      const rsn = String(row.rsn || '').trim();
      const rawRemarks = String(row.remarks || '').trim();

      if (!rsn) {
        failedRecords.push({
          rowNum: row.rowNum,
          rsn: '',
          rawRemarks,
          reason: 'Missing Doctrack Number (DTN)',
        });
        continue;
      }

      if (!/^\d{14}$/.test(rsn)) {
        failedRecords.push({
          rowNum: row.rowNum,
          rsn,
          rawRemarks,
          reason: `Invalid DTN format "${rsn}" (must be exactly 14 numeric digits)`,
        });
        continue;
      }

      if (!rawRemarks) {
        failedRecords.push({
          rowNum: row.rowNum,
          rsn,
          rawRemarks: '',
          reason: 'Missing remarks text',
        });
        continue;
      }

      const dedupeKey = `${rsn}::${rawRemarks.toLowerCase()}`;
      if (seenPairKeys.has(dedupeKey)) {
        failedRecords.push({
          rowNum: row.rowNum,
          rsn,
          rawRemarks,
          reason: 'Duplicate DTN and identical remark in the same upload file',
        });
        continue;
      }
      seenPairKeys.add(dedupeKey);

      preValidatedRows.push({
        rowNum: row.rowNum,
        rsn,
        rawRemarks,
        finalRemarks: buildFinalFisRemark(rawRemarks, effectiveAlias, officeCode),
      });
    }

    const validFormatCount = preValidatedRows.length;

    // Step 2: Resolve DTNs against FIS document_tracker.docreceivingtbl
    const validRsns = preValidatedRows.map((r) => r.rsn);
    const rsnToDocrecIdMap = await resolveFisDtns(validRsns);

    const insertedRecords: InsertedRecord[] = [];
    let syncedTaskCount = 0;

    // Step 3: Insert remarks into document_tracker.docreceivinglogtbl & optionally sync local FROO tasks
    for (const item of preValidatedRows) {
      const docrecID = rsnToDocrecIdMap.get(item.rsn);
      if (docrecID === undefined || docrecID === null) {
        failedRecords.push({
          rowNum: item.rowNum,
          rsn: item.rsn,
          rawRemarks: item.rawRemarks,
          reason: 'DTN not found in FIS (document_tracker.docreceivingtbl)',
        });
        continue;
      }

      try {
        const insertRes = await insertFisRemarkLog(docrecID, item.rsn, item.finalRemarks);
        const syncedTaskIds: string[] = [];

        if (syncFrooTasks) {
          try {
            const [matchingTasks]: [any[], any] = await pool.query(
              `SELECT id, dtn, task_title, status, region, assigned_office_code, remarks FROM tasks WHERE dtn = ?`,
              [item.rsn]
            );
            for (const task of matchingTasks) {
              syncedTaskIds.push(task.id);
              syncedTaskCount++;

              await pool.query(
                `UPDATE tasks SET remarks = ? WHERE id = ?`,
                [item.finalRemarks, task.id]
              );

              await pool.query(
                `INSERT INTO task_activity_logs (task_id, action, actor_name, actor_office, actor_user_id, notes, new_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  task.id,
                  'FIS Doctrack Bulk Remark Synced',
                  uploaderFullName,
                  officeCode,
                  user.id,
                  item.finalRemarks,
                  task.status || 'In Progress',
                ]
              );
            }
          } catch (syncErr) {
            console.warn('Notice: Failed to sync matching FROO task for DTN', item.rsn, syncErr);
          }
        }

        insertedRecords.push({
          rowNum: item.rowNum,
          rsn: item.rsn,
          docrecID,
          rawRemarks: item.rawRemarks,
          finalRemarks: item.finalRemarks,
          logdate: insertRes.logdate,
          syncedTaskIds,
        });
      } catch (insertErr: any) {
        failedRecords.push({
          rowNum: item.rowNum,
          rsn: item.rsn,
          rawRemarks: item.rawRemarks,
          reason: `Database insertion failed: ${insertErr?.message || 'FIS query error'}`,
        });
      }
    }

    // Sort failedRecords by rowNum ascending
    failedRecords.sort((a, b) => a.rowNum - b.rowNum);

    // Step 4: Record batch and row-level audit trail in FROO database
    const historyId = `dth-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const totalCount = incomingRows.length;

    await pool.query(
      `INSERT INTO doctrack_upload_history (
        id, file_name, uploaded_by_user_id, uploaded_by_name, uploaded_by_office,
        alias_used, connection_mode, total_count, valid_count, inserted_count,
        synced_task_count, failed_count, failed_records_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId,
        String(fileName).slice(0, 250),
        user.id,
        uploaderFullName,
        officeCode,
        `${effectiveAlias} (${officeCode} | via FROO Tracker)`,
        fisConnection.mode,
        totalCount,
        validFormatCount,
        insertedRecords.length,
        syncedTaskCount,
        failedRecords.length,
        JSON.stringify(failedRecords),
      ]
    );

    for (const ins of insertedRecords) {
      await pool.query(
        `INSERT INTO doctrack_upload_history_records (
          history_id, row_num, rsn, raw_remarks, final_remarks, docrec_id, matched_task_id, status, error_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyId,
          ins.rowNum,
          ins.rsn,
          ins.rawRemarks,
          ins.finalRemarks,
          ins.docrecID,
          ins.syncedTaskIds.join(', ') || null,
          'INSERTED',
          null,
        ]
      );
    }

    for (const fail of failedRecords) {
      await pool.query(
        `INSERT INTO doctrack_upload_history_records (
          history_id, row_num, rsn, raw_remarks, final_remarks, docrec_id, matched_task_id, status, error_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          historyId,
          fail.rowNum,
          fail.rsn || 'MISSING',
          fail.rawRemarks || '',
          buildFinalFisRemark(fail.rawRemarks || '', effectiveAlias, officeCode),
          null,
          null,
          'FAILED',
          fail.reason,
        ]
      );
    }

    // Step 5: Write System Audit Log
    await pool.query(
      `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'DOCTRACK_BULK_UPLOAD',
        user.id,
        user.email,
        user.role,
        `Processed FIS Doctrack bulk upload "${fileName}" (${fisConnection.mode}): ${insertedRecords.length} inserted, ${syncedTaskCount} FROO tasks synced, ${failedRecords.length} failed.`,
        historyId,
        fileName,
      ]
    );

    const allFailed = totalCount > 0 && insertedRecords.length === 0;
    const message = allFailed
      ? `Upload completed with errors: 0 of ${totalCount} records were inserted.`
      : failedRecords.length > 0
      ? `Processed ${totalCount} rows: ${insertedRecords.length} inserted into FIS Doctrack, ${failedRecords.length} failed.`
      : `Successfully inserted all ${insertedRecords.length} DTN remark records into FIS Doctrack.`;

    res.json({
      success: insertedRecords.length > 0,
      mode: fisConnection.mode,
      historyId,
      fileName,
      message,
      attributionFormatUsed: `${effectiveAlias} (${officeCode} | via FROO Tracker)`,
      stats: {
        total: totalCount,
        valid: validFormatCount,
        inserted: insertedRecords.length,
        syncedTasks: syncedTaskCount,
        failed: failedRecords.length,
      },
      all_failed: allFailed,
      inserted_records: insertedRecords,
      failed_records: failedRecords,
    });
  } catch (error: any) {
    console.error('Error processing Doctrack bulk upload:', error);
    res.status(500).json({
      error: error?.message || 'Failed to process FIS Doctrack bulk upload.',
    });
  }
});

// -----------------------------------------------------------------------------
// GET /api/doctrack/dtn/:dtn
// Look up a 14-digit DTN in FIS (docreceivingtbl + docreceivinglogtbl) & local FROO tasks
// -----------------------------------------------------------------------------
router.get('/dtn/:dtn', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const dtn = String(req.params.dtn || '').trim();

    if (!/^\d{14}$/.test(dtn)) {
      return res.status(400).json({
        error: 'Invalid DTN format. Please enter an exact 14-digit numeric Document Tracking Number.',
      });
    }

    const fisResult = await searchFisDtnLogs(dtn);
    const [matchingTasks]: [any[], any] = await pool.query(
      `SELECT id, dtn, task_title, status, region, assigned_office_code, remarks FROM tasks WHERE dtn = ?`,
      [dtn]
    );

    await pool.query(
      `INSERT INTO system_audit_logs (event_type, user_id, user_email, user_role, description, target_entity_id, target_entity_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'DOCTRACK_DTN_SEARCH',
        user.id,
        user.email,
        user.role,
        `Queried FIS Doctrack logs for DTN ${dtn} (${fisResult.logs.length} FIS logs, ${matchingTasks.length} FROO tasks).`,
        dtn,
        `DTN ${dtn}`,
      ]
    );

    res.json({
      dtn,
      foundInFis: fisResult.foundInFis,
      mode: fisResult.mode,
      fisDocument: fisResult.document,
      fisLogs: fisResult.logs,
      matchingFrooTasks: matchingTasks.map((t: any) => ({
        id: t.id,
        dtn: t.dtn,
        taskTitle: t.task_title,
        status: t.status,
        region: t.region,
        assignedOffice: t.assigned_office_code,
        remarks: t.remarks,
      })),
    });
  } catch (error) {
    console.error('Error searching FIS DTN:', error);
    res.status(500).json({ error: 'Failed to query FIS Doctrack for the specified DTN.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/doctrack/history
// Returns past bulk upload batches (All for SUPERADMIN/ADMIN/ODDG-FROO, scoped for regional staff)
// -----------------------------------------------------------------------------
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const roleUpper = (user.role || '').toUpperCase();
    const isGlobalAdmin =
      roleUpper === 'SUPERADMIN' ||
      roleUpper === 'ADMIN' ||
      (user.office || '').toUpperCase() === 'ODDG-FROO';

    let rows: any[] = [];
    if (isGlobalAdmin) {
      const [allRows]: [any[], any] = await pool.query(
        `SELECT * FROM doctrack_upload_history ORDER BY uploaded_at DESC LIMIT 100`
      );
      rows = allRows;
    } else {
      const [scopedRows]: [any[], any] = await pool.query(
        `SELECT * FROM doctrack_upload_history WHERE uploaded_by_user_id = ? OR uploaded_by_office = ? ORDER BY uploaded_at DESC LIMIT 100`,
        [user.id, user.office]
      );
      rows = scopedRows;
    }

    const formatted = rows.map((r: any) => {
      let failedRecords = [];
      try {
        failedRecords = r.failed_records_json ? JSON.parse(r.failed_records_json) : [];
      } catch {
        failedRecords = [];
      }
      return {
        id: r.id,
        fileName: r.file_name,
        uploadedByUserId: r.uploaded_by_user_id,
        uploadedByName: r.uploaded_by_name,
        uploadedByOffice: r.uploaded_by_office,
        aliasUsed: r.alias_used,
        connectionMode: r.connection_mode,
        totalCount: Number(r.total_count || 0),
        validCount: Number(r.valid_count || 0),
        insertedCount: Number(r.inserted_count || 0),
        syncedTaskCount: Number(r.synced_task_count || 0),
        failedCount: Number(r.failed_count || 0),
        failedRecords,
        uploadedAt: r.uploaded_at,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching Doctrack upload history:', error);
    res.status(500).json({ error: 'Failed to fetch Doctrack upload history.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/doctrack/history/:id
// Returns row-level records for a specific bulk upload history batch
// -----------------------------------------------------------------------------
router.get('/history/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const historyId = req.params.id;
    const [batchRows]: [any[], any] = await pool.query(
      `SELECT * FROM doctrack_upload_history WHERE id = ?`,
      [historyId]
    );

    if (batchRows.length === 0) {
      return res.status(404).json({ error: 'Upload history batch not found.' });
    }

    const batch = batchRows[0];
    const [recordRows]: [any[], any] = await pool.query(
      `SELECT * FROM doctrack_upload_history_records WHERE history_id = ? ORDER BY row_num ASC`,
      [historyId]
    );

    let failedRecords = [];
    try {
      failedRecords = batch.failed_records_json ? JSON.parse(batch.failed_records_json) : [];
    } catch {
      failedRecords = [];
    }

    res.json({
      batch: {
        id: batch.id,
        fileName: batch.file_name,
        uploadedByUserId: batch.uploaded_by_user_id,
        uploadedByName: batch.uploaded_by_name,
        uploadedByOffice: batch.uploaded_by_office,
        aliasUsed: batch.alias_used,
        connectionMode: batch.connection_mode,
        totalCount: Number(batch.total_count || 0),
        validCount: Number(batch.valid_count || 0),
        insertedCount: Number(batch.inserted_count || 0),
        syncedTaskCount: Number(batch.synced_task_count || 0),
        failedCount: Number(batch.failed_count || 0),
        failedRecords,
        uploadedAt: batch.uploaded_at,
      },
      records: recordRows.map((rec: any) => ({
        id: rec.id,
        historyId: rec.history_id,
        rowNum: Number(rec.row_num || 0),
        rsn: rec.rsn,
        rawRemarks: rec.raw_remarks,
        finalRemarks: rec.final_remarks,
        docrecId: rec.docrec_id,
        matchedTaskId: rec.matched_task_id,
        status: rec.status,
        errorReason: rec.error_reason,
        createdAt: rec.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching Doctrack history details:', error);
    res.status(500).json({ error: 'Failed to fetch upload history batch details.' });
  }
});

export default router;
