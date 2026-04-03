import React, { useState, useEffect } from 'react';
import './AddEntryModal.css';
import { X, Upload, Loader2 } from 'lucide-react';
import { addTransaction, updateTransaction } from '../../firebase/services';

export const AddEntryModal = ({ isOpen, onClose, companyId, initialData }) => {
  const [loading, setLoading] = useState(false);
  const defaultFormState = {
    entity: '',
    project: '',
    amount: '',
    type: 'outflow',
    applyTds: false,
    tdsRate: 10,
    status: 'paid',
    date: new Date().toISOString().split('T')[0]
  };
  const [formData, setFormData] = useState(defaultFormState);

  useEffect(() => {
    if (initialData) {
      setFormData({
        entity: initialData.entity || '',
        project: initialData.project || '',
        amount: initialData.amount || '',
        type: initialData.type || 'outflow',
        applyTds: initialData.hasTds || false,
        tdsRate: initialData.tdsRate || 10,
        status: initialData.status || 'paid',
        date: initialData.date || new Date().toISOString().split('T')[0]
      });
    } else {
      setFormData(defaultFormState);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculateTDS = () => {
    const amount = parseFloat(formData.amount) || 0;
    if (!formData.applyTds || !amount) return { tds: 0, net: amount };
    const tds = (amount * formData.tdsRate) / 100;
    return { tds, net: amount - tds };
  };

  const tdsInfo = calculateTDS();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    
    try {
      setLoading(true);
      const amount = parseFloat(formData.amount);
      const dataToSave = {
        ...formData,
        amount,
        tdsAmount: tdsInfo.tds,
        netAmount: tdsInfo.net,
        hasTds: formData.applyTds
      };
      
      if (initialData && initialData.id) {
        await updateTransaction(initialData.id, dataToSave);
      } else {
        await addTransaction(dataToSave, companyId);
      }
      
      onClose();
      // Reset form handled by useEffect when modal closes/opens
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{initialData ? 'Edit Journal Entry' : 'New Journal Entry'}</h2>
          <button onClick={onClose} className="close-btn" disabled={loading}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Transaction Type</label>
            <div className="flex gap-4 mt-2">
              <label className="radio-label">
                <input type="radio" name="type" value="inflow" checked={formData.type === 'inflow'} onChange={handleInputChange} disabled={loading} />
                <span className="radio-custom inflow">Client Inflow</span>
              </label>
              <label className="radio-label">
                <input type="radio" name="type" value="outflow" checked={formData.type === 'outflow'} onChange={handleInputChange} disabled={loading} />
                <span className="radio-custom outflow">Vendor Outflow</span>
              </label>
            </div>
          </div>

          <div className="grid-2-col">
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input type="date" id="date" name="date" value={formData.date} onChange={handleInputChange} required disabled={loading} />
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={formData.status} onChange={handleInputChange} disabled={loading}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="entity">{formData.type === 'inflow' ? 'Client Name' : 'Vendor/Freelancer Name'}</label>
            <input type="text" id="entity" name="entity" value={formData.entity} onChange={handleInputChange} placeholder="e.g. Nexus Corp" required disabled={loading} />
          </div>

          <div className="form-group">
            <label htmlFor="project">Project Tag</label>
            <input type="text" id="project" name="project" value={formData.project} onChange={handleInputChange} placeholder="e.g. Website Redesign" required disabled={loading} />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount (₹)</label>
            <div className="input-with-prefix">
              <span className="prefix">₹</span>
              <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="0.00" min="0" required disabled={loading} />
            </div>
          </div>

          {formData.type === 'outflow' && (
            <div className="tds-section">
              <label className="tds-toggle">
                <input type="checkbox" name="applyTds" checked={formData.applyTds} onChange={handleInputChange} disabled={loading} />
                <span className="toggle-text">Apply TDS (India Specific)</span>
              </label>
              
              {formData.applyTds && (
                <div className="tds-details slide-down">
                  <div className="form-group mb-0">
                    <label>TDS Rate (%)</label>
                    <input type="number" name="tdsRate" value={formData.tdsRate} onChange={handleInputChange} min="0" max="100" disabled={loading} />
                  </div>
                  <div className="tds-summary">
                    <p>Gross: ₹{formData.amount || 0}</p>
                    <p className="text-danger">- TDS: ₹{tdsInfo.tds.toFixed(2)}</p>
                    <p className="summary-net">Net Payout: ₹{tdsInfo.net.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Evidence Vault (PDF/Image)</label>
            <div className="upload-zone">
              <div className="flex justify-center"><Upload size={24} className="mb-2 text-brand-muted" /></div>
              <p>Drag & drop or <span className="text-brand-primary cursor-pointer">browse</span></p>
              <p className="text-xs text-brand-muted mt-1">Supports PDF, JPG, PNG up to 5MB</p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Saving...</div> : (initialData ? 'Update Entry' : 'Save Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
