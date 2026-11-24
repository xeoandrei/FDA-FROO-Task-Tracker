export type FisConnectionMode = 'LIVE_FIS' | 'LOCAL_TEST';

export interface FisConnectionInfo {
  connected: boolean;
  mode: FisConnectionMode;
  database: string;
  hostSummary: string;
  message: string;
}

export interface SampleFisDtn {
  rsn: string;
  subject: string;
  source: 'FROO_TASK' | 'FIS_SAMPLE';
}

export interface DoctrackStatusResponse {
  connection: FisConnectionInfo;
  defaultAlias: string;
  officeCode: string;
  attributionSuffixPreview: string;
  sampleRemarkPreview: string;
  sampleDtns: SampleFisDtn[];
}

export interface ParsedExcelRow {
  rowNum: number;
  rsn: string;
  remarks: string;
  isValid: boolean;
  validationError?: string;
}

export interface DoctrackInsertedRecord {
  rowNum: number;
  rsn: string;
  docrecID: number;
  rawRemarks: string;
  finalRemarks: string;
  logdate: string;
  syncedTaskIds: string[];
}

export interface DoctrackFailedRecord {
  rowNum: number;
  rsn: string;
  rawRemarks: string;
  reason: string;
}

export interface DoctrackBulkUploadResponse {
  success: boolean;
  mode: FisConnectionMode;
  historyId: string;
  fileName: string;
  message: string;
  attributionFormatUsed: string;
  stats: {
    total: number;
    valid: number;
    inserted: number;
    syncedTasks: number;
    failed: number;
  };
  all_failed: boolean;
  inserted_records: DoctrackInsertedRecord[];
  failed_records: DoctrackFailedRecord[];
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

export interface MatchingFrooTaskSummary {
  id: string;
  dtn: string;
  taskTitle: string;
  status: string;
  region: string;
  assignedOffice: string;
  remarks?: string | null;
}

export interface DoctrackDtnSearchResponse {
  dtn: string;
  foundInFis: boolean;
  mode: FisConnectionMode;
  fisDocument: FisDocumentRecord | null;
  fisLogs: FisLogEntry[];
  matchingFrooTasks: MatchingFrooTaskSummary[];
}

export interface DoctrackUploadHistoryBatch {
  id: string;
  fileName: string;
  uploadedByUserId?: string;
  uploadedByName: string;
  uploadedByOffice: string;
  aliasUsed: string;
  connectionMode: FisConnectionMode;
  totalCount: number;
  validCount: number;
  insertedCount: number;
  syncedTaskCount: number;
  failedCount: number;
  failedRecords: DoctrackFailedRecord[];
  uploadedAt: string;
}

export interface DoctrackUploadHistoryRecordItem {
  id: number;
  historyId: string;
  rowNum: number;
  rsn: string;
  rawRemarks: string;
  finalRemarks: string;
  docrecId?: number | null;
  matchedTaskId?: string | null;
  status: 'INSERTED' | 'FAILED';
  errorReason?: string | null;
  createdAt: string;
}

export interface DoctrackUploadHistoryDetailResponse {
  batch: DoctrackUploadHistoryBatch;
  records: DoctrackUploadHistoryRecordItem[];
}

export type WorkspaceModuleType = 'TASKS' | 'FIS_DOCTRACK' | 'SYSTEM_CONFIG';
export type DoctrackSubTabType = 'BULK_UPLOAD' | 'DTN_SEARCH' | 'HISTORY';
