import { Task } from '../types/task';

export function getRegionCodePrefix(region: string): string {
  const clean = (region || '').trim();
  if (/^ncr$/i.test(clean) || /region\s*ncr/i.test(clean)) return 'RFONCR';
  if (/car/i.test(clean)) return 'RFOCAR';
  if (/^1$|^i$|region\s*1\b|region\s*i\b/i.test(clean)) return 'RFOI';
  if (/^2$|^ii$|region\s*2\b|region\s*ii\b/i.test(clean)) return 'RFOII';
  if (/^3$|^iii$|region\s*3\b|region\s*iii\b/i.test(clean)) return 'RFOIII';
  if (/4a|iv-a|calabarzon/i.test(clean)) return 'RFOIVA';
  if (/4b|iv-b|mimaropa/i.test(clean)) return 'RFOIVB';
  if (/^5$|^v$|region\s*5\b|region\s*v\b/i.test(clean)) return 'RFOV';
  if (/^6$|^vi$|region\s*6\b|region\s*vi\b/i.test(clean)) return 'RFOVI';
  if (/^7$|^vii$|region\s*7\b|region\s*vii\b/i.test(clean)) return 'RFOVII';
  if (/^8$|^viii$|region\s*8\b|region\s*viii\b/i.test(clean)) return 'RFOVIII';
  if (/^9$|^ix$|region\s*9\b|region\s*ix\b/i.test(clean)) return 'RFOIX';
  if (/^10$|^x$|region\s*10\b|region\s*x\b/i.test(clean)) return 'RFOX';
  if (/^11$|^xi$|region\s*11\b|region\s*xi\b/i.test(clean)) return 'RFOXI';
  if (/12|xii|barmm|soccsksargen/i.test(clean)) return 'RFOXII';
  if (/13|xiii|caraga/i.test(clean)) return 'RFOXIII';
  if (/oddg|central/i.test(clean)) return 'ODDG-FROO';

  // Default clean alphanumeric prefix
  const simplified = clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return simplified ? `RFO${simplified}` : 'RFONCR';
}

export function extractYearFromDate(dateStr?: string): number {
  if (!dateStr) return new Date().getFullYear();
  const yearMatch = dateStr.match(/\b(20\d\d)\b/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getFullYear()) && d.getFullYear() > 2000) {
    return d.getFullYear();
  }
  return new Date().getFullYear();
}

/**
 * Auto-generates official FDA Dispatch Slip CTRL No. based on:
 * - Region: RFOX, RFONCR, RFOIII, RFOIVA, etc.
 * - Year: 2026, etc.
 * - Sequence: Current dispatch count so far for that region & year + 1
 */
export function generateDispatchControlNumber(
  region: string,
  dispatchDateStr?: string,
  allTasks: Task[] = []
): { ctrlNo: string; sequenceNumber: number; prefix: string; year: number } {
  const prefix = getRegionCodePrefix(region);
  const year = extractYearFromDate(dispatchDateStr);

  let maxSequence = 0;
  let countForRegionYear = 0;

  allTasks.forEach((t) => {
    (t.dispatchSlips || []).forEach((slip) => {
      const ctrl = (slip.ctrlNo || '').trim();
      const escapedPrefix = prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`^${escapedPrefix}-${year}-(\\d+)$`, 'i');
      const match = ctrl.match(regex);
      if (match) {
        countForRegionYear++;
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSequence) {
          maxSequence = seq;
        }
      }
    });
  });

  const nextSeqNumber = maxSequence > 0 ? maxSequence + 1 : countForRegionYear + 1;
  const formattedSeq = String(nextSeqNumber).padStart(3, '0');

  return {
    ctrlNo: `${prefix}-${year}-${formattedSeq}`,
    sequenceNumber: nextSeqNumber,
    prefix,
    year,
  };
}
