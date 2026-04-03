import React, { useState, useEffect } from 'react';
import './GoalTracker.css';
import { Target, Trophy } from 'lucide-react';

export const GoalTracker = ({ transactions, monthlyGoal }) => {
  const [progress, setProgress] = useState(0);

  // Calculate total paid revenue for the current month
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const totalRevenue = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    })
    .filter(t => t.type === 'inflow' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  useEffect(() => {
    // Only animate if there is a goal
    if (monthlyGoal > 0) {
      // Small timeout for the "fill up" animation effect on mount
      const timer = setTimeout(() => {
        const percentage = Math.min((totalRevenue / monthlyGoal) * 100, 100);
        setProgress(percentage);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setProgress(0);
    }
  }, [totalRevenue, monthlyGoal]);

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!monthlyGoal || monthlyGoal <= 0) {
    return null; // Don't render the tracker if no goal is set
  }

  const isGoalReached = totalRevenue >= monthlyGoal;

  return (
    <div className="goal-tracker-container animate-fade-in">
      <div className="goal-tracker-content">
        <div className="goal-header">
          <div className="goal-title">
            {isGoalReached ? (
              <><Trophy size={18} className="text-brand-primary" /> Goal Reached!</>
            ) : (
              <><Target size={18} className="text-brand-primary" /> Monthly Revenue Target</>
            )}
          </div>
          <div className="goal-stats">
            <span className="goal-current">{formatINR(totalRevenue)}</span>
            <span className="goal-target text-brand-muted">/ {formatINR(monthlyGoal)}</span>
          </div>
        </div>

        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          />
          
          {/* Milestone markers */}
          <div className="milestone-marker" style={{ left: '25%' }}>
             <span className="milestone-label">25%</span>
          </div>
          <div className="milestone-marker" style={{ left: '50%' }}>
             <span className="milestone-label">50%</span>
          </div>
          <div className="milestone-marker" style={{ left: '75%' }}>
             <span className="milestone-label">75%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
