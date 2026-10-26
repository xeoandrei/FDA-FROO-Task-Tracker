import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportDispatchSlipToPdf(element: HTMLElement, ctrlNo: string): Promise<void> {
  const safeName = ctrlNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Dispatch_Slip_${safeName}.pdf`;

  // Capture canvas with 2.5x scaling for crisp, official printing
  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename);
}

export function printDispatchSlip(): void {
  window.print();
}
