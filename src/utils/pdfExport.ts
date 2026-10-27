import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * Exports one or more dispatch slip sheets to an A4 PDF document.
 * Supports single-page and multi-page documents while maintaining exact A4 proportions.
 */
export async function exportDispatchSlipToPdf(element: HTMLElement, ctrlNo: string): Promise<void> {
  const safeName = ctrlNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Dispatch_Slip_${safeName}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Look for discrete page sheets marked with .dispatch-slip-page
  const pageElements = Array.from(element.querySelectorAll<HTMLElement>('.dispatch-slip-page'));
  const targets = pageElements.length > 0 ? pageElements : [element];

  for (let i = 0; i < targets.length; i++) {
    const pageEl = targets[i];

    // html-to-image with skipFonts: true avoids cross-origin CSS font issues and renders crisply
    const dataUrl = await toPng(pageEl, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: false,
      skipFonts: true,
    });

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  }

  pdf.save(filename);
}

export function printDispatchSlip(): void {
  window.print();
}
