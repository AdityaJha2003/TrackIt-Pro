import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, FileText, Trash2, Download, Send,
  CheckCircle, Clock, AlertCircle, FilePen, Loader2, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToInvoices,
  addInvoice,
  updateInvoiceStatus,
  getInvoiceCount,
} from '../../firebase/services';
import { generateInvoicePDF } from '../../utils/generateInvoicePDF';
import './Invoices.css';

const emptyLine = () => ({ description: '', qty: 1, rate: '' });

const defaultForm = (prefix = 'INV', count = 0) => {
  const today = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const num = String(count + 1).padStart(4, '0');
  const year = new Date().getFullYear();
  return {
    invoice_number: `${prefix}-${year}-${num}`,
    client_name: '',
    client_email: '',
    client_address: '',
    date: today,
    due_date: due,
    line_items: [emptyLine()],
    gst_percent: '',
    tds_percent: '',
    notes: '',
    status: 'draft',
  };
};

const STATUS_META = {
  draft: { label: 'Draft', color: 'status-draft', icon: <FilePen size={11} /> },
  sent: { label: 'Sent', color: 'status-sent', icon: <Send size={11} /> },
  paid: { label: 'Paid', color: 'status-paid', icon: <CheckCircle size={11} /> },
  overdue: { label: 'Overdue', color: 'status-overdue', icon: <AlertCircle size={11} /> },
};

const formatINR = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

