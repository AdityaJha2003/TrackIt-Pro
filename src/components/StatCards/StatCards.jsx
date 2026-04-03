import React from 'react';
import './StatCards.css';

export const StatCards = ({ transactions }) => {
  const currentMonth = 4; // April for MVP
  const currentYear = 2026;

  const currentMonthTxns = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });

  const totalRevenue = currentMonthTxns
    .filter(t => t.type === 'inflow' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = currentMonthTxns
    .filter(t => t.type === 'outflow' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingRevenue = currentMonthTxns
    .filter(t => t.type === 'inflow' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const netMargin = totalRevenue - totalExpenses;

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="stat-cards-container">
      <div className="stat-card">
        <h3 className="stat-label">Total Revenue (Paid)</h3>
        <p className="stat-value text-accent">{formatINR(totalRevenue)}</p>
      </div>
      <div className="stat-card">
        <h3 className="stat-label">Total Expenses</h3>
        <p className="stat-value text-danger">{formatINR(totalExpenses)}</p>
      </div>
      <div className="stat-card highlight">
        <h3 className="stat-label text-white">Net Agency Margin</h3>
        <p className={`stat-value ${netMargin >= 0 ? 'text-accent' : 'text-danger'}`}>
          {formatINR(netMargin)}
        </p>
      </div>
      <div className="stat-card">
        <h3 className="stat-label">Pending Inflows</h3>
        <p className="stat-value text-warning">{formatINR(pendingRevenue)}</p>
      </div>
    </div>
  );
};
