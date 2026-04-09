import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Palette, Loader2, Sparkles, Receipt, CreditCard, Smartphone, Building2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import './Settings.css';

const PRESET_COLORS = [
  '#2dd4bf', // Original Teal
  '#f43f5e', // Rose
  '#818cf8', // Indigo
  '#10b981', // Emerald
  '#fbbf24', // Amber
  '#0ea5e9', // Sky Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
];

const Settings = () => {
  const { userData } = useAuth();
  const [selectedColor, setSelectedColor] = useState(userData?.brandColor || '#2dd4bf');
  const [monthlyGoal, setMonthlyGoal] = useState(userData?.monthlyGoal || 0);
  const [invoicePrefix, setInvoicePrefix] = useState(userData?.invoicePrefix || 'INV');
  const [bankName, setBankName] = useState(userData?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(userData?.accountNumber || '');
  const [ifsc, setIfsc] = useState(userData?.ifsc || '');
  const [accountHolderName, setAccountHolderName] = useState(userData?.accountHolderName || '');
  const [upiId, setUpiId] = useState(userData?.upiId || '');
  const [paymentDisplay, setPaymentDisplay] = useState(userData?.paymentDisplay || 'both');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updatePreview = (color) => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', color);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    if (result) {
      const rgb = `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
      root.style.setProperty('--brand-primary-rgb', rgb);
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    updatePreview(color);
  };

  const handleSave = async () => {
    if (!userData?.company_id) return;
    setLoading(true);
    try {
      const companyRef = doc(db, 'companies', userData.company_id);
      await updateDoc(companyRef, {
        brand_color: selectedColor,
        monthly_goal: Number(monthlyGoal),
        invoice_prefix: invoicePrefix || 'INV',
        bank_name: bankName,
        account_number: accountNumber,
        ifsc,
        account_holder_name: accountHolderName,
        upi_id: upiId,
        payment_display: paymentDisplay,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-brand-primary/50 transition-colors text-sm font-medium";

  return (
    <div className="settings-container">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/10 blur-[100px] pointer-events-none" />
      
      <header className="settings-header">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-3 rounded-full hover:bg-white/5 transition-all">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agency Settings</h1>
            <p className="text-brand-muted text-sm mt-1">
              Command Core for <span className="text-white">{userData?.companyName}</span>
            </p>
          </div>
        </div>
      </header>

      <main className="settings-content">

        {/* ── BRAND IDENTITY ─────────────────────────────────────── */}
        <section className="settings-section">
          <div className="section-header">
            <div className="flex items-center gap-2 mb-2">
              <Palette size={20} className="text-brand-primary" />
              <h2 className="section-title">Brand Identity</h2>
            </div>
            <p className="section-subtitle">Define your agency's signature color. This updates the entire dashboard experience.</p>
          </div>
          <div className="color-grid">
            {PRESET_COLORS.map((color) => (
              <div
                key={color}
                className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
              >
                {selectedColor === color && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check size={20} color={parseInt(color.replace('#',''), 16) > 0xffffff/2 ? '#000' : '#fff'} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="custom-color-picker">
            <div className="flex items-center gap-4">
              <div className="color-input-wrapper">
                <input type="color" value={selectedColor} onChange={(e) => handleColorChange(e.target.value)} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Custom Color</p>
                <p className="color-hex-display">{selectedColor.toUpperCase()}</p>
              </div>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-2 text-xs py-1 px-3 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <Sparkles size={12} />
                <span>Live Preview Active</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINANCIAL GOALS ─────────────────────────────────────── */}
        <section className="settings-section">
          <div className="section-header">
            <h2 className="section-title">Financial Goals</h2>
            <p className="section-subtitle">Set your monthly target for paid revenue. Powers your dashboard progress bar.</p>
          </div>
          <div className="form-group max-w-sm">
            <label className="text-sm text-brand-muted mb-2 block">Monthly Revenue Goal</label>
            <div className="flex items-center gap-2 bg-black/20 border border-white/5 rounded-xl p-2 px-4 focus-within:border-brand-primary/50 transition-colors">
              <span className="text-brand-muted font-medium">₹</span>
              <input
                type="number"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                className="bg-transparent border-none outline-none text-white w-full py-1 text-lg font-semibold"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </section>

        {/* ── INVOICE DEFAULTS ─────────────────────────────────────── */}
        <section className="settings-section">
          <div className="section-header">
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={20} className="text-brand-primary" />
              <h2 className="section-title">Invoice Defaults</h2>
            </div>
            <p className="section-subtitle">Configure how your invoices are numbered and how clients can pay you.</p>
          </div>

          {/* Invoice Prefix */}
          <div className="mb-6">
            <label className="text-sm text-brand-muted mb-2 block">Invoice Number Prefix</label>
            <div className="flex items-center gap-3 max-w-xs">
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                className={inputClass + " max-w-[120px] text-center font-bold tracking-widest"}
                placeholder="INV"
                maxLength={8}
              />
              <p className="text-brand-muted text-sm">→ <span className="text-white font-medium">{invoicePrefix || 'INV'}-2026-0001</span></p>
            </div>
          </div>

          {/* Payment Display Toggle */}
          <div className="mb-6">
            <label className="text-sm text-brand-muted mb-3 block">Show on Invoice PDF</label>
            <div className="flex gap-3 flex-wrap">
              {[
                { value: 'bank', label: 'Bank Details Only', icon: <Building2 size={16} /> },
                { value: 'upi', label: 'UPI Only', icon: <Smartphone size={16} /> },
                { value: 'both', label: 'Both', icon: <CreditCard size={16} /> },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPaymentDisplay(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    paymentDisplay === opt.value
                      ? 'bg-brand-primary/20 border-brand-primary text-brand-primary'
                      : 'bg-black/20 border-white/5 text-brand-muted hover:border-white/20'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bank Details */}
          {(paymentDisplay === 'bank' || paymentDisplay === 'both') && (
            <div className="mb-6 p-4 rounded-xl bg-black/20 border border-white/5">
              <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-zinc-300"><Building2 size={16} className="text-brand-primary" /> Bank Account Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-brand-muted mb-1 block">Account Holder Name</label>
                  <input type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className={inputClass} placeholder="e.g. Aditya Corp" />
                </div>
                <div>
                  <label className="text-xs text-brand-muted mb-1 block">Bank Name</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} placeholder="e.g. HDFC Bank" />
                </div>
                <div>
                  <label className="text-xs text-brand-muted mb-1 block">Account Number</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClass} placeholder="e.g. 00123456789" />
                </div>
                <div>
                  <label className="text-xs text-brand-muted mb-1 block">IFSC Code</label>
                  <input type="text" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} className={inputClass} placeholder="e.g. HDFC0001234" />
                </div>
              </div>
            </div>
          )}

          {/* UPI */}
          {(paymentDisplay === 'upi' || paymentDisplay === 'both') && (
            <div className="p-4 rounded-xl bg-black/20 border border-white/5">
              <p className="text-sm font-semibold mb-4 flex items-center gap-2 text-zinc-300"><Smartphone size={16} className="text-brand-primary" /> UPI Details</p>
              <div className="max-w-sm">
                <label className="text-xs text-brand-muted mb-1 block">UPI ID</label>
                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} className={inputClass} placeholder="e.g. yourname@upi" />
              </div>
            </div>
          )}
        </section>

        {/* ── COMPANY INFO ─────────────────────────────────────── */}
        <section className="settings-section">
          <div className="section-header">
            <h2 className="section-title">Company Info</h2>
            <p className="section-subtitle">Information currently tied to this workspace.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-black/20 border border-white/5">
              <p className="text-xs text-brand-muted uppercase mb-1">Company Name</p>
              <p className="font-semibold">{userData?.companyName}</p>
            </div>
            <div className="p-4 rounded-xl bg-black/20 border border-white/5">
              <p className="text-xs text-brand-muted uppercase mb-1">Admin Email</p>
              <p className="font-semibold">{userData?.email}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="settings-footer">
        <div className="flex items-center gap-6">
          {success && (
            <p className="text-brand-primary text-sm font-medium flex items-center gap-2">
              <Check size={16} /> Settings Saved Successfully
            </p>
          )}
          <button className="save-button flex items-center gap-2" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save All Settings'}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Settings;