export default function Invoices() {
  const { userData } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData?.company_id) return;
    const unsub = subscribeToInvoices(userData.company_id, setInvoices);
    return () => unsub();
  }, [userData]);

  // ── FORM CALCULATIONS ────────────────────────────────────────────
  const calcTotals = (f) => {
    const subtotal = (f?.line_items || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
    const gstAmt = subtotal * ((Number(f?.gst_percent) || 0) / 100);
    const tdsAmt = subtotal * ((Number(f?.tds_percent) || 0) / 100);
    const total = subtotal + gstAmt - tdsAmt;
    return { subtotal, gstAmt, tdsAmt, total };
  };

  const totals = calcTotals(form);

  // ── NEW INVOICE ──────────────────────────────────────────────────
  const handleNewInvoice = async () => {
    const count = await getInvoiceCount(userData.company_id);
    setForm(defaultForm(userData.invoicePrefix || 'INV', count));
    setSelected(null);
    setShowForm(true);
  };

  // ── SELECT EXISTING ──────────────────────────────────────────────
  const handleSelectInvoice = (inv) => {
    setSelected(inv);
    setShowForm(false);
  };

  // ── LINE ITEM OPS ────────────────────────────────────────────────
  const updateLine = (idx, field, val) => {
    setForm(prev => ({
      ...prev,
      line_items: prev.line_items.map((l, i) => i === idx ? { ...l, [field]: val } : l),
    }));
  };

  const addLine = () => setForm(prev => ({ ...prev, line_items: [...prev.line_items, emptyLine()] }));
  const removeLine = (idx) => setForm(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== idx) }));

  // ── SAVE INVOICE ─────────────────────────────────────────────────
  const handleSave = async (status) => {
    if (!form?.client_name || !form?.due_date) {
      alert('Please fill in Client Name and Due Date.');
      return;
    }
    setLoading(true);
    try {
      const { subtotal, gstAmt, tdsAmt, total } = calcTotals(form);
      const invoiceData = {
        ...form,
        status,
        subtotal,
        gst_amount: gstAmt,
        tds_amount: tdsAmt,
        total_payable: total,
        gst_percent: Number(form.gst_percent) || 0,
        tds_percent: Number(form.tds_percent) || 0,
      };
      await addInvoice(invoiceData, userData.company_id);
      setShowForm(false);
      setForm(null);
    } catch (e) {
      console.error(e);
      alert('Failed to save invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── GENERATE PDF ─────────────────────────────────────────────────
  const handleDownloadPDF = (inv) => {
    generateInvoicePDF(inv, userData);
  };

  // ── MARK PAID ────────────────────────────────────────────────────
  const handleMarkPaid = async (inv) => {
    await updateInvoiceStatus(inv.id, 'paid', inv.linked_txn_id);
    setSelected(prev => prev?.id === inv.id ? { ...prev, status: 'paid' } : prev);
  };

  // ── STATUS BADGE ─────────────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const meta = STATUS_META[status] || STATUS_META.draft;
    return (
      <span className={`invoice-status-badge ${meta.color}`}>
        {meta.icon} {meta.label}
      </span>
    );
  };

  return (
    <div className="invoices-container">
      <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[50%] rounded-full bg-brand-primary/5 blur-[120px] pointer-events-none" />

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <header className="invoices-header">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2.5 rounded-full hover:bg-white/5 transition-all">
            <ArrowLeft size={22} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
            <p className="text-brand-muted text-xs mt-0.5 uppercase tracking-wider">
              {userData?.companyName} • Invoice Manager
            </p>
          </div>
        </div>
        <div className="text-brand-muted text-sm">
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        </div>
      </header>

      {/* ── BODY ──────────────────────────────────────────────────── */}
      <div className="invoices-body">

        {/* LEFT PANEL */}
        <div className="invoices-list-panel">
          <div className="invoices-list-toolbar">
            <button onClick={handleNewInvoice} className="new-invoice-btn">
              <Plus size={16} /> New Invoice
            </button>
          </div>

          <div className="invoices-list-body">
            {invoices.length === 0 ? (
              <div className="empty-invoices">
                <FileText size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No invoices yet.</p>
                <p className="text-xs mt-1">Click "New Invoice" to get started.</p>
              </div>
            ) : (
              invoices.map(inv => (
                <div
                  key={inv.id}
                  className={`invoice-card ${selected?.id === inv.id && !showForm ? 'active' : ''}`}
                  onClick={() => handleSelectInvoice(inv)}
                >
                  <div className="invoice-card-top">
                    <span className="invoice-number">{inv.invoice_number}</span>
                    <span className="invoice-amount">{formatINR(inv.total_payable)}</span>
                  </div>
                  <p className="invoice-client">{inv.client_name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="invoice-due">Due {inv.due_date}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL — FORM */}
        {showForm && form && (
          <div className="invoice-form-panel">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">New Invoice</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-white/5 text-brand-muted hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Invoice Meta */}
            <div className="mb-6">
              <p className="inv-section-title">Invoice Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="inv-label">Invoice Number</label>
                  <input className="inv-input font-mono" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} />
                </div>
                <div>
                  <label className="inv-label">Invoice Date</label>
                  <input type="date" className="inv-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="inv-label">Due Date</label>
                  <input type="date" className="inv-input" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div className="mb-6">
              <p className="inv-section-title">Bill To</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="inv-label">Client / Company Name *</label>
                  <input className="inv-input" placeholder="e.g. Nexus Corp" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} />
                </div>
                <div>
                  <label className="inv-label">Client Email</label>
                  <input type="email" className="inv-input" placeholder="billing@client.com" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} />
                </div>
                <div>
                  <label className="inv-label">Client Address</label>
                  <input className="inv-input" placeholder="City, State" value={form.client_address} onChange={e => setForm(p => ({ ...p, client_address: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <p className="inv-section-title">Line Items</p>
              <table className="line-items-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ width: '60px' }}>Qty</th>
                    <th style={{ width: '110px' }}>Rate (₹)</th>
                    <th style={{ width: '110px' }}>Total</th>
                    <th style={{ width: '32px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.line_items.map((line, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          className="inv-input text-xs"
                          placeholder="Description of service"
                          value={line.description}
                          onChange={e => updateLine(idx, 'description', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="inv-input text-xs text-center"
                          value={line.qty}
                          onChange={e => updateLine(idx, 'qty', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="inv-input text-xs"
                          placeholder="0"
                          value={line.rate}
                          onChange={e => updateLine(idx, 'rate', e.target.value)}
                        />
                      </td>
                      <td className="text-sm font-medium text-white px-2">
                        {formatINR((Number(line.qty) || 0) * (Number(line.rate) || 0))}
                      </td>
                      <td>
                        {form.line_items.length > 1 && (
                          <button className="remove-line-btn" onClick={() => removeLine(idx)}>
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="add-line-btn mt-2" onClick={addLine}>
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            {/* Tax Fields */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <label className="inv-label">GST % (optional)</label>
                <input type="number" className="inv-input" placeholder="e.g. 18" min="0" max="100" value={form.gst_percent} onChange={e => setForm(p => ({ ...p, gst_percent: e.target.value }))} />
              </div>
              <div>
                <label className="inv-label">TDS % (optional)</label>
                <input type="number" className="inv-input" placeholder="e.g. 10" min="0" max="100" value={form.tds_percent} onChange={e => setForm(p => ({ ...p, tds_percent: e.target.value }))} />
              </div>
            </div>

            {/* Totals */}
            <div className="totals-box mb-6">
              <div className="total-row"><span>Subtotal</span><span className="total-value">{formatINR(totals.subtotal)}</span></div>
              {Number(form.gst_percent) > 0 && <div className="total-row"><span>GST ({form.gst_percent}%)</span><span className="total-value">{formatINR(totals.gstAmt)}</span></div>}
              {Number(form.tds_percent) > 0 && <div className="total-row"><span>TDS Deduction ({form.tds_percent}%)</span><span className="total-value text-danger">- {formatINR(totals.tdsAmt)}</span></div>}
              <div className="total-row payable"><span>Total Payable</span><span style={{ color: 'var(--brand-primary)' }}>{formatINR(totals.total)}</span></div>
            </div>

            {/* Notes */}
            <div className="mb-8">
              <label className="inv-label">Notes (optional)</label>
              <textarea
                className="inv-input resize-none"
                rows={2}
                placeholder="e.g. Payment via NEFT preferred. Thank you for your business!"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <button className="inv-btn-secondary" onClick={() => handleSave('draft')} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <FilePen size={16} />}
                Save as Draft
              </button>
              <button className="inv-btn-primary" onClick={() => handleSave('sent')} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Create & Send
              </button>
            </div>
          </div>
        )}

        {/* RIGHT PANEL — DETAIL VIEW */}
        {!showForm && selected && (
          <div className="invoice-form-panel">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="font-mono text-brand-primary text-xs font-bold mb-1">{selected.invoice_number}</p>
                <h2 className="text-2xl font-bold text-white">{selected.client_name}</h2>
                <p className="text-brand-muted text-sm mt-0.5">Due {selected.due_date}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={selected.status} />
              </div>
            </div>

            {/* Amounts summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Subtotal', value: formatINR(selected.subtotal) },
                { label: 'Tax / GST', value: formatINR(selected.gst_amount) },
                { label: 'Total Payable', value: formatINR(selected.total_payable) },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <p className="text-xs text-brand-muted mb-1">{label}</p>
                  <p className="text-white font-bold">{value}</p>
                </div>
              ))}
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <p className="inv-section-title">Line Items</p>
              <table className="line-items-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.line_items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-sm text-white pr-4">{item.description}</td>
                      <td className="text-sm text-brand-muted text-center">{item.qty}</td>
                      <td className="text-sm text-brand-muted">{formatINR(item.rate)}</td>
                      <td className="text-sm text-white font-medium">{formatINR((item.qty || 1) * (item.rate || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected.notes && (
              <div className="mb-6 p-3 rounded-xl bg-black/20 border border-white/5">
                <p className="text-xs text-brand-muted mb-1">Notes</p>
                <p className="text-sm text-zinc-300">{selected.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <button className="inv-btn-primary" onClick={() => handleDownloadPDF(selected)}>
                <Download size={16} /> Download PDF
              </button>
              {selected.status !== 'paid' && (
                <button className="inv-btn-secondary" onClick={() => handleMarkPaid(selected)}>
                  <CheckCircle size={16} /> Mark as Paid
                </button>
              )}
            </div>
          </div>
        )}

        {/* RIGHT PANEL — EMPTY */}
        {!showForm && !selected && (
          <div className="invoice-form-panel empty-state">
            <FileText size={48} className="opacity-10" />
            <p className="text-sm">Select an invoice to view details</p>
            <p className="text-xs opacity-60">or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
