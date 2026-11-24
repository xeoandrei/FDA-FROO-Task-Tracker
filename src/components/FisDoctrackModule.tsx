import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Trash2,
  Check,
  Info,
} from 'lucide-react';
import { UserAccount } from '../types/auth';
import { Task } from '../types/task';
import {
  DoctrackStatusResponse,
  ParsedExcelRow,
  DoctrackBulkUploadResponse,
  DoctrackFailedRecord,
} from '../types/doctrack';
import { api } from '../api/client';

interface FisDoctrackModuleProps {
  currentUser: UserAccount;
  tasks: Task[];
  onBackToTasks: () => void;
  onOpenTaskDetails: (task: Task) => void;
  onTasksSynced: () => void;
  onShowToast: (msg: string) => void;
  onConnectionModeChange?: (mode: 'LIVE_FIS' | 'LOCAL_TEST') => void;
}

/**
 * Formats a user's first and last name into initial + surname (preserving suffixes like ", IV").
 */
function formatClientShortAlias(firstName?: string, lastName?: string): string {
  const cleanFirst = String(firstName || '').trim();
  const cleanLast = String(lastName || '').trim();
  if (!cleanFirst && !cleanLast) return 'FROO Officer';
  if (!cleanFirst) return cleanLast;
  if (!cleanLast) return cleanFirst;
  return `${cleanFirst.charAt(0).toUpperCase()}. ${cleanLast}`;
}

