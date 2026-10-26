import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export async function exportDispatchSlipToPdf(element: HTMLElement, ctrlNo: string): Promise<void> {
  const safeName = ctrlNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Dispatch_Slip_${safeName}.pdf`;

  // html-to-image uses native browser SVG foreignObject rendering, which fully
  // supports Tailwind v4 modern CSS color functions (oklch, lab, color-mix) without error
  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2.5,
    backgroundColor: '#ffffff',
    cacheBust: true,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename);
}

export function printDispatchSlip(): void {
  window.print();
}
