import React from 'react';

interface AlertCardProps {
  title: string;
  message: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const severityToClasses: Record<string, string> = {
  LOW: 'border-blue-300 bg-blue-50 text-blue-800',
  MEDIUM: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  HIGH: 'border-orange-300 bg-orange-50 text-orange-900',
  CRITICAL: 'border-red-300 bg-red-50 text-red-900',
};

const AlertCard: React.FC<AlertCardProps> = ({ title, message, severity = 'LOW' }) => {
  const cls = severityToClasses[severity] || severityToClasses.LOW;
  return (
    <div className={`border rounded p-3 ${cls}`}>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-sm mt-1">{message}</div>
    </div>
  );
};

export default AlertCard;