export const FisDoctrackModule: React.FC<FisDoctrackModuleProps> = ({
  currentUser,
  tasks,
  onBackToTasks,
  onOpenTaskDetails,
  onTasksSynced,
  onShowToast,
  onConnectionModeChange,
}) => {
  // Status & attribution config
  const [doctrackStatus, setDoctrackStatus] = useState<DoctrackStatusResponse | null>(null);

  const defaultShortAlias = useMemo(
    () => formatClientShortAlias(currentUser.firstName, currentUser.lastName),
    [currentUser.firstName, currentUser.lastName]
  );
  const [customAlias, setCustomAlias] = useState<string>('');
  const [syncFrooTasks, setSyncFrooTasks] = useState<boolean>(true);

  // Bulk Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [detectedColumns, setDetectedColumns] = useState<{ dtnCol: string; remarksCol: string } | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedExcelRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);
  const [uploadResult, setUploadResult] = useState<DoctrackBulkUploadResponse | null>(null);

  const effectiveAlias = (customAlias.trim() || doctrackStatus?.defaultAlias || defaultShortAlias).trim();
  const officeCode = currentUser.office || 'ODDG-FROO';

  const formatPreviewRemark = (rawRemark: string) => {
    const clean = (rawRemark || 'For evaluation').trim();
    if (clean.toLowerCase().includes('via froo tracker')) return clean;
    return `${clean} — Remarks by: ${effectiveAlias} (${officeCode} | via FROO Tracker)`;
  };

  // Map of 14-digit DTNs present in FROO's local tasks
  const frooTaskByDtnMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of tasks) {
      const dtn = String(t.dtn || '').trim();
      if (/^\d{14}$/.test(dtn) && !map.has(dtn)) {
        map.set(dtn, t);
      }
    }
    return map;
  }, [tasks]);

  // Fetch FIS status on mount
  useEffect(() => {
    let isMounted = true;
    api
      .getDoctrackStatus()
      .then((res) => {
        if (!isMounted) return;
        setDoctrackStatus(res);
        if (onConnectionModeChange && res.connection?.mode) {
          onConnectionModeChange(res.connection.mode);
        }
      })
      .catch((err: any) => {
        console.warn('DTN Integration status notice:', err?.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Re-validate rows client-side whenever rows change
  const revalidateRowList = (rawItems: Array<{ rowNum: number; rsn: string; remarks: string }>): ParsedExcelRow[] => {
    const seenPairs = new Set<string>();
    return rawItems.map((item) => {
      const rsn = String(item.rsn || '').trim();
      const remarks = String(item.remarks || '').trim();

      if (!rsn) {
        return {
          rowNum: item.rowNum,
          rsn,
          remarks,
          isValid: false,
          validationError: 'Missing Doctrack Number (DTN)',
        };
      }
      if (!/^\d{14}$/.test(rsn)) {
        return {
          rowNum: item.rowNum,
          rsn,
          remarks,
          isValid: false,
          validationError: `Invalid DTN (${rsn.length} chars — must be 14 digits)`,
        };
      }
      if (!remarks) {
        return {
          rowNum: item.rowNum,
          rsn,
          remarks,
          isValid: false,
          validationError: 'Missing remarks',
        };
      }
      const pairKey = `${rsn}::${remarks.toLowerCase()}`;
      if (seenPairs.has(pairKey)) {
        return {
          rowNum: item.rowNum,
          rsn,
          remarks,
          isValid: false,
          validationError: 'Duplicate DTN + Remark in file',
        };
      }
      seenPairs.add(pairKey);

      return {
        rowNum: item.rowNum,
        rsn,
        remarks,
        isValid: true,
      };
    });
  };

  // Parse uploaded Excel file using SheetJS
  const handleExcelFileSelected = (file: File) => {
    setParseError(null);
    setUploadResult(null);
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          setParseError('The selected Excel file has no worksheets.');
          setParsedRows([]);
          return;
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
          defval: '',
          raw: false, // Preserves 14-digit strings & leading zeros
        });

        if (jsonData.length === 0) {
          setParseError('The uploaded worksheet is empty. Please include a header row and at least 1 data row.');
          setParsedRows([]);
          return;
        }

        const headers = Object.keys(jsonData[0] || {});
        const dtnCol =
          headers.find((h) => {
            const lower = h.toLowerCase().trim();
            return (
              lower.includes('doctrack') ||
              lower === 'dtn' ||
              lower.includes('dtn') ||
              lower === 'rsn' ||
              lower.includes('tracking')
            );
          }) || null;

        const remarksCol =
          headers.find((h) => {
            const lower = h.toLowerCase().trim();
            return (
              lower.includes('remark') ||
              lower.includes('comment') ||
              lower.includes('status') ||
              lower.includes('note')
            );
          }) || null;

        if (!dtnCol || !remarksCol) {
          setParseError(
            `Required columns not detected. Make sure your Excel sheet has columns containing "Doctrack" (or "DTN") and "Remarks". Detected columns: [${headers.join(', ')}]`
          );
          setParsedRows([]);
          setDetectedColumns(null);
          return;
        }

        setDetectedColumns({ dtnCol, remarksCol });

        const extracted = jsonData
          .map((row, idx) => ({
            rowNum: idx + 2, // Excel row 1 is headers
            rsn: String(row[dtnCol] ?? '').trim(),
            remarks: String(row[remarksCol] ?? '').trim(),
          }))
          .filter((r) => r.rsn !== '' || r.remarks !== '');

        if (extracted.length === 0) {
          setParseError('No non-empty rows found under the detected DTN and Remarks columns.');
          setParsedRows([]);
          return;
        }

        const validated = revalidateRowList(extracted);
        setParsedRows(validated);
        setPreviewFilter('ALL');
      } catch (err: any) {
        setParseError(err?.message || 'Failed to read Excel file. Please upload a valid .xlsx or .xls file.');
        setParsedRows([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Download a pre-formatted Excel Template (.xlsx) via SheetJS
  const handleDownloadExcelTemplate = () => {
    const sampleTaskDtns = Array.from(frooTaskByDtnMap.values()).slice(0, 2);
    const templateRows = [
      {
        'Doctrack Number': sampleTaskDtns[0]?.dtn || '20261026001234',
        Remarks: 'For regional field inspection and GMP compliance verification',
      },
      {
        'Doctrack Number': sampleTaskDtns[1]?.dtn || '20261026001235',
        Remarks: 'Forwarded to Regional Field Supervisor for assignment',
      },
      {
        'Doctrack Number': '20261028004512',
        Remarks: 'Inspection completed; awaiting CAPA evaluation report',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [{ wch: 22 }, { wch: 62 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DTN Bulk Remarks');
    XLSX.writeFile(wb, 'FROO_DTN_Bulk_Upload_Template.xlsx');
    onShowToast('Downloaded FROO DTN Bulk Upload Excel template (.xlsx).');
  };

  // Load sample batch directly into preview table for instant 1-click evaluation
  const handleLoadSampleBatchIntoPreview = () => {
    setParseError(null);
    setUploadResult(null);
    setSelectedFileName('FROO_Sample_DTN_Batch.xlsx');
    setDetectedColumns({ dtnCol: 'Doctrack Number', remarksCol: 'Remarks' });

    const sampleTaskDtns = Array.from(frooTaskByDtnMap.values()).slice(0, 2);
    const rawSample = [
      {
        rowNum: 2,
        rsn: sampleTaskDtns[0]?.dtn || '20261026001234',
        remarks: 'Received by ODDG-FROO and endorsed for regional inspection',
      },
      {
        rowNum: 3,
        rsn: sampleTaskDtns[1]?.dtn || '20261026001235',
        remarks: 'For pre-licensing inspection and verification by Regional Field Office',
      },
      {
        rowNum: 4,
        rsn: '20261028004512',
        remarks: 'Forwarded to Regional Supervisor for field dispatch approval',
      },
    ];
    setParsedRows(revalidateRowList(rawSample));
    setPreviewFilter('ALL');
    onShowToast('Loaded 3 sample DTN rows into the review table.');
  };

  const handleRemovePreviewRow = (rowNum: number) => {
    const remaining = parsedRows
      .filter((r) => r.rowNum !== rowNum)
      .map((r) => ({ rowNum: r.rowNum, rsn: r.rsn, remarks: r.remarks }));
    setParsedRows(revalidateRowList(remaining));
  };

  const handleClearPreview = () => {
    setParsedRows([]);
    setSelectedFileName('');
    setDetectedColumns(null);
    setParseError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit rows to POST /api/doctrack/bulk-upload
  const handleSubmitBulkUpload = async () => {
    if (parsedRows.length === 0) return;
    setIsSubmittingUpload(true);
    setParseError(null);

    try {
      const response = await api.submitDoctrackBulkUpload({
        fileName: selectedFileName || 'dtn_bulk_upload.xlsx',
        rows: parsedRows.map((r) => ({
          rowNum: r.rowNum,
          rsn: r.rsn,
          remarks: r.remarks,
        })),
        customAlias: customAlias.trim() || undefined,
        syncFrooTasks,
      });

      setUploadResult(response);
      onShowToast(response.message);
      if (response.stats.syncedTasks > 0) {
        onTasksSynced();
      }
    } catch (err: any) {
      setParseError(err?.message || 'Failed to process DTN bulk upload.');
    } finally {
      setIsSubmittingUpload(false);
    }
  };

  // Export failed records as CSV
  const handleDownloadFailedCsv = (failedList: DoctrackFailedRecord[], sourceFileName?: string) => {
    if (!failedList || failedList.length === 0) return;
    const headers = ['Row Number', 'Doctrack Number', 'Remarks', 'Error Reason'];
    const csvRows = failedList.map((item) => [
      String(item.rowNum),
      `"${String(item.rsn || '').replace(/"/g, '""')}"`,
      `"${String(item.rawRemarks || '').replace(/"/g, '""')}"`,
      `"${String(item.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = (sourceFileName || selectedFileName || 'dtn_upload')
      .replace(/\.xlsx?$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${baseName}_FAILED_RECORDS.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const validRowsCount = useMemo(() => parsedRows.filter((r) => r.isValid).length, [parsedRows]);
  const invalidRowsCount = useMemo(() => parsedRows.filter((r) => !r.isValid).length, [parsedRows]);

  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'VALID') return parsedRows.filter((r) => r.isValid);
    if (previewFilter === 'INVALID') return parsedRows.filter((r) => !r.isValid);
    return parsedRows;
  }, [parsedRows, previewFilter]);

  const connectionMode = doctrackStatus?.connection?.mode || 'LOCAL_TEST';

  return (
    <div className="space-y-5">
      {/* Top Module Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onBackToTasks}
              className="md:hidden inline-flex items-center gap-1 text-xs font-semibold text-[#056839] hover:underline mr-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tasks</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-[#056839] border border-emerald-200">
              <FileSpreadsheet className="w-3 h-3" />
              DTN Integration
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                connectionMode === 'LIVE_FIS'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionMode === 'LIVE_FIS' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {connectionMode === 'LIVE_FIS'
                ? 'Live FDA FIS Connected (doctrack.fda.gov.ph)'
                : 'Test Mode — Awaiting ICTMD Network Link'}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            DTN Remarks Upload Tool
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
            Upload an Excel file (<code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">.xlsx</code> or{' '}
            <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">.xls</code>) containing 14-digit{' '}
            <strong>Doctrack Numbers (DTNs)</strong> and <strong>Remarks</strong> to update multiple documents at once with automatic{' '}
            <strong className="text-[#056839]">({officeCode} | via FROO Tracker)</strong> attribution.
          </p>

          {connectionMode !== 'LIVE_FIS' && (
            <div className="mt-2 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Initial Testing &amp; Evaluation Mode (Awaiting ICTMD Network Link):</span>{' '}
                You can test the full Excel bulk upload and task DTN remark workflow safely here. Once linked to the FDA Central Office FIS network (<code className="font-mono">doctrack.fda.gov.ph</code>), remarks will write directly to the live FIS database.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Grid: Attribution Configuration + Excel Upload Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5 cols): Remark Attribution & Local Task Sync Settings */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  1. Remark Attribution & Sync Settings
                </h3>
                <p className="text-xs text-slate-500">
                  Every remark written to FDA FIS includes your FROO identity tag
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#056839] border border-emerald-200">
                {officeCode}
              </span>
            </div>

            {/* Live Remark Format Preview Box */}
            <div className="p-3.5 rounded-xl bg-emerald-950 text-white space-y-1.5 border border-emerald-800">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-emerald-300">
                <span>Live FIS Remark Output Preview</span>
                <span>docreceivinglogtbl</span>
              </div>
              <div className="text-xs font-mono leading-relaxed break-words text-emerald-50">
                <span className="text-white font-semibold">For evaluation</span>{' '}
                <span className="text-amber-300 font-bold">
                  — Remarks by: {effectiveAlias} ({officeCode} | via FROO Tracker)
                </span>
              </div>
            </div>

            {/* Optional Custom Alias Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Uploader Name / Alias{' '}
                <span className="text-slate-400 font-normal">
                  (Default: {defaultShortAlias})
                </span>
              </label>
              <input
                type="text"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                placeholder={`Default: ${defaultShortAlias}`}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#056839] focus:bg-white font-medium text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Suffixes (e.g., <code className="font-mono">F. Tabaquin, IV</code>) and{' '}
                <code className="font-mono">({officeCode} | via FROO Tracker)</code> are automatically preserved.
              </p>
            </div>

            {/* Sync Matching FROO Tracker Tasks Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={syncFrooTasks}
                onChange={(e) => setSyncFrooTasks(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#056839] rounded cursor-pointer"
              />
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-slate-800">
                  Also update matching tasks in FROO Tracker
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  If an uploaded 14-digit DTN matches an active task in FROO Tracker, automatically update its remarks and log the progress in its Activity History.
                </div>
              </div>
            </label>
          </div>

          {/* Template & Quick Test Footer */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-[#056839] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Template (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSampleBatchIntoPreview}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
              title="Load 3 sample DTN rows into the preview table"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Load Sample Rows</span>
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Excel File Upload Dropzone & Instructions */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                2. Upload Excel Worksheet (.xlsx / .xls)
              </h3>
              <p className="text-xs text-slate-500">
                Auto-detects columns containing <strong>Doctrack</strong> (or <strong>DTN</strong>) and <strong>Remarks</strong>
              </p>
            </div>
            {selectedFileName && (
              <button
                type="button"
                onClick={handleClearPreview}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear File</span>
              </button>
            )}
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) {
                handleExcelFileSelected(droppedFile);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[190px] border-2 border-dashed border-emerald-300/90 hover:border-[#056839] bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleExcelFileSelected(file);
                }
              }}
            />

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#056839] flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Upload className="w-6 h-6" />
            </div>

            {selectedFileName ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#056839]" />
                  <span>{selectedFileName}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {parsedRows.length} rows parsed ({validRowsCount} valid, {invalidRowsCount} invalid) • Click to choose a different file
                </p>
                {detectedColumns && (
                  <div className="inline-flex items-center gap-2 text-[11px] font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 mt-1">
                    <span>DTN Col: "{detectedColumns.dtnCol}"</span>
                    <span>•</span>
                    <span>Remarks Col: "{detectedColumns.remarksCol}"</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  Click to browse or drag & drop your Excel file here
                </p>
                <p className="text-xs text-slate-500">
                  Supports <strong className="text-slate-700">.xlsx</strong> and <strong className="text-slate-700">.xls</strong> files • Expected DTN format: <strong>14 numeric digits</strong>
                </p>
              </div>
            )}
          </div>

          {/* Expected Excel Format Mini-Table */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#056839]" />
                <span>Expected Excel Column Format</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Column headers can be <code className="font-mono">Doctrack Number</code> (or <code className="font-mono">DTN</code>) and <code className="font-mono">Remarks</code>.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-[11px] text-slate-700 shrink-0">
              <div className="text-slate-400 font-bold border-b border-slate-100 pb-0.5 mb-0.5">
                Doctrack Number &nbsp;|&nbsp; Remarks
              </div>
              <div>20261026001234 &nbsp;|&nbsp; For evaluation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Parse / Upload Error Alert */}
      {parseError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3 text-xs">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="font-bold text-sm">Excel Validation Notice</div>
            <p className="leading-relaxed">{parseError}</p>
          </div>
        </div>
      )}

      {/* =================================================================
          UPLOAD EXECUTION RESULTS PANEL (Shown after submission)
         ================================================================= */}
      {uploadResult && (
        <div className="bg-white rounded-2xl border-2 border-emerald-600/30 shadow-md overflow-hidden">
          <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-emerald-950 via-[#056839] to-emerald-950 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
              <div>
                <h3 className="text-sm sm:text-base font-bold">
                  Bulk Upload Execution Summary — {uploadResult.fileName}
                </h3>
                <p className="text-xs text-emerald-200">{uploadResult.message}</p>
              </div>
            </div>

            {uploadResult.failed_records.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  handleDownloadFailedCsv(uploadResult.failed_records, uploadResult.fileName)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-emerald-950 hover:bg-amber-300 transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Failed Records (CSV)</span>
              </button>
            )}
          </div>

          {/* KPI Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/70">
            <div className="p-3.5 text-center">
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Rows</div>
              <div className="text-xl font-extrabold text-slate-800 tabular-nums mt-0.5">
                {uploadResult.stats.total}
              </div>
            </div>
            <div className="p-3.5 text-center">
              <div className="text-[11px] font-bold uppercase text-slate-400">Valid Format</div>
              <div className="text-xl font-extrabold text-blue-700 tabular-nums mt-0.5">
                {uploadResult.stats.valid}
              </div>
            </div>
            <div className="p-3.5 text-center">
              <div className="text-[11px] font-bold uppercase text-emerald-700">
                Inserted to FIS
              </div>
              <div className="text-xl font-extrabold text-[#056839] tabular-nums mt-0.5">
                {uploadResult.stats.inserted}
              </div>
            </div>
            <div className="p-3.5 text-center">
              <div className="text-[11px] font-bold uppercase text-teal-700">
                Synced FROO Tasks
              </div>
              <div className="text-xl font-extrabold text-teal-700 tabular-nums mt-0.5">
                {uploadResult.stats.syncedTasks}
              </div>
            </div>
            <div className="p-3.5 text-center col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold uppercase text-rose-600">Failed Rows</div>
              <div className="text-xl font-extrabold text-rose-600 tabular-nums mt-0.5">
                {uploadResult.stats.failed}
              </div>
            </div>
          </div>

          {/* Inserted & Failed Details List */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[380px] overflow-y-auto">
            {uploadResult.failed_records.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Failed Records ({uploadResult.failed_records.length})</span>
                </div>
                <div className="border border-rose-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-rose-50 text-rose-900 font-bold border-b border-rose-200">
                      <tr>
                        <th className="py-2 px-3 w-20">Row #</th>
                        <th className="py-2 px-3 w-44">Doctrack Number</th>
                        <th className="py-2 px-3">Raw Remarks</th>
                        <th className="py-2 px-3">Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white">
                      {uploadResult.failed_records.map((f, i) => (
                        <tr key={`fail-${i}`}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-600">
                            #{f.rowNum}
                          </td>
                          <td className="py-2 px-3 font-mono text-rose-700 font-semibold">
                            {f.rsn || '(Empty)'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{f.rawRemarks || '—'}</td>
                          <td className="py-2 px-3 font-semibold text-rose-700">{f.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {uploadResult.inserted_records.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#056839] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Processed DTN Remark Records ({uploadResult.inserted_records.length})
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-16">Row #</th>
                        <th className="py-2 px-3 w-40">DTN (RSN)</th>
                        <th className="py-2 px-3 w-28">FIS docrecID</th>
                        <th className="py-2 px-3">Inserted Remark (with FROO Attribution)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {uploadResult.inserted_records.map((ins, idx) => (
                        <tr key={`ins-${idx}`} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-500">#{ins.rowNum}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {ins.rsn}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {ins.docrecID}
                          </td>
                          <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                            {ins.finalRemarks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================
          PRE-SUBMISSION REVIEW & VALIDATION TABLE
         ================================================================= */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                3. Pre-Submission Review & Validation ({parsedRows.length} rows)
              </h3>
              <p className="text-xs text-slate-500">
                Verify 14-digit DTNs and final attributed remarks before submitting
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter pills */}
              <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                    previewFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('VALID')}
                  className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                    previewFilter === 'VALID'
                      ? 'bg-white text-[#056839] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Valid ({validRowsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('INVALID')}
                  className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                    previewFilter === 'INVALID'
                      ? 'bg-white text-rose-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Errors ({invalidRowsCount})
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={isSubmittingUpload || validRowsCount === 0}
                onClick={handleSubmitBulkUpload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#056839] hover:bg-[#04522d] disabled:opacity-50 text-white shadow-xs transition cursor-pointer"
              >
                {isSubmittingUpload ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading Remarks...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      Submit {validRowsCount} Valid Record{validRowsCount === 1 ? '' : 's'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3.5 w-16">Row #</th>
                  <th className="py-2.5 px-3.5 w-44">Doctrack Number (DTN)</th>
                  <th className="py-2.5 px-3.5">Final Remark to Insert in FIS</th>
                  <th className="py-2.5 px-3.5 w-44">FROO Task Match</th>
                  <th className="py-2.5 px-3.5 w-44">Validation Status</th>
                  <th className="py-2.5 px-3.5 w-14 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPreviewRows.map((row) => {
                  const matchedTask = frooTaskByDtnMap.get(row.rsn);
                  return (
                    <tr
                      key={row.rowNum}
                      className={
                        row.isValid ? 'hover:bg-slate-50/90' : 'bg-rose-50/40 hover:bg-rose-50/70'
                      }
                    >
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-500">
                        #{row.rowNum}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                        {row.rsn || <span className="text-rose-500 italic">Missing</span>}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="text-slate-900 font-medium">{row.remarks || '—'}</div>
                        {row.isValid && (
                          <div className="text-[11px] font-mono text-[#056839] mt-0.5">
                            {formatPreviewRemark(row.remarks)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {matchedTask ? (
                          <button
                            type="button"
                            onClick={() => onOpenTaskDetails(matchedTask)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[#056839] border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100 transition cursor-pointer max-w-[170px]"
                            title={`Linked FROO Task: ${matchedTask.taskTitle}`}
                          >
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{matchedTask.taskTitle}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">External DTN</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            {row.validationError}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemovePreviewRow(row.rowNum)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Remove row from batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
