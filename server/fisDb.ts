import 'dotenv/config';
import mysql from 'mysql2/promise';
import { pool as frooPool } from './db';

/**
 * Normalize SQLAlchemy / Python MySQL connection strings (e.g., mysql+pymysql:// or mysql+aiomysql://)
 * copied from CDRR's REMOTE_DATABASE_URL into standard mysql:// URIs supported by mysql2/promise.
 */
function normalizeMysqlUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return '';
  return trimmed.replace(/^mysql\+[a-z0-9_]+:\/\//i, 'mysql://');
}

const rawRemoteUri = normalizeMysqlUri(
  process.env.REMOTE_DATABASE_URL || process.env.FIS_DATABASE_URL || ''
);

const fisHost = process.env.FIS_DB_HOST || '';
const fisPort = Number(process.env.FIS_DB_PORT || 3306);
const fisUser = process.env.FIS_DB_USER || '';
const fisPassword = process.env.FIS_DB_PASSWORD || '';
const fisDatabase = process.env.FIS_DB_NAME || 'document_tracker';

const hasExplicitFisConfig = Boolean(rawRemoteUri || (fisHost && fisUser));

let fisPool: mysql.Pool | null = null;
let isFisAlive = false;
let lastFisError: string | null = null;

if (hasExplicitFisConfig) {
  try {
    if (rawRemoteUri) {
      fisPool = mysql.createPool({
        uri: rawRemoteUri,
        waitForConnections: true,
        connectionLimit: 8,
        queueLimit: 0,
        connectTimeout: 4000,
        ...(process.env.FIS_DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
      });
    } else {
      fisPool = mysql.createPool({
        host: fisHost,
        port: fisPort,
        user: fisUser,
        password: fisPassword,
        database: fisDatabase,
        waitForConnections: true,
        connectionLimit: 8,
        queueLimit: 0,
        connectTimeout: 4000,
        ...(process.env.FIS_DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
      });
    }
  } catch (err: any) {
    lastFisError = err?.message || 'Failed to initialize FIS MySQL pool';
    console.warn('⚠️ Could not initialize FIS Doctrack remote database pool:', lastFisError);
  }
}

export interface FisDocumentRecord {
  docrecID: number;
  RSN: string;
  subject?: string;
  originOffice?: string;
  dateReceived?: string;
}

export interface FisLogEntry {
  logID: number;
  docrecID: number;
  RSN: string;
  logdate: string;
  remarks: string;
}

// -----------------------------------------------------------------------------
// Local Test Mode Simulation Catalog (used when REMOTE_DATABASE_URL is not set)
// Mirrors document_tracker.docreceivingtbl and document_tracker.docreceivinglogtbl
// -----------------------------------------------------------------------------
const simulatedDocReceivingTbl = new Map<string, FisDocumentRecord>([
  [
    '20261026001234',
    {
      docrecID: 9401234,
      RSN: '20261026001234',
      subject: 'Application for Initial LTO - Drug Manufacturer (Metro Pharma Corp.)',
      originOffice: 'FDAC / CDRR',
      dateReceived: '2026-10-26 09:14:22',
    },
  ],
  [
    '20261026001235',
    {
      docrecID: 9401235,
      RSN: '20261026001235',
      subject: 'Referral for Field Inspection & GMP Verification - South Luzon Facility',
      originOffice: 'CDRR / ODDG-FROO',
      dateReceived: '2026-10-26 10:02:11',
    },
  ],
  [
    '20261028004512',
    {
      docrecID: 9404512,
      RSN: '20261028004512',
      subject: 'Post-Marketing Surveillance & Sampling Directive - Regional Field Office NCR',
      originOffice: 'ODDG-FROO',
      dateReceived: '2026-10-28 13:45:00',
    },
  ],
  [
    '20261102008891',
    {
      docrecID: 9408891,
      RSN: '20261102008891',
      subject: 'CAPA Compliance Verification Report - North Luzon Cluster',
      originOffice: 'NLC / Region 3',
      dateReceived: '2026-11-02 08:30:19',
    },
  ],
]);

let simulatedLogAutoId = 500100;
const simulatedDocReceivingLogTbl: FisLogEntry[] = [
  {
    logID: ++simulatedLogAutoId,
    docrecID: 9401234,
    RSN: '20261026001234',
    logdate: '2026-10-26 09:15:00',
    remarks: 'Document received at FDAC Receiving Section and encoded in FIS Doctrack.',
  },
  {
    logID: ++simulatedLogAutoId,
    docrecID: 9401234,
    RSN: '20261026001234',
    logdate: '2026-10-26 14:20:10',
    remarks: 'Forwarded to ODDG-FROO for regional field inspection endorsement.',
  },
  {
    logID: ++simulatedLogAutoId,
    docrecID: 9401235,
    RSN: '20261026001235',
    logdate: '2026-10-26 10:05:00',
    remarks: 'Endorsed to Regional Field Office for pre-licensing inspection scheduling.',
  },
  {
    logID: ++simulatedLogAutoId,
    docrecID: 9404512,
    RSN: '20261028004512',
    logdate: '2026-10-28 13:50:00',
    remarks: 'Received by ODDG-FROO Central Receiving for regional assignment.',
  },
];

function deterministicDocrecIdFromRsn(rsn: string): number {
  const tail = Number(rsn.slice(-6)) || 100000;
  return 9000000 + tail;
}

/**
 * Checks whether the remote FIS database connection is live.
 */
export async function checkFisConnection(): Promise<{
  connected: boolean;
  mode: 'LIVE_FIS' | 'LOCAL_TEST';
  database: string;
  hostSummary: string;
  message: string;
}> {
  if (!fisPool || !hasExplicitFisConfig) {
    isFisAlive = false;
    return {
      connected: false,
      mode: 'LOCAL_TEST',
      database: 'document_tracker (Local Test Store)',
      hostSummary: 'In-App FIS Simulation + FROO Task DTN Resolver',
      message:
        'Operating in Local Test Mode. Set REMOTE_DATABASE_URL in environment variables to enable live writes to document_tracker.docreceivinglogtbl.',
    };
  }

  try {
    const conn = await fisPool.getConnection();
    try {
      await conn.query('SELECT 1');
      isFisAlive = true;
      lastFisError = null;
      return {
        connected: true,
        mode: 'LIVE_FIS',
        database: fisDatabase,
        hostSummary: fisHost || 'REMOTE_DATABASE_URL (FIS MySQL)',
        message: 'Connected to live FDA FIS Doctrack database (document_tracker).',
      };
    } finally {
      conn.release();
    }
  } catch (err: any) {
    isFisAlive = false;
    lastFisError = err?.message || 'Remote FIS MySQL unreachable';
    return {
      connected: false,
      mode: 'LOCAL_TEST',
      database: 'document_tracker (Fallback Test Store)',
      hostSummary: 'Remote FIS unreachable — using Local Test Store',
      message: `Remote FIS connection unavailable (${lastFisError}). Operating in safe Local Test Mode.`,
    };
  }
}

/**
 * Sync simulated catalog with any 14-digit DTNs that exist in FROO's local `tasks` table
 * so users testing in Local Test Mode can always resolve real FROO task DTNs.
 */
async function syncFrooTasksIntoSimulatedFis(): Promise<void> {
  try {
    const [rows] = await frooPool.query(
      `SELECT dtn, task_title, origin, created_at FROM tasks WHERE dtn IS NOT NULL AND dtn != 'N/A'`
    );
    for (const row of rows as any[]) {
      const rsn = String(row.dtn || '').trim();
      if (/^\d{14}$/.test(rsn) && !simulatedDocReceivingTbl.has(rsn)) {
        const docrecID = deterministicDocrecIdFromRsn(rsn);
        simulatedDocReceivingTbl.set(rsn, {
          docrecID,
          RSN: rsn,
          subject: row.task_title || 'FROO Tracked Regulatory Document',
          originOffice: row.origin || 'ODDG-FROO',
          dateReceived: row.created_at
            ? new Date(row.created_at).toISOString().slice(0, 19).replace('T', ' ')
            : new Date().toISOString().slice(0, 19).replace('T', ' '),
        });
      }
    }
  } catch {
    // Ignore sync error
  }
}

/**
 * Resolve an array of 14-digit DTNs (RSNs) to their internal FIS `docrecID` values.
 * Mirrors CDRR's exact query:
 *   SELECT docrecID, RSN FROM document_tracker.docreceivingtbl WHERE RSN IN (...);
 */
export async function resolveFisDtns(rsns: string[]): Promise<Map<string, number>> {
  const uniqueRsns = Array.from(new Set(rsns.map((r) => String(r || '').trim()).filter(Boolean)));
  const resolvedMap = new Map<string, number>();

  if (uniqueRsns.length === 0) {
    return resolvedMap;
  }

  const status = await checkFisConnection();

  if (status.mode === 'LIVE_FIS' && fisPool && isFisAlive) {
    // Chunk IN clauses by 200 to stay safe on large Excel files
    const chunkSize = 200;
    for (let i = 0; i < uniqueRsns.length; i += chunkSize) {
      const chunk = uniqueRsns.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(', ');
      const [rows] = await fisPool.query(
        `SELECT docrecID, RSN FROM ${fisDatabase}.docreceivingtbl WHERE RSN IN (${placeholders})`,
        chunk
      );
      for (const row of rows as any[]) {
        const rsnKey = String(row.RSN ?? row.rsn ?? '').trim();
        const docrecIdVal = Number(row.docrecID ?? row.docrecid ?? row.DOCRECID);
        if (rsnKey && !Number.isNaN(docrecIdVal)) {
          resolvedMap.set(rsnKey, docrecIdVal);
        }
      }
    }
    return resolvedMap;
  }

  // Local Test Mode resolution:
  // 1. Ensure all current 14-digit FROO task DTNs are registered in the simulated catalog
  await syncFrooTasksIntoSimulatedFis();

  // 2. For each requested 14-digit RSN:
  //    - If it ends with '0000' (e.g., 20260000000000), treat as "DTN not found in FIS" so users can test failed CSV export.
  //    - Otherwise resolve from simulatedDocReceivingTbl or auto-register valid 14-digit DTN in Local Test Mode.
  for (const rsn of uniqueRsns) {
    if (!/^\d{14}$/.test(rsn)) continue;
    if (rsn.endsWith('0000')) {
      continue; // Reserved pattern in Local Test Mode to simulate "DTN not found in FIS"
    }
    let existing = simulatedDocReceivingTbl.get(rsn);
    if (!existing) {
      existing = {
        docrecID: deterministicDocrecIdFromRsn(rsn),
        RSN: rsn,
        subject: `FIS Document Record #${rsn}`,
        originOffice: 'FDA FIS Doctrack',
        dateReceived: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      simulatedDocReceivingTbl.set(rsn, existing);
    }
    resolvedMap.set(rsn, existing.docrecID);
  }

  return resolvedMap;
}

/**
 * Insert a new remark log row into `document_tracker.docreceivinglogtbl`.
 * Mirrors CDRR's exact query:
 *   INSERT INTO document_tracker.docreceivinglogtbl (docrecID, logdate, remarks)
 *   VALUES (:docrecID, NOW(), :remarks);
 */
export async function insertFisRemarkLog(
  docrecID: number,
  rsn: string,
  finalRemarks: string
): Promise<{ inserted: boolean; logID?: number; logdate: string }> {
  const nowFormatted = new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (isFisAlive && fisPool) {
    const [result]: any = await fisPool.query(
      `INSERT INTO ${fisDatabase}.docreceivinglogtbl (docrecID, logdate, remarks) VALUES (?, NOW(), ?)`,
      [docrecID, finalRemarks]
    );
    return {
      inserted: true,
      logID: result?.insertId,
      logdate: nowFormatted,
    };
  }

  // Local Test Mode: append to simulated docreceivinglogtbl
  const entry: FisLogEntry = {
    logID: ++simulatedLogAutoId,
    docrecID,
    RSN: rsn,
    logdate: nowFormatted,
    remarks: finalRemarks,
  };
  simulatedDocReceivingLogTbl.unshift(entry);
  return {
    inserted: true,
    logID: entry.logID,
    logdate: entry.logdate,
  };
}

/**
 * Lookup a single 14-digit DTN (RSN) and its complete `docreceivinglogtbl` timeline.
 */
export async function searchFisDtnLogs(rsn: string): Promise<{
  foundInFis: boolean;
  mode: 'LIVE_FIS' | 'LOCAL_TEST';
  document: FisDocumentRecord | null;
  logs: FisLogEntry[];
}> {
  const cleaned = String(rsn || '').trim();
  const status = await checkFisConnection();

  if (status.mode === 'LIVE_FIS' && fisPool && isFisAlive) {
    const [docRows] = await fisPool.query(
      `SELECT docrecID, RSN FROM ${fisDatabase}.docreceivingtbl WHERE RSN = ? LIMIT 1`,
      [cleaned]
    );
    const docList = docRows as any[];
    if (docList.length === 0) {
      return {
        foundInFis: false,
        mode: 'LIVE_FIS',
        document: null,
        logs: [],
      };
    }

    const docRow = docList[0];
    const docrecID = Number(docRow.docrecID ?? docRow.docrecid ?? docRow.DOCRECID);
    const [logRows] = await fisPool.query(
      `SELECT docrecID, logdate, remarks FROM ${fisDatabase}.docreceivinglogtbl WHERE docrecID = ? ORDER BY logdate DESC LIMIT 250`,
      [docrecID]
    );

    const logs: FisLogEntry[] = (logRows as any[]).map((r, idx) => ({
      logID: Number(r.logID ?? r.id ?? idx + 1),
      docrecID,
      RSN: cleaned,
      logdate: r.logdate ? new Date(r.logdate).toISOString() : new Date().toISOString(),
      remarks: String(r.remarks ?? ''),
    }));

    return {
      foundInFis: true,
      mode: 'LIVE_FIS',
      document: {
        docrecID,
        RSN: String(docRow.RSN ?? cleaned),
      },
      logs,
    };
  }

  // Local Test Mode lookup
  await syncFrooTasksIntoSimulatedFis();
  const doc = simulatedDocReceivingTbl.get(cleaned) || null;
  if (!doc) {
    return {
      foundInFis: false,
      mode: 'LOCAL_TEST',
      document: null,
      logs: [],
    };
  }

  const logs = simulatedDocReceivingLogTbl
    .filter((l) => l.docrecID === doc.docrecID || l.RSN === cleaned)
    .sort((a, b) => new Date(b.logdate).getTime() - new Date(a.logdate).getTime());

  return {
    foundInFis: true,
    mode: 'LOCAL_TEST',
    document: doc,
    logs,
  };
}

/**
 * Return sample 14-digit DTNs from the simulation store and existing FROO tasks
 * so users can test DTN Search or populate template files immediately.
 */
export async function getSampleFisDtns(): Promise<Array<{ rsn: string; subject: string; source: 'FROO_TASK' | 'FIS_SAMPLE' }>> {
  await syncFrooTasksIntoSimulatedFis();
  const samples: Array<{ rsn: string; subject: string; source: 'FROO_TASK' | 'FIS_SAMPLE' }> = [];
  const seen = new Set<string>();

  try {
    const [taskRows] = await frooPool.query(
      `SELECT dtn, task_title FROM tasks WHERE dtn IS NOT NULL AND dtn != 'N/A' ORDER BY created_at DESC LIMIT 8`
    );
    for (const r of taskRows as any[]) {
      const rsn = String(r.dtn || '').trim();
      if (/^\d{14}$/.test(rsn) && !seen.has(rsn)) {
        seen.add(rsn);
        samples.push({
          rsn,
          subject: String(r.task_title || 'FROO Task Document'),
          source: 'FROO_TASK',
        });
      }
    }
  } catch {
    // Ignore
  }

  for (const [rsn, doc] of simulatedDocReceivingTbl.entries()) {
    if (!seen.has(rsn) && samples.length < 8) {
      seen.add(rsn);
      samples.push({
        rsn,
        subject: doc.subject || `FIS Document #${rsn}`,
        source: 'FIS_SAMPLE',
      });
    }
  }

  return samples;
}

/**
 * Formats a user's first and last name into initial + surname (preserving suffixes like ", IV").
 */
export function formatShortAttributionName(firstName?: string, lastName?: string): string {
  const cleanFirst = String(firstName || '').trim();
  const cleanLast = String(lastName || '').trim();
  if (!cleanFirst && !cleanLast) return 'FROO Officer';
  if (!cleanFirst) return cleanLast;
  if (!cleanLast) return cleanFirst;
  return `${cleanFirst.charAt(0).toUpperCase()}. ${cleanLast}`;
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

  if (trimmedRemark.toLowerCase().includes('via froo tracker')) {
    return trimmedRemark;
  }

  return `${trimmedRemark} — Remarks by: ${trimmedAlias} (${trimmedOffice} | via FROO Tracker)`;
}

/**
 * Resolves a 14-digit DTN and inserts a task activity / progress remark into FIS docreceivinglogtbl.
 */
export async function writeSingleTaskActivityToFis(params: {
  dtn: string;
  rawRemark: string;
  firstName?: string;
  lastName?: string;
  officeCode?: string;
}): Promise<{
  synced: boolean;
  mode: 'LIVE_FIS' | 'LOCAL_TEST';
  docrecID?: number;
  finalRemarks?: string;
  reason?: string;
}> {
  const cleanDtn = String(params.dtn || '').trim();
  if (!/^\d{14}$/.test(cleanDtn)) {
    return {
      synced: false,
      mode: isFisAlive ? 'LIVE_FIS' : 'LOCAL_TEST',
      reason: 'Task does not have a valid 14-digit numeric DTN.',
    };
  }

  const alias = formatShortAttributionName(params.firstName, params.lastName);
  const office = params.officeCode || 'ODDG-FROO';
  const finalRemarks = buildFinalFisRemark(params.rawRemark, alias, office);
  const status = await checkFisConnection();

  const resolvedMap = await resolveFisDtns([cleanDtn]);
  const docrecID = resolvedMap.get(cleanDtn);

  if (docrecID === undefined || docrecID === null) {
    return {
      synced: false,
      mode: status.mode,
      finalRemarks,
      reason: `DTN ${cleanDtn} not found in FIS (document_tracker.docreceivingtbl).`,
    };
  }

  await insertFisRemarkLog(docrecID, cleanDtn, finalRemarks);
  return {
    synced: true,
    mode: status.mode,
    docrecID,
    finalRemarks,
  };
}

