import React from 'react';
import './TransactionTable.css';
import { Paperclip, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export const TransactionTable = ({ transactions }) => {
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
    const today = new Date('2026-04-03'); // Using context date
    const diffTime = Math.abs(today - txnDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  };

  const getStatusBadge = (status, date) => {
    if (status === 'paid') {
      return (
        <span className="status-badge status-paid">
          <CheckCircle size={14} className="inline mr-1" /> Paid
        </span>
      );
    }
    
    if (isOverdue(date, status)) {
      return (
        <span className="status-badge status-overdue">
          <AlertCircle size={14} className="inline mr-1" /> Overdue
        </span>
      );
    }

    return (
      <span className="status-badge status-pending">
        <Clock size={14} className="inline mr-1" /> Pending
      </span>
    );
  };

  const getTypeIcon = (type) => {
    if (type === 'inflow') {
      return <div className="icon-wrapper inflow"><ArrowUpRight size={16} /></div>;
    }
    return <div className="icon-wrapper outflow"><ArrowDownRight size={16} /></div>;
  };

  return (
    <div className="table-container">
      <div className="table-header-row">
        <h2 className="table-title">Recent Transactions</h2>
        <div className="flex gap-2">
          <select className="table-filter">
            <option>All Projects</option>
          </select>
          <select className="table-filter">
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
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id} className="txn-row">
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
                <td>{getStatusBadge(txn.status, txn.date)}</td>
                <td>
                  {txn.evidenceAttached ? (
                    <button className="evidence-btn has-evidence" title="View Evidence">
                      <Paperclip size={16} />
                    </button>
                  ) : (
                    <span className="text-brand-muted text-xs">No File</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
