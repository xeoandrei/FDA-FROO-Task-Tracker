import React, { useRef, useState, useMemo } from 'react';
import { X, Download, Check, Edit, AlertCircle } from 'lucide-react';
import { DispatchSlip, Task } from '../types/task';
import { exportDispatchSlipToPdf } from '../utils/pdfExport';
import { FDA_LETTERHEAD_DATA_URI } from '../data/letterheadBase64';

interface DispatchSlipPreviewModalProps {
  slip: DispatchSlip | null;
  task?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (slip: DispatchSlip) => void;
}

export const DispatchSlipPreviewModal: React.FC<DispatchSlipPreviewModalProps> = ({
  slip,
  task,
  isOpen,
  onClose,
  onEdit,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Consolidate actual task & slip data
  const {
    establishments,
    locations,
    targetDates,
    dispatchDate,
    teamLeader,
    teamMembers,
    driver,
    vehiclePlateNumber,
    purposes,
    othersPurpose,
    timeOfArrival,
    recommendedBy,
    approvedBy,
  } = useMemo(() => {
    if (!slip) {
      return {
        establishments: [] as string[],
        locations: [] as string[],
        targetDates: [] as string[],
        dispatchDate: '',
        teamLeader: '',
        teamMembers: '',
        driver: '',
        vehiclePlateNumber: '',
        purposes: {
          inspection: true,
          postMarketSurveillance: false,
          attendanceToMeeting: false,
          investigation: false,
          witnessForDestruction: false,
        },
        othersPurpose: '',
        timeOfArrival: '',
        recommendedBy: { name: '', title: '' },
        approvedBy: { name: '', title: '' },
      };
    }

    const estList =
      slip.establishments && slip.establishments.length > 0
        ? slip.establishments
        : task?.taskTitle
        ? [task.taskTitle]
        : ['—'];

    const locList =
      slip.locations && slip.locations.length > 0
        ? slip.locations
        : task?.location
        ? [task.location]
        : task?.region
        ? [`Regional Field Office - ${task.region}`]
        : ['—'];

    const resolvedDispatchDate =
      slip.dispatchDate || task?.scheduledDate || task?.dueDate || '________________________';

    const tgtDates =
      slip.targetDates && slip.targetDates.length > 0
        ? slip.targetDates
        : estList.map(() => resolvedDispatchDate);

    return {
      establishments: estList,
      locations: locList,
      targetDates: tgtDates,
      dispatchDate: resolvedDispatchDate,
      teamLeader: slip.teamLeader || task?.assignedTo || 'Authorized FDRO',
      teamMembers: slip.teamMembers || 'NONE',
      driver: slip.driver || 'N/A',
      vehiclePlateNumber: slip.vehiclePlateNumber || 'N/A',
      purposes: slip.purposes || {
        inspection: true,
        postMarketSurveillance: false,
        attendanceToMeeting: false,
        investigation: false,
        witnessForDestruction: false,
      },
      othersPurpose: slip.othersPurpose || (task?.category === 'Others' ? task.originDetails || '' : ''),
      timeOfArrival: slip.timeOfArrival || '________________________',
      recommendedBy: {
        name:
          slip.recommendedBy?.name === 'GOMEL C. GABUNA, LLB, MDM, CESE'
            ? 'JON JOSEPH H. MEDRANO'
            : (slip.recommendedBy?.name ?? ''),
        title:
          slip.recommendedBy?.title === 'Executive Assistant Designate for FROO, Director II, NLC'
            ? 'Executive Assistant III, ODDG-FROO'
            : (slip.recommendedBy?.title ?? ''),
      },
      approvedBy: {
        name: slip.approvedBy?.name ?? '',
        title: slip.approvedBy?.title ?? '',
      },
    };
  }, [slip, task]);

  // Determine pagination: if establishments or locations exceed 3, generate Annex page
  const isMultiPage = establishments.length > 3 || locations.length > 3;
  const page1Establishments = isMultiPage ? establishments.slice(0, 3) : establishments;
  const page1Locations = isMultiPage ? locations.slice(0, 3) : locations;

  if (!isOpen || !slip) return null;

  const handleExportPdf = async () => {
    if (!printRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      await exportDispatchSlipToPdf(printRef.current, slip.ctrlNo);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (e: any) {
      console.error('PDF export failed', e);
      setExportError(e?.message || 'Failed to generate PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between print:hidden gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#056839] text-white font-bold tabular-nums text-xs px-2.5 py-0.5 rounded border border-emerald-500/50">
              CTRL: {slip.ctrlNo}
            </span>
            <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
              <span>FDA Official Dispatch Slip Preview</span>
              {isMultiPage && (
                <span className="text-xs font-normal text-emerald-400">
                  · 2 Pages (Includes Annex A)
                </span>
              )}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(slip);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs transition border border-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                title="Edit Dispatch Slip details"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 bg-[#056839] hover:bg-[#04522d] text-white font-semibold px-4 py-1.5 rounded-lg text-xs shadow-sm transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
                  <span>PDF Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting ? 'Generating PDF...' : 'Extract to PDF'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error notification banner if any */}
        {exportError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{exportError}</span>
            </div>
            <button
              onClick={() => setExportError(null)}
              className="text-amber-800 font-bold hover:underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto bg-slate-300/80 p-4 sm:p-8 flex flex-col items-center gap-8 print:p-0 print:bg-white print:overflow-visible print:gap-0">
          <div
            ref={printRef}
            id="dispatch-slip-print-container"
            className="flex flex-col items-center gap-8 print:gap-0 w-full"
          >
            {/* ======================================================== */}
            {/* PAGE 1: PRIMARY OFFICIAL DISPATCH SLIP                   */}
            {/* ======================================================== */}
            <div
              className="dispatch-slip-page w-[794px] h-[1123px] min-h-[1123px] max-h-[1123px] bg-white text-slate-900 shadow-2xl relative flex flex-col font-serif select-text print:shadow-none print:w-full print:m-0 print:break-after-page overflow-hidden"
              style={{
                fontFamily: '"Times New Roman", Times, Georgia, serif',
                boxSizing: 'border-box',
              }}
            >
              {/* High-Resolution Official FDA Letterhead Background */}
              <img
                src={FDA_LETTERHEAD_DATA_URI}
                alt="FDA Official Letterhead"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none -z-0"
                style={{ width: '100%', height: '100%' }}
              />

              {/* Main Content framed within official letterhead margins */}
              <div className="relative z-10 pt-[130px] pb-[94px] px-[58px] flex-1 flex flex-col text-[15px] leading-[1.4]">
                {/* Top Row: CTRL No. */}
                <div className="flex items-center justify-between font-bold text-[15.5px] tracking-wide mb-1">
                  <div>
                    CTRL No.:{' '}
                    <span className="underline decoration-slate-900 underline-offset-3 font-extrabold text-[16px]">
                      {slip.ctrlNo}
                    </span>
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center font-bold text-[19px] tracking-wider my-2 text-slate-950">
                  DISPATCH SLIP
                </div>

                {/* Numbered Rules Matching Official Template */}
                <div className="space-y-1 text-[13px] leading-[1.35] mb-3.5 text-justify text-slate-800">
                  <p>
                    1. This dispatch slip should be filled out and signed by the Cluster Directors and approved by the Deputy Director General, FROO prior or on the scheduled date of inspection.
                  </p>
                  <p>
                    2. Travels of the Supervisors, Division Chiefs and the Cluster Directors will be approved by the Deputy Director General, FROO.
                  </p>
                  <p>
                    3. Attach itinerary, invitation to meeting or other supporting documents as needed.
                  </p>
                </div>

                {/* Authorization Statement with Combined Dispatch Date */}
                <p className="mb-3 text-justify leading-[1.42]">
                  This is to authorize the following Food Drug Regulation Officers (FDRO) of the Food and Drug Administration (FDA) to be dispatched on{' '}
                  <span className="underline font-bold decoration-slate-900 underline-offset-3">
                    {dispatchDate}
                  </span>
                  .
                </p>

                {/* Establishments Section */}
                <div className="mb-2.5 flex items-start">
                  <span className="w-[138px] shrink-0 font-semibold">Establishment:</span>
                  <div className="flex-1 space-y-0.5">
                    {page1Establishments.map((est, i) => (
                      <div key={i} className="flex">
                        <span className="w-6 font-bold shrink-0">{i + 1}.</span>
                        <span className="font-bold underline decoration-slate-900 underline-offset-3 uppercase">
                          {est}
                        </span>
                      </div>
                    ))}
                    {isMultiPage && (
                      <div className="text-[12.5px] font-sans font-medium text-emerald-800 italic pt-0.5">
                        [+{establishments.length - 3} additional establishment(s) itemized on Annex A (Page 2)]
                      </div>
                    )}
                  </div>
                </div>

                {/* Locations Section */}
                <div className="mb-3 flex items-start">
                  <span className="w-[138px] shrink-0 font-semibold">Location:</span>
                  <div className="flex-1 space-y-0.5">
                    {page1Locations.map((loc, i) => (
                      <div key={i} className="flex text-justify">
                        <span className="w-6 font-bold shrink-0">{i + 1}.</span>
                        <span className="underline decoration-slate-900 underline-offset-3">
                          {loc}
                        </span>
                      </div>
                    ))}
                    {isMultiPage && (
                      <div className="text-[12.5px] font-sans font-medium text-emerald-800 italic pt-0.5">
                        [Complete site itinerary detailed on Annex A (Page 2)]
                      </div>
                    )}
                  </div>
                </div>

                {/* For the Purpose of Checkbox Matrix */}
                <div className="mb-2.5">
                  <div className="font-semibold mb-1.5">
                    For the purpose of:{' '}
                    <span className="text-[13.5px] italic font-normal">
                      (Please check ( ✓ ) appropriate box/es.)
                    </span>
                  </div>

                  <div className="space-y-2 pl-4 my-2 text-[14px]">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0 bg-white">
                          {purposes.inspection && (
                            <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />
                          )}
                        </div>
                        <span>Inspection</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0 bg-white">
                          {purposes.postMarketSurveillance && (
                            <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />
                          )}
                        </div>
                        <span className="font-medium">Post Market Surveillance</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0 bg-white">
                          {purposes.attendanceToMeeting && (
                            <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />
                          )}
                        </div>
                        <span>Attendance to Meeting</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0 bg-white">
                          {purposes.investigation && (
                            <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />
                          )}
                        </div>
                        <span>Investigation</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0 bg-white">
                          {purposes.witnessForDestruction && (
                            <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />
                          )}
                        </div>
                        <span>Witness for Destruction</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-1.5">
                    Others:{' '}
                    <span className="underline decoration-slate-900 underline-offset-3 font-semibold">
                      {othersPurpose || 'N/A'}
                    </span>
                  </div>

                  <div className="mt-1.5">
                    Time of Arrival:{' '}
                    <span className="underline decoration-slate-900 underline-offset-3">
                      {timeOfArrival}
                    </span>
                  </div>
                </div>

                {/* Personnel & Vehicle Assignment Block */}
                <div className="space-y-2 my-2.5 pt-2 border-t border-slate-200">
                  <div>
                    Team Leader:{' '}
                    <span className="underline font-bold decoration-slate-900 underline-offset-3 uppercase">
                      {teamLeader}
                    </span>
                  </div>

                  <div>
                    Team Member/s:{' '}
                    <span className="underline decoration-slate-900 underline-offset-3 uppercase font-medium">
                      {teamMembers}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-0.5">
                    <div>
                      Driver:{' '}
                      <span className="underline decoration-slate-900 underline-offset-3 uppercase font-medium">
                        {driver}
                      </span>
                    </div>
                    <div>
                      Vehicle Plate number:{' '}
                      <span className="underline font-bold decoration-slate-900 underline-offset-3 uppercase">
                        {vehiclePlateNumber}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signatures Block Pinned at the Bottom Above the Letterhead Footer */}
                <div className="mt-auto pt-3 space-y-5">
                  {/* Recommended / Requested by */}
                  <div>
                    <div className="text-[14.5px] font-medium mb-4">Recommended/ Requested by:</div>
                    <div className="pl-6">
                      <div className="font-extrabold text-[15.5px] uppercase tracking-wide text-slate-950">
                        {recommendedBy.name}
                      </div>
                      <div className="text-[13.5px] text-slate-800 font-medium">
                        {recommendedBy.title}
                      </div>
                    </div>
                  </div>

                  {/* Approved by */}
                  <div>
                    <div className="text-[14.5px] font-medium mb-4 flex items-center justify-between">
                      <span>Approved by:</span>
                      {slip.status === 'Approved' && (
                        <span className="text-[11px] font-sans font-bold text-emerald-800 border border-emerald-600 px-2 py-0.5 rounded uppercase tracking-wider">
                          Official FROO Approval Recorded
                        </span>
                      )}
                    </div>
                    <div className="pl-6">
                      <div className="font-extrabold text-[15.5px] uppercase tracking-wide text-slate-950">
                        {approvedBy.name}
                      </div>
                      <div className="text-[13.5px] text-slate-800 font-medium">
                        {approvedBy.title}
                      </div>
                    </div>
                  </div>

                  {/* Page 1 indicator */}
                  {isMultiPage && (
                    <div className="text-right text-[11.5px] font-sans text-slate-400 pt-1">
                      Page 1 of 2
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* PAGE 2: ANNEX A (ITEMIZED SCHEDULE IF MULTI-PAGE)       */}
            {/* ======================================================== */}
            {isMultiPage && (
              <div
                className="dispatch-slip-page w-[794px] h-[1123px] min-h-[1123px] max-h-[1123px] bg-white text-slate-900 shadow-2xl relative flex flex-col font-serif select-text print:shadow-none print:w-full print:m-0 print:break-before-page overflow-hidden"
                style={{
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                  boxSizing: 'border-box',
                }}
              >
                {/* Official FDA Letterhead Background Embedded on Page 2 */}
                <img
                  src={FDA_LETTERHEAD_DATA_URI}
                  alt="FDA Official Letterhead"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none -z-0"
                  style={{ width: '100%', height: '100%' }}
                />

                {/* Content Area framed within official letterhead margins */}
                <div className="relative z-10 pt-[130px] pb-[94px] px-[58px] flex-1 flex flex-col text-[14.5px] leading-[1.4]">
                  {/* Header Row */}
                  <div className="flex items-center justify-between font-bold text-[15.5px] tracking-wide mb-1">
                    <div>
                      CTRL No.:{' '}
                      <span className="underline decoration-slate-900 underline-offset-3 font-extrabold">
                        {slip.ctrlNo} - ANNEX A
                      </span>
                    </div>
                  </div>

                  {/* Annex Title */}
                  <div className="text-center font-bold text-[18px] tracking-wider my-2 text-slate-950">
                    DISPATCH SLIP — ANNEX A
                  </div>
                  <div className="text-center text-[13.5px] font-sans uppercase font-semibold text-slate-700 tracking-wider mb-3">
                    Schedule of Establishments & Inspection Sites
                  </div>

                  {/* Reference Note */}
                  <p className="text-[14px] text-justify leading-relaxed mb-3 text-slate-800">
                    This Annex forms an integral part of Official Dispatch Slip{' '}
                    <strong className="underline">{slip.ctrlNo}</strong> authorizing the deployment of{' '}
                    <strong className="uppercase">{teamLeader}</strong> and team on{' '}
                    <strong>{dispatchDate}</strong>.
                  </p>

                  {/* Regulatory Schedule Table with Per-Target Date Column */}
                  <div className="border border-slate-900 overflow-hidden mb-4">
                    <table className="w-full text-left text-[13.5px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-900 text-slate-950 font-bold">
                          <th className="py-2 px-2 border-r border-slate-900 w-9 text-center">No.</th>
                          <th className="py-2 px-2.5 border-r border-slate-900 w-[32%]">Establishment / Entity</th>
                          <th className="py-2 px-2.5 border-r border-slate-900">Physical Location / Address</th>
                          <th className="py-2 px-2.5 border-r border-slate-900 w-32 text-center">Targeted Date</th>
                          <th className="py-2 px-2 w-24 text-center">Target Scope</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {establishments.map((est, index) => {
                          const loc = locations[index] || locations[0] || '—';
                          const tgtDate = targetDates[index] || dispatchDate || '—';
                          return (
                            <tr key={index} className={index % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                              <td className="py-2 px-2 border-r border-slate-900 font-bold text-center tabular-nums">
                                {index + 1}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-900 font-bold uppercase">
                                {est}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-900 text-slate-800 leading-snug">
                                {loc}
                              </td>
                              <td className="py-2 px-2.5 border-r border-slate-900 text-center text-[12.5px] font-semibold text-slate-900 tabular-nums">
                                {tgtDate}
                              </td>
                              <td className="py-2 px-2 text-center text-[12px] text-slate-700 font-sans">
                                {purposes.inspection
                                  ? 'Inspection'
                                  : purposes.postMarketSurveillance
                                  ? 'PMS'
                                  : purposes.investigation
                                  ? 'Investigation'
                                  : 'Field Audit'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures on Annex Sheet (Field Compliance Notes removed) */}
                  <div className="mt-auto pt-3 border-t border-slate-200 grid grid-cols-2 gap-8">
                    <div>
                      <div className="text-[14px] font-medium mb-4">Conforme / Team Leader:</div>
                      <div className="font-bold text-[15px] uppercase text-slate-950">{teamLeader}</div>
                      <div className="text-[13px] text-slate-700">Food Drug Regulation Officer (FDRO)</div>
                    </div>

                    <div>
                      <div className="text-[14px] font-medium mb-4">Certified Correct / Recommending:</div>
                      <div className="font-bold text-[15px] uppercase text-slate-950">{recommendedBy.name}</div>
                      <div className="text-[13px] text-slate-700">{recommendedBy.title}</div>
                    </div>
                  </div>

                  {/* Page 2 indicator */}
                  <div className="text-right text-[11.5px] font-sans text-slate-400 pt-2">
                    Page 2 of 2
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Status & Actions */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>Official Letterhead conforming to FDA Philippines & FROO Standards</span>
            {isMultiPage && <span className="font-semibold text-slate-700">· 2 Pages formatted for A4</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-4 py-1.5 bg-[#056839] text-white rounded-lg font-semibold hover:bg-[#04522d] cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition whitespace-nowrap shrink-0"
            >
              {exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting ? 'Exporting...' : 'Extract to PDF'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
