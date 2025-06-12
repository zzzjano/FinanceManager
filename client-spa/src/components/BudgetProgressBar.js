import React from 'react';
import { ProgressBar } from 'react-bootstrap';

const BudgetProgressBar = ({ spent, amount, warningThreshold = 80 }) => {
  // Calculate percentage spent
  const percentage = (spent / amount) * 100;
  
  // Determine variant based on percentage and warning threshold
  const getVariant = () => {
    if (percentage >= 100) return 'danger';
    if (percentage >= warningThreshold) return 'warning';
    return 'success';
  };
  
  return (
    <ProgressBar 
      now={Math.min(percentage, 100)} 
      variant={getVariant()} 
      label={`${percentage.toFixed(1)}%`} 
    />
  );
};

export default BudgetProgressBar;
