import React, { useRef, useState } from 'react';
import { X, Download, Printer, CheckSquare, Square, Edit, ShieldCheck, Check } from 'lucide-react';
import { DispatchSlip } from '../types/task';
import { exportDispatchSlipToPdf, printDispatchSlip } from '../utils/pdfExport';

interface DispatchSlipPreviewModalProps {
  slip: DispatchSlip | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (slip: DispatchSlip) => void;
}

export const DispatchSlipPreviewModal: React.FC<DispatchSlipPreviewModalProps> = ({
  slip,
  isOpen,
  onClose,
  onEdit,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen || !slip) return null;

  const handleExportPdf = async () => {
    if (!printRef.current) return;
    try {
      setIsExporting(true);
      await exportDispatchSlipToPdf(printRef.current, slip.ctrlNo);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Failed to generate PDF. You can also click "Print / Native PDF" as an alternative.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    printDispatchSlip();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* Modal Top Bar (hidden on print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-[#056839] text-white font-bold text-xs px-2.5 py-0.5 rounded border border-emerald-500/50">
              CTRL: {slip.ctrlNo}
            </span>
            <h3 className="font-bold text-sm sm:text-base text-slate-100">
              FDA Official Dispatch Slip Preview
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(slip);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs transition border border-slate-700 cursor-pointer"
                title="Edit Dispatch Slip details"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs transition border border-slate-700 cursor-pointer"
              title="Print or Save via Browser PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Print / Native PDF</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 bg-[#056839] hover:bg-[#04522d] text-white font-medium px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Downloaded!</span>
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

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-8 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          
          {/* Printable A4 Sheet matching Dispatch_Sample_9ee4b473.pdf */}
          <div
            ref={printRef}
            id="dispatch-slip-print-container"
            className="w-[794px] min-h-[1123px] bg-white text-slate-900 shadow-xl relative flex flex-col font-serif select-text print:shadow-none print:w-full print:m-0"
            style={{
              backgroundImage: 'url(/assets/fda_dispatch_letterhead.jpg)',
              backgroundSize: '100% 100%',
              backgroundPosition: 'top center',
              backgroundRepeat: 'no-repeat',
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            {/* Inner Content Area positioned inside the official letterhead */}
            <div className="pt-[140px] pb-[100px] px-[68px] flex-1 flex flex-col text-[12.5px] leading-[1.38]">
              
              {/* CTRL No. Row */}
              <div className="font-bold text-[13px] tracking-wide mb-1">
                CTRL No.: <span className="underline decoration-slate-900 underline-offset-3 font-extrabold">{slip.ctrlNo}</span>
              </div>

              {/* Title */}
              <div className="text-center font-bold text-[15px] tracking-wider my-2.5">
                DISPATCH SLIP
              </div>

              {/* Numbered Rules */}
              <div className="space-y-1 text-[11px] leading-tight mb-3 text-justify">
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

              {/* Authorization Paragraph */}
              <p className="mb-3 text-justify leading-relaxed">
                This is to authorize the following Food Drug Regulation Officers (FDRO) of the Food and Drug Administration (FDA) to be dispatched on{' '}
                <span className="underline font-bold decoration-slate-900 underline-offset-3">
                  {slip.dispatchDate}
                </span>
                .
              </p>

              {/* Establishments */}
              <div className="mb-2.5 flex items-start">
                <span className="w-[125px] shrink-0 font-medium">Establishment:</span>
                <div className="flex-1 space-y-0.5">
                  {slip.establishments && slip.establishments.length > 0 ? (
                    slip.establishments.map((est, i) => (
                      <div key={i} className="flex">
                        <span className="w-5 font-bold shrink-0">{i + 1}.</span>
                        <span className="font-bold underline decoration-slate-900 underline-offset-3 uppercase">
                          {est}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="underline font-bold uppercase">—</div>
                  )}
                </div>
              </div>

              {/* Locations */}
              <div className="mb-3 flex items-start">
                <span className="w-[125px] shrink-0 font-medium">Location:</span>
                <div className="flex-1 space-y-1">
                  {slip.locations && slip.locations.length > 0 ? (
                    slip.locations.map((loc, i) => (
                      <div key={i} className="flex text-justify">
                        <span className="w-5 font-bold shrink-0">{i + 1}.</span>
                        <span className="underline decoration-slate-900 underline-offset-3">
                          {loc}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="underline">—</div>
                  )}
                </div>
              </div>

              {/* For the Purpose of */}
              <div className="mb-2">
                <div className="font-medium mb-1">
                  For the purpose of: <span className="text-[11.5px] italic font-normal">(Please check ( ✓ ) appropriate box/es.)</span>
                </div>

                {/* Checkboxes Grid matching PDF sample */}
                <div className="space-y-1.5 pl-6 my-2 text-[12px]">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0">
                        {slip.purposes.inspection && <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />}
                      </div>
                      <span>Inspection</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0">
                        {slip.purposes.postMarketSurveillance && <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />}
                      </div>
                      <span className="font-medium">Post Market Surveillance</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0">
                        {slip.purposes.attendanceToMeeting && <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />}
                      </div>
                      <span>Attendance to Meeting</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0">
                        {slip.purposes.investigation && <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />}
                      </div>
                      <span>Investigation</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-slate-900 flex items-center justify-center shrink-0">
                        {slip.purposes.witnessForDestruction && <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />}
                      </div>
                      <span>Witness for Destruction</span>
                    </div>
                  </div>
                </div>

                <div className="mt-1.5">
                  Others: <span className="underline decoration-slate-900 underline-offset-3 font-semibold">{slip.othersPurpose || 'N/A'}</span>
                </div>

                <div className="mt-1">
                  Time of Arrival: <span className="underline decoration-slate-900 underline-offset-3">{slip.timeOfArrival || '________________________'}</span>
                </div>
              </div>

              {/* Personnel & Vehicle */}
              <div className="space-y-1.5 my-3 pt-2 border-t border-transparent">
                <div>
                  Team Leader: <span className="underline font-bold decoration-slate-900 underline-offset-3 uppercase">{slip.teamLeader}</span>
                </div>

                <div>
                  Team Member/s: <span className="underline decoration-slate-900 underline-offset-3 uppercase font-medium">{slip.teamMembers || 'NONE'}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-0.5">
                  <div>
                    Driver: <span className="underline decoration-slate-900 underline-offset-3 uppercase font-medium">{slip.driver || 'N/A'}</span>
                  </div>
                  <div>
                    Vehicle Plate number: <span className="underline font-bold decoration-slate-900 underline-offset-3 uppercase">{slip.vehiclePlateNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Signatures Block (Retaining Gomel & Atty. Franklin as requested) */}
              <div className="mt-auto pt-4 space-y-6">
                
                {/* Recommended / Requested by */}
                <div>
                  <div className="text-[12px] font-medium mb-5">Recommended/ Requested by:</div>
                  <div className="pl-8 text-center sm:text-left">
                    <div className="font-extrabold text-[12.5px] uppercase tracking-wide text-slate-950">
                      {slip.recommendedBy.name}
                    </div>
                    <div className="text-[11px] text-slate-800 font-medium">
                      {slip.recommendedBy.title}
                    </div>
                  </div>
                </div>

                {/* Approved by */}
                <div>
                  <div className="text-[12px] font-medium mb-5">Approved by:</div>
                  <div className="pl-8 text-center sm:text-left">
                    <div className="font-extrabold text-[12.5px] uppercase tracking-wide text-slate-950">
                      {slip.approvedBy.name}
                    </div>
                    <div className="text-[11px] text-slate-800 font-medium">
                      {slip.approvedBy.title}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>

        {/* Modal Bottom Actions (hidden on print) */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>Letterhead conforms to Food and Drug Administration (FDA) & FROO Standards</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-4 py-1.5 bg-[#056839] text-white rounded-lg font-medium hover:bg-[#04522d] cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Extract to PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
