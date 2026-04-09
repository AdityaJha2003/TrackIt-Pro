import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [45, 212, 191];
};

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

export const generateInvoicePDF = (invoice, companyData) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const brandColor = companyData.brandColor || '#2dd4bf';
  const [r, g, b] = hexToRgb(brandColor);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // ── BACKGROUND ──────────────────────────────────────────────────────
  pdf.setFillColor(13, 13, 15);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // ── BRAND ACCENT HEADER BAND ────────────────────────────────────────
  pdf.setFillColor(r, g, b);
  pdf.rect(0, 0, pageWidth, 2.5, 'F');

  // Subtle glow strip
  pdf.setFillColor(r, g, b, 0.08);
  pdf.rect(0, 2.5, pageWidth, 35, 'F');

  // ── AGENCY NAME ─────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text(companyData.companyName || 'Agency', 14, 22);

  // ── "INVOICE" LABEL ─────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(r, g, b);
  const invoiceLabel = 'INVOICE';
  const labelWidth = pdf.getTextWidth(invoiceLabel);
  pdf.text(invoiceLabel, pageWidth - 14 - labelWidth, 16);

  // Invoice number
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(160, 160, 170);
  const invNum = invoice.invoice_number || 'INV-0001';
  const numWidth = pdf.getTextWidth(invNum);
  pdf.text(invNum, pageWidth - 14 - numWidth, 22);

  // ── DIVIDER ─────────────────────────────────────────────────────────
  pdf.setDrawColor(r, g, b);
  pdf.setLineWidth(0.3);
  pdf.line(14, 38, pageWidth - 14, 38);

  // ── BILL TO / INVOICE META ──────────────────────────────────────────
  const col2 = pageWidth / 2 + 10;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(r, g, b);
  pdf.text('BILL TO', 14, 48);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text(invoice.client_name || '-', 14, 55);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(150, 150, 160);
  if (invoice.client_email) pdf.text(invoice.client_email, 14, 61);
  if (invoice.client_address) {
    const addrLines = pdf.splitTextToSize(invoice.client_address, 80);
    pdf.text(addrLines, 14, 66);
  }

  // Invoice Meta (right column)
  const metaItems = [
    { label: 'Invoice Date', value: invoice.date || '-' },
    { label: 'Due Date', value: invoice.due_date || '-' },
    { label: 'Status', value: (invoice.status || 'draft').toUpperCase() },
  ];
  let metaY = 48;
  metaItems.forEach(({ label, value }) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(r, g, b);
    pdf.text(label.toUpperCase(), col2, metaY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(220, 220, 230);
    pdf.text(value, col2, metaY + 5);
    metaY += 12;
  });

  // ── LINE ITEMS TABLE ────────────────────────────────────────────────
  const lineItems = invoice.line_items || [];
  const tableBody = lineItems.map((item) => [
    item.description || '',
    String(item.qty || 1),
    formatINR(item.rate || 0),
    formatINR((item.qty || 1) * (item.rate || 0)),
  ]);

  autoTable(pdf, {
    startY: 82,
    head: [['DESCRIPTION', 'QTY', 'RATE', 'AMOUNT']],
    body: tableBody,
    theme: 'plain',
    styles: {
      fillColor: [20, 20, 22],
      textColor: [210, 210, 220],
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [r, g, b, 0.15],
      textColor: [r, g, b],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [r, g, b, 0.2],
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: [25, 25, 28] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 38 },
      3: { halign: 'right', cellWidth: 38 },
    },
    margin: { left: 14, right: 14 },
  });

  const tableEndY = pdf.lastAutoTable.finalY + 6;

  // ── TOTALS ──────────────────────────────────────────────────────────
  const totalsX = pageWidth - 70;
  const totalsRight = pageWidth - 14;
  let ty = tableEndY + 6;

  const drawTotalRow = (label, value, bold = false, accent = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(bold ? 10 : 9);
    pdf.setTextColor(accent ? r : 150, accent ? g : 150, accent ? b : 160);
    const lw = pdf.getTextWidth(label);
    pdf.text(label, totalsX, ty);
    pdf.setTextColor(bold ? 255 : 200, bold ? 255 : 200, bold ? 255 : 210);
    const vw = pdf.getTextWidth(value);
    pdf.text(value, totalsRight - vw, ty);
    ty += 7;
  };

  drawTotalRow('Subtotal', formatINR(invoice.subtotal));
  if ((invoice.gst_percent || 0) > 0) {
    drawTotalRow(`GST (${invoice.gst_percent}%)`, formatINR(invoice.gst_amount));
  }
  if ((invoice.tds_percent || 0) > 0) {
    drawTotalRow(`TDS Deduction (${invoice.tds_percent}%)`, `- ${formatINR(invoice.tds_amount)}`);
  }

  // Total divider
  pdf.setDrawColor(r, g, b);
  pdf.setLineWidth(0.3);
  pdf.line(totalsX - 2, ty, totalsRight, ty);
  ty += 5;

  drawTotalRow('TOTAL PAYABLE', formatINR(invoice.total_payable), true, true);

  // ── PAYMENT DETAILS ─────────────────────────────────────────────────
  const paymentDisplay = companyData.paymentDisplay || 'both';
  const payY = Math.max(ty + 12, tableEndY + 50);

  if (paymentDisplay !== 'none') {
    pdf.setFillColor(20, 20, 24);
    pdf.setDrawColor(r, g, b, 0.2);
    pdf.roundedRect(14, payY, pageWidth - 28, paymentDisplay === 'both' ? 42 : 24, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(r, g, b);
    pdf.text('PAYMENT DETAILS', 20, payY + 7);

    let py = payY + 15;
    const payCol2 = 14 + (pageWidth - 28) / 2;

    const drawPayField = (label, value, x, y) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(120, 120, 130);
      pdf.text(label, x, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(220, 220, 230);
      pdf.text(value || '-', x, y + 5);
    };

    if (paymentDisplay === 'bank' || paymentDisplay === 'both') {
      drawPayField('Account Holder', companyData.accountHolderName || '-', 20, py);
      drawPayField('Bank Name', companyData.bankName || '-', payCol2, py);
      py += 12;
      drawPayField('Account Number', companyData.accountNumber || '-', 20, py);
      drawPayField('IFSC Code', companyData.ifsc || '-', payCol2, py);
      py += 14;
    }

    if (paymentDisplay === 'upi' || paymentDisplay === 'both') {
      drawPayField('UPI ID', companyData.upiId || '-', 20, py);
    }
  }

  // ── NOTES ───────────────────────────────────────────────────────────
  if (invoice.notes) {
    const notesY = payY + (paymentDisplay === 'both' ? 50 : paymentDisplay !== 'none' ? 32 : 14);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.setTextColor(120, 120, 130);
    const noteLines = pdf.splitTextToSize(`Note: ${invoice.notes}`, pageWidth - 28);
    pdf.text(noteLines, 14, notesY);
  }

  // ── FOOTER ──────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(70, 70, 80);
  const footerText = `Generated by TrackIt Pro  •  ${companyData.companyName}`;
  const fw = pdf.getTextWidth(footerText);
  pdf.text(footerText, (pageWidth - fw) / 2, pageHeight - 8);

  // Bottom accent line
  pdf.setFillColor(r, g, b);
  pdf.rect(0, pageHeight - 2.5, pageWidth, 2.5, 'F');

  // ── SAVE ─────────────────────────────────────────────────────────
  const fileName = `${invoice.invoice_number || 'invoice'}-${(invoice.client_name || 'client').replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
};
