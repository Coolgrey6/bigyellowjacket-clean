import React from 'react';
import { AlertTriangle, Shield, Zap, Info } from 'lucide-react';

interface Alert {
  type: string;
  endpoint: {
    host: string;
    port: number;
  };
  timestamp: string;
  details: any;
}

interface AlertCardProps {
  alerts: Alert[];
}

const severityToClasses: Record<string, string> = {
  LOW: 'border-blue-300 bg-blue-50 text-blue-800',
  MEDIUM: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  HIGH: 'border-orange-300 bg-orange-50 text-orange-900',
  CRITICAL: 'border-red-300 bg-red-50 text-red-900',
};

const getSeverityIcon = (type: string) => {
  if (type.toLowerCase().includes('critical') || type.toLowerCase().includes('attack')) {
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  }
  if (type.toLowerCase().includes('high') || type.toLowerCase().includes('threat')) {
    return <Shield className="w-4 h-4 text-orange-600" />;
  }
  if (type.toLowerCase().includes('medium') || type.toLowerCase().includes('suspicious')) {
    return <Zap className="w-4 h-4 text-yellow-600" />;
  }
  return <Info className="w-4 h-4 text-blue-600" />;
};

const getSeverityFromType = (type: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
  if (type.toLowerCase().includes('critical') || type.toLowerCase().includes('attack')) {
    return 'CRITICAL';
  }
  if (type.toLowerCase().includes('high') || type.toLowerCase().includes('threat')) {
    return 'HIGH';
  }
  if (type.toLowerCase().includes('medium') || type.toLowerCase().includes('suspicious')) {
    return 'MEDIUM';
  }
  return 'LOW';
};

const AlertCard: React.FC<AlertCardProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          Security Alerts
        </h3>
        <div className="text-center py-8">
          <div className="text-green-500 text-4xl mb-2">✅</div>
          <p className="text-gray-500 text-sm">No active security alerts</p>
          <p className="text-gray-400 text-xs mt-1">System is secure</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 className="font-medium mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        Security Alerts ({alerts.length})
      </h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {alerts.slice(0, 5).map((alert, index) => {
          const severity = getSeverityFromType(alert.type);
          const cls = severityToClasses[severity];
          const icon = getSeverityIcon(alert.type);
          
          return (
            <div key={index} className={`border rounded-lg p-3 ${cls}`}>
              <div className="flex items-start gap-2">
                {icon}
                <div className="flex-1">
                  <div className="font-semibold text-sm">{alert.type}</div>
                  <div className="text-xs mt-1 text-gray-600">
                    {alert.endpoint.host}:{alert.endpoint.port}
                  </div>
                  <div className="text-xs mt-1 text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {severity}
                </span>
              </div>
            </div>
          );
        })}
        {alerts.length > 5 && (
          <div className="text-center text-xs text-gray-500 py-2">
            +{alerts.length - 5} more alerts
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertCard;





