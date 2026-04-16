import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [45, 212, 191];
};

const formatINR = (amount) => {
  // Use "INR" text instead of symbol to avoid font encoding issues in jsPDF
  const value = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return `INR ${value}`;
};

export const generateInvoicePDF = (invoice, companyData) => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const brandColor = companyData.brandColor || '#2dd4bf';
  const [r, g, b] = hexToRgb(brandColor);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 14;
  const secondaryColor = [100, 100, 110];
  const primaryTextColor = [30, 30, 35];

  // ── BACKGROUND (White for professional print) ────────────────────────
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // ── BRAND TOP BAR ───────────────────────────────────────────────────
  pdf.setFillColor(r, g, b);
  pdf.rect(0, 0, pageWidth, 4, 'F');

  // ── HEADER SECTION ─────────────────────────────────────────────────
  // Agency Name (Left)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(primaryTextColor[0], primaryTextColor[1], primaryTextColor[2]);
  pdf.text(companyData.companyName || 'Agency', margin, 25);

  // "INVOICE" label (Right)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(r, g, b);
  const invoiceLabel = 'INVOICE';
  const labelWidth = pdf.getTextWidth(invoiceLabel);
  pdf.text(invoiceLabel, pageWidth - margin - labelWidth, 20);

  // Invoice number (Right)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(primaryTextColor[0], primaryTextColor[1], primaryTextColor[2]);
  const invNum = invoice.invoice_number || 'INV-0001';
  const numWidth = pdf.getTextWidth(invNum);
  pdf.text(invNum, pageWidth - margin - numWidth, 27);

  // ── DIVIDER ─────────────────────────────────────────────────────────
  pdf.setDrawColor(240, 240, 245);
  pdf.setLineWidth(0.5);
  pdf.line(margin, 35, pageWidth - margin, 35);

  // ── INFO SECTION ───────────────────────────────────────────────────
  const infoY = 48;
  const col2 = pageWidth / 2 + 10;

  // BILL TO
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  pdf.text('BILL TO', margin, infoY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(primaryTextColor[0], primaryTextColor[1], primaryTextColor[2]);
  pdf.text(invoice.client_name || '-', margin, infoY + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  let clientDetailsY = infoY + 13;
  if (invoice.client_email) {
    pdf.text(invoice.client_email, margin, clientDetailsY);
    clientDetailsY += 5;
  }
  if (invoice.client_address) {
    const addrLines = pdf.splitTextToSize(invoice.client_address, 70);
    pdf.text(addrLines, margin, clientDetailsY);
  }

  // INVOICE META
  const metaItems = [
    { label: 'Date Issued', value: invoice.date || '-' },
    { label: 'Payment Due', value: invoice.due_date || '-' },
    { label: 'Status', value: (invoice.status || 'draft').toUpperCase() },
  ];

  let metaY = infoY;
  metaItems.forEach(({ label, value }) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdf.text(label.toUpperCase(), col2, metaY);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(primaryTextColor[0], primaryTextColor[1], primaryTextColor[2]);
    if (label === 'Status') {
      pdf.setTextColor(r, g, b); // Accent the status
    }
    pdf.text(value, col2, metaY + 6);
    metaY += 14;
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
    startY: 95,
    head: [['Description', 'Qty', 'Unit Rate', 'Amount']],
    body: tableBody,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: [50, 50, 50],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [r, g, b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: margin, right: margin },
  });

  const tableEndY = pdf.lastAutoTable.finalY + 10;

  // ── TOTALS ──────────────────────────────────────────────────────────
  const totalsX = pageWidth - margin - 80;
  const totalsRight = pageWidth - margin;
  let ty = tableEndY;

  const drawTotalRow = (label, value, isBold = false, isTotal = false) => {
    // Draw label
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(isTotal ? 11 : 9);
    pdf.setTextColor(isBold ? primaryTextColor[0] : secondaryColor[0], isBold ? primaryTextColor[1] : secondaryColor[1], isBold ? primaryTextColor[2] : secondaryColor[2]);
    pdf.text(label, totalsX, ty);

    // Draw value (right-aligned)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(isTotal ? 11 : 9);
    if (isTotal) {
      pdf.setTextColor(r, g, b);
    } else {
      pdf.setTextColor(primaryTextColor[0], primaryTextColor[1], primaryTextColor[2]);
    }
    const vw = pdf.getTextWidth(value);
    pdf.text(value, totalsRight - vw, ty);
    ty += 9;
  };

  drawTotalRow('Subtotal', formatINR(invoice.subtotal));
  if ((invoice.gst_percent || 0) > 0) {
    drawTotalRow(`Tax (GST ${invoice.gst_percent}%)`, formatINR(invoice.gst_amount));
  }
  if ((invoice.tds_percent || 0) > 0) {
    drawTotalRow(`TDS Deduction (${invoice.tds_percent}%)`, `- ${formatINR(invoice.tds_amount)}`);
  }

  ty += 2;
  pdf.setDrawColor(240, 240, 245);
  pdf.line(totalsX, ty - 5, totalsRight, ty - 5);
  
  drawTotalRow('Total Amount Payable', formatINR(invoice.total_payable), true, true);

  // ── PAYMENT DETAILS ─────────────────────────────────────────────────
  const paymentDisplay = companyData.paymentDisplay || 'both';
  let payY = Math.max(ty + 20, tableEndY + 50);

  if (paymentDisplay !== 'none') {
    // Background box for payment details
    pdf.setFillColor(252, 253, 255);
    pdf.setDrawColor(230, 235, 245);
    pdf.roundedRect(margin, payY, pageWidth - margin * 2, paymentDisplay === 'both' ? 45 : 28, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(r, g, b);
    pdf.text('PAYMENT INFORMATION', margin + 6, payY + 8);

    let py = payY + 16;
    const payCol2 = margin + (pageWidth - margin * 2) / 2;

    const drawPayField = (label, value, x, y) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      pdf.text(label, x, y);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(primaryTextColor[0], primaryTextColor[1], primaryTextColor[2]);
      pdf.text(String(value || '-'), x, y + 5);
    };

    if (paymentDisplay === 'bank' || paymentDisplay === 'both') {
      drawPayField('Account Holder', companyData.accountHolderName, margin + 6, py);
      drawPayField('Bank Name', companyData.bankName, payCol2, py);
      py += 14;
      drawPayField('Account Number', companyData.accountNumber, margin + 6, py);
      drawPayField('IFSC Code', companyData.ifsc, payCol2, py);
      py += 14;
    }

    if (paymentDisplay === 'upi' || paymentDisplay === 'both') {
      drawPayField('UPI ID', companyData.upiId, margin + 6, py);
    }
  }

  // ── FOOTER / NOTES ──────────────────────────────────────────────────
  if (invoice.notes) {
    let notesY;
    if (paymentDisplay === 'both') notesY = payY + 55;
    else if (paymentDisplay !== 'none') notesY = payY + 38;
    else notesY = ty + 16;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    const noteLines = pdf.splitTextToSize(`Notes: ${invoice.notes}`, pageWidth - margin * 2);
    pdf.text(noteLines, margin, notesY);
  }

  // Agency footer line
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 160);
  const footerText = `Thank you for your business  -  Generated by TrackIt Pro`;
  const fw = pdf.getTextWidth(footerText);
  pdf.text(footerText, (pageWidth - fw) / 2, pageHeight - 9);

  // Brand bottom bar (mirrors top bar for a polished look)
  pdf.setFillColor(r, g, b);
  pdf.rect(0, pageHeight - 4, pageWidth, 4, 'F');

  // ── SAVE ─────────────────────────────────────────────────
  // Use explicit Blob download to guarantee filename + .pdf extension across all browsers
  const fileName = `${invoice.invoice_number || 'invoice'}-${(invoice.client_name || 'client').replace(/\s+/g, '_')}.pdf`;
  const pdfBlob = pdf.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
