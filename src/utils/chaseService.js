const parseDate = (val) => {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Check which invoices are sent/overdue and need a reminder sent
export const checkRemindersDue = (invoices, chaseInterval = 5) => {
  const today = new Date();
  
  return invoices.filter(inv => {
    // Only remind for sent or overdue invoices
    if (inv.status !== 'sent' && inv.status !== 'overdue') return false;
    if (!inv.client_email) return false;

    const dueDate = new Date(inv.due_date);
    const isPastDue = today > dueDate;

    const lastSent = parseDate(inv.last_reminder_sent_at);
    
    // First reminder logic
    if (!lastSent) {
      const invDate = new Date(inv.date);
      const daysSinceCreated = (today - invDate) / (1000 * 60 * 60 * 24);
      // Remind if past due OR if it's been at least 3 days since invoice issuance
      return isPastDue || daysSinceCreated >= 3;
    }

    // Subsequent reminders based on interval
    const msSinceLast = today - lastSent;
    const daysSinceLast = msSinceLast / (1000 * 60 * 60 * 24);
    return daysSinceLast >= chaseInterval;
  });
};

// Generate HTML template for the reminder email
export const generateEmailHtml = (invoice, companyData) => {
  const brandColor = companyData.brandColor || '#2dd4bf';
  const companyName = companyData.companyName || 'Our Agency';
  const amountStr = formatCurrency(invoice.total_payable);
  const paymentDisplay = companyData.paymentDisplay || 'both';

  let paymentHtml = '';
  if (paymentDisplay !== 'none') {
    paymentHtml = `
      <div style="background-color: #f7f9fc; border: 1px solid #e4e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: ${brandColor}; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Payment Details</h4>
        <table style="width: 100%; font-size: 13px; color: #333333;">
    `;

    if (paymentDisplay === 'bank' || paymentDisplay === 'both') {
      paymentHtml += `
        <tr>
          <td style="padding: 4px 0; color: #666666;"><strong>Account Holder:</strong></td>
          <td style="padding: 4px 0;">${companyData.accountHolderName || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #666666;"><strong>Bank Name:</strong></td>
          <td style="padding: 4px 0;">${companyData.bankName || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #666666;"><strong>Account Number:</strong></td>
          <td style="padding: 4px 0; font-family: monospace;">${companyData.accountNumber || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #666666;"><strong>IFSC Code:</strong></td>
          <td style="padding: 4px 0; font-family: monospace;">${companyData.ifsc || '-'}</td>
        </tr>
      `;
    }

    if (paymentDisplay === 'upi' || paymentDisplay === 'both') {
      if (paymentDisplay === 'both') {
        paymentHtml += `<tr><td colspan="2" style="border-top: 1px solid #e4e7eb; padding: 8px 0;"></td></tr>`;
      }
      paymentHtml += `
        <tr>
          <td style="padding: 4px 0; color: #666666;"><strong>UPI ID:</strong></td>
          <td style="padding: 4px 0; font-family: monospace;">${companyData.upiId || '-'}</td>
        </tr>
      `;
    }

    paymentHtml += `</table></div>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Reminder: Invoice ${invoice.invoice_number}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f6; margin: 0; padding: 20px; -webkit-font-smoothing: antialiased;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border-top: 4px solid ${brandColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        <tr>
          <td style="padding: 30px 40px;">
            <h2 style="margin: 0 0 4px 0; font-size: 16px; color: #888888; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Payment Reminder</h2>
            <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #111111; font-weight: 700;">Invoice ${invoice.invoice_number}</h1>
            
            <p style="font-size: 15px; line-height: 1.6; color: #444444; margin-top: 0;">
              Hi ${invoice.client_name},
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #444444;">
              This is a friendly reminder that payment for invoice <strong>${invoice.invoice_number}</strong> is outstanding. 
              We would appreciate it if you could review and settle the balance at your earliest convenience.
            </p>

            <table role="presentation" border="0" cellpadding="10" cellspacing="0" style="width: 100%; background-color: #f8fafc; border-radius: 8px; margin: 24px 0; font-size: 14px;">
              <tr>
                <td style="color: #666666;"><strong>Amount Due:</strong></td>
                <td style="text-align: right; color: ${brandColor}; font-weight: 700; font-size: 16px;">${amountStr}</td>
              </tr>
              <tr>
                <td style="color: #666666; border-top: 1px solid #e2e8f0;"><strong>Due Date:</strong></td>
                <td style="text-align: right; color: #111111; font-weight: 600; border-top: 1px solid #e2e8f0;">${invoice.due_date}</td>
              </tr>
              <tr>
                <td style="color: #666666; border-top: 1px solid #e2e8f0;"><strong>Status:</strong></td>
                <td style="text-align: right; color: ${invoice.status === 'overdue' ? '#f43f5e' : '#0ea5e9'}; font-weight: 700; text-transform: uppercase; border-top: 1px solid #e2e8f0; font-size: 12px; letter-spacing: 1px;">
                  ${invoice.status}
                </td>
              </tr>
            </table>

            ${paymentHtml}

            ${invoice.notes ? `
              <p style="font-size: 13px; color: #666666; font-style: italic; border-left: 3px solid #cbd5e1; padding-left: 10px; margin: 20px 0;">
                Note: ${invoice.notes}
              </p>
            ` : ''}

            <p style="font-size: 14px; color: #666666; margin: 30px 0 0 0; line-height: 1.5;">
              If you have already completed the transfer, please disregard this note and reply with the payment confirmation receipt.
            </p>
            
            <p style="font-size: 14px; color: #111111; font-weight: 600; margin: 24px 0 0 0;">
              Best regards,<br>
              <span style="color: ${brandColor};">${companyName}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            Secured and sent via TrackIt-Pro
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Send email using Resend API from client side
export const sendAutoReminder = async (invoice, companyData) => {
  const apiKey = companyData.resendApiKey;
  if (!apiKey) {
    throw new Error("Resend API Key is missing. Configure it in Settings.");
  }

  const fromEmail = companyData.senderEmail || 'onboarding@resend.dev';
  const brandColor = companyData.brandColor || '#2dd4bf';
  const companyName = companyData.companyName || 'Our Agency';
  const subject = `Friendly Reminder: Payment Requested for Invoice ${invoice.invoice_number} from ${companyName}`;
  const htmlBody = generateEmailHtml(invoice, companyData);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: invoice.client_email,
      subject: subject,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Resend error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// Generate mailto link for manual fallback chasing
export const getMailtoLink = (invoice, companyData) => {
  const companyName = companyData.companyName || 'Our Agency';
  const amountStr = formatCurrency(invoice.total_payable);
  const paymentDisplay = companyData.paymentDisplay || 'both';

  let paymentText = '';
  if (paymentDisplay !== 'none') {
    paymentText += `\nPayment Details:\n`;
    if (paymentDisplay === 'bank' || paymentDisplay === 'both') {
      paymentText += `- Account Holder: ${companyData.accountHolderName || '-'}\n`;
      paymentText += `- Bank Name: ${companyData.bankName || '-'}\n`;
      paymentText += `- Account Number: ${companyData.accountNumber || '-'}\n`;
      paymentText += `- IFSC Code: ${companyData.ifsc || '-'}\n`;
    }
    if (paymentDisplay === 'upi' || paymentDisplay === 'both') {
      paymentText += `- UPI ID: ${companyData.upiId || '-'}\n`;
    }
  }

  const subject = `Friendly Reminder: Payment Outstanding for Invoice ${invoice.invoice_number}`;
  const body = `Hi ${invoice.client_name},\n\nThis is a friendly reminder that payment for invoice ${invoice.invoice_number} is outstanding. We would appreciate it if you could review and settle the balance at your earliest convenience.\n\nInvoice Details:\n- Invoice Number: ${invoice.invoice_number}\n- Amount Due: ${amountStr}\n- Due Date: ${invoice.due_date}\n${paymentText}${invoice.notes ? `\nNote: ${invoice.notes}\n` : ''}\nIf you have already processed this transaction, please disregard this note.\n\nBest regards,\n${companyName}`;

  return `mailto:${invoice.client_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

// Trigger test email to verify Resend setup
export const sendTestEmail = async (apiKey, senderEmail, companyName) => {
  if (!apiKey) {
    throw new Error("API Key required.");
  }
  const fromEmail = senderEmail || 'onboarding@resend.dev';
  const targetEmail = senderEmail && senderEmail !== 'onboarding@resend.dev' ? senderEmail : 'onboarding@resend.dev';
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: targetEmail,
      subject: `TrackIt-Pro: Test Email Verification from ${companyName || 'Your Agency'}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border-top: 4px solid #2dd4bf;">
          <h2>Configuration Verified!</h2>
          <p>Congratulations, your Resend API integration for TrackIt-Pro is set up correctly.</p>
          <p>Your automated client reminders will be dispatched from: <strong>${fromEmail}</strong></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p style="font-size: 12px; color: #94a3b8;">Generated by TrackIt-Pro Settings</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Test email failed: ${response.status}`);
  }

  return response.json();
};
