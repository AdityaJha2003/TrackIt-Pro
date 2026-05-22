import React, { useState } from 'react';
import { Mail, ArrowUpRight, Clock, AlertTriangle, Send, Loader2, Sparkles, Coffee } from 'lucide-react';
import { checkRemindersDue, sendAutoReminder, getMailtoLink } from '../../utils/chaseService';
import { updateInvoiceReminderStatus } from '../../firebase/services';
import './ChaseCenter.css';

export const ChaseCenter = ({ invoices, companyData }) => {
  const [sendingId, setSendingId] = useState(null);
  const [notification, setNotification] = useState({ show: false, success: true, message: '' });

  if (!companyData) return null;

  const chaseInterval = companyData.chaseInterval || 5;
  const dueInvoices = checkRemindersDue(invoices, chaseInterval);

  if (dueInvoices.length === 0) {
    return null; // Keep dashboard clean if no chasing needed
  }

  const showNotification = (success, message) => {
    setNotification({ show: true, success, message });
    setTimeout(() => {
      setNotification({ show: false, success: true, message: '' });
    }, 4000);
  };

  const handleAutoChase = async (invoice) => {
    if (!companyData.resendApiKey) {
      showNotification(false, 'Configure your Resend API Key in Settings to auto-chase!');
      return;
    }

    setSendingId(invoice.id);
    try {
      await sendAutoReminder(invoice, companyData);
      
      // Update tracking metadata in Firestore
      const nextCount = (invoice.reminder_count || 0) + 1;
      const todayIso = new Date().toISOString();
      await updateInvoiceReminderStatus(invoice.id, nextCount, todayIso);

      showNotification(true, `Reminder #${nextCount} sent successfully to ${invoice.client_name}!`);
    } catch (err) {
      console.error(err);
      showNotification(false, err.message || 'Failed to send automated email.');
    } finally {
      setSendingId(null);
    }
  };

  const handleManualChase = async (invoice) => {
    try {
      // Open default mail app
      const mailto = getMailtoLink(invoice, companyData);
      window.location.href = mailto;

      // Update reminder history in Firestore
      const nextCount = (invoice.reminder_count || 0) + 1;
      const todayIso = new Date().toISOString();
      await updateInvoiceReminderStatus(invoice.id, nextCount, todayIso);

      showNotification(true, `Logged manual follow-up #${nextCount} for ${invoice.client_name}.`);
    } catch (err) {
      console.error(err);
      showNotification(false, 'Failed to update tracking.');
    }
  };

  const handleSnooze = async (invoice) => {
    try {
      const todayIso = new Date().toISOString();
      // Set last reminder timestamp to today without incrementing count, effectively snoozing it
      await updateInvoiceReminderStatus(invoice.id, invoice.reminder_count || 0, todayIso);
      showNotification(true, `Snoozed reminders for ${invoice.client_name} for ${chaseInterval} days.`);
    } catch (err) {
      console.error(err);
      showNotification(false, 'Failed to snooze.');
    }
  };

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="chase-center-card animate-fade-in">
      {/* Toast Notification */}
      {notification.show && (
        <div className={`chase-toast ${notification.success ? 'success' : 'error'}`}>
          <Sparkles size={16} />
          <span>{notification.message}</span>
        </div>
      )}

      <div className="chase-card-header">
        <div className="chase-header-left">
          <div className="chase-header-icon">
            <Mail size={18} className="text-brand-primary" />
          </div>
          <div>
            <h3 className="chase-card-title">Client Chase Center</h3>
            <p className="chase-card-subtitle">
              {dueInvoices.length} invoice{dueInvoices.length !== 1 ? 's' : ''} require payment reminders
            </p>
          </div>
        </div>
        <div className="chase-badge">
          <Sparkles size={12} /> Auto-Chase Active
        </div>
      </div>

      <div className="chase-invoices-list">
        {dueInvoices.map((inv) => {
          const isOverdue = inv.status === 'overdue' || new Date() > new Date(inv.due_date);
          return (
            <div key={inv.id} className="chase-invoice-row">
              <div className="chase-inv-details">
                <div className="chase-inv-top">
                  <span className="chase-inv-number font-mono">{inv.invoice_number}</span>
                  <span className={`chase-inv-status ${isOverdue ? 'overdue' : 'pending'}`}>
                    {isOverdue ? 'Overdue' : 'Pending'}
                  </span>
                </div>
                <h4 className="chase-inv-client">{inv.client_name}</h4>
                <div className="chase-inv-meta">
                  <span>Due {inv.due_date}</span>
                  <span className="chase-meta-divider">•</span>
                  <span className="text-white font-semibold">{formatINR(inv.total_payable)}</span>
                  {inv.reminder_count > 0 && (
                    <>
                      <span className="chase-meta-divider">•</span>
                      <span className="text-brand-primary font-medium">Chased {inv.reminder_count}x</span>
                    </>
                  )}
                </div>
              </div>

              <div className="chase-inv-actions">
                {companyData.resendApiKey ? (
                  <button
                    id={`chase-auto-${inv.id}`}
                    onClick={() => handleAutoChase(inv)}
                    className="chase-btn-primary"
                    disabled={sendingId === inv.id}
                    title="Send automated email via Resend"
                  >
                    {sendingId === inv.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>Auto Mail</span>
                  </button>
                ) : (
                  <button
                    id={`chase-auto-off-${inv.id}`}
                    className="chase-btn-disabled"
                    disabled
                    title="Configure Resend API Key in Settings to enable"
                  >
                    <AlertTriangle size={14} />
                    <span>Auto Off</span>
                  </button>
                )}

                <button
                  id={`chase-draft-${inv.id}`}
                  onClick={() => handleManualChase(inv)}
                  className="chase-btn-secondary"
                  title="Open mail app with drafted reminder"
                >
                  <Mail size={14} />
                  <span>Draft</span>
                </button>

                <button
                  id={`chase-snooze-${inv.id}`}
                  onClick={() => handleSnooze(inv)}
                  className="chase-btn-snooze"
                  title={`Snooze for ${chaseInterval} days`}
                >
                  <Clock size={14} />
                  <span>Snooze</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
