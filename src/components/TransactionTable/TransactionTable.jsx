import React, { useState } from 'react';
import './TransactionTable.css';
import { Paperclip, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertCircle, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { updateTransaction, deleteTransaction } from '../../firebase/services';

export const TransactionTable = ({ transactions, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isOverdue = (dateStr, status) => {
    if (status !== 'pending') return false;
    const txnDate = new Date(dateStr);
    const today = new Date(); // Using current date for overdue logic
    const diffTime = Math.abs(today - txnDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  };

  const handleToggleStatus = async (txn) => {
    const newStatus = txn.status === 'pending' ? 'paid' : 'pending';
    try {
      await updateTransaction(txn.id, { status: newStatus });
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingId) {
      setIsDeleting(true);
      try {
        await deleteTransaction(deletingId);
        setDeletingId(null);
      } catch (error) {
        console.error("Error deleting transaction:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getStatusBadge = (txn) => {
    const status = txn.status;
    const date = txn.date;
    
    if (status === 'paid') {
      return (
        <button onClick={() => handleToggleStatus(txn)} className="status-badge status-paid interactive group/badge transition-all" title="Click to mark Pending">
          <CheckCircle size={14} className="inline mr-1" /> Paid
        </button>
      );
    }
    
    if (isOverdue(date, status)) {
      return (
        <button onClick={() => handleToggleStatus(txn)} className="status-badge status-overdue interactive group/badge transition-all" title="Click to mark Paid">
          <AlertCircle size={14} className="inline mr-1" /> Overdue
        </button>
      );
    }

    return (
      <button onClick={() => handleToggleStatus(txn)} className="status-badge status-pending interactive group/badge transition-all" title="Click to mark Paid">
        <Clock size={14} className="inline mr-1" /> Pending
      </button>
    );
  };

  const getTypeIcon = (type) => {
    if (type === 'inflow') {
      return <div className="icon-wrapper inflow"><ArrowUpRight size={16} /></div>;
    }
    return <div className="icon-wrapper outflow"><ArrowDownRight size={16} /></div>;
  };

  const filteredTransactions = transactions.filter(txn => {
    const term = searchTerm.toLowerCase();
    return txn.entity.toLowerCase().includes(term) || txn.project.toLowerCase().includes(term);
  });

  return (
    <div className="table-container relative">
      <div className="table-header-row">
        <h2 className="table-title">Recent Transactions</h2>
        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-muted" />
            <input 
              type="text" 
              placeholder="Search vendor or project..." 
              className="table-filter pl-9 w-full sm:w-64 focus:w-full transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="table-filter hidden sm:block">
            <option>All Projects</option>
          </select>
          <select className="table-filter hidden sm:block">
            <option>Current Month</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="txn-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Entity</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Evidence</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-brand-muted">
                  No transactions found matching your search.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((txn) => (
                <tr key={txn.id} className="txn-row group">
                  <td className="text-brand-muted whitespace-nowrap">
                    {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                  <td>{getTypeIcon(txn.type)}</td>
                  <td className="font-medium text-white">{txn.entity}</td>
                  <td>
                    <span className="project-tag">{txn.project}</span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className={`font-semibold ${txn.type === 'inflow' ? 'text-accent' : 'text-danger'}`}>
                        {txn.type === 'inflow' ? '+' : '-'}{formatINR(txn.amount)}
                      </span>
                      {txn.hasTds && (
                        <span className="text-xs text-brand-muted mt-0.5">
                          TDS: {formatINR(txn.tdsAmount)} | Net: {formatINR(txn.netAmount)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{getStatusBadge(txn)}</td>
                  <td>
                    {txn.evidenceAttached ? (
                      <button className="evidence-btn has-evidence" title="View Evidence">
                        <Paperclip size={16} />
                      </button>
                    ) : (
                      <span className="text-brand-muted text-xs">No File</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(txn)} className="p-2 rounded-full hover:bg-white/10 text-brand-muted hover:text-white transition-colors" title="Edit Entry">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDeletingId(txn.id)} className="p-2 rounded-full hover:bg-danger/20 text-brand-muted hover:text-danger transition-colors" title="Delete Entry">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up">
            <div className="p-6">
               <h2 className="flex items-center gap-2 text-danger text-xl font-bold mb-2"><AlertTriangle size={24} /> Delete Entry</h2>
               <p className="text-brand-muted text-sm mb-6">Are you sure you want to delete this transaction? This action cannot be undone and will permanently affect your dashboard stats.</p>
               <div className="flex gap-3 justify-end mt-4">
                 <button onClick={() => setDeletingId(null)} className="px-4 py-2 rounded-lg font-medium bg-white/5 hover:bg-white/10 text-white transition-colors" disabled={isDeleting}>Cancel</button>
                 <button onClick={handleDeleteConfirm} className="bg-danger hover:bg-rose-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(244,63,94,0.3)] disabled:opacity-50 flex items-center gap-2" disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
