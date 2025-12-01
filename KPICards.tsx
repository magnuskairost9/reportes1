import React from 'react';
import { DashboardMetrics } from '../types';
import { FileText, DollarSign, CheckCircle, Clock } from 'lucide-react';

interface KPICardsProps {
  metrics: DashboardMetrics;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
};

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card 
        title="Total Solicitudes" 
        value={metrics.totalRequests.toLocaleString()} 
        icon={<FileText className="text-blue-400" size={24} />}
        subtext="Total volumen procesado"
      />
      <Card 
        title="Monto Total" 
        value={formatCurrency(metrics.totalAmount)} 
        icon={<DollarSign className="text-emerald-400" size={24} />}
        subtext="Valor total cartera"
      />
      <Card 
        title="Total Fondeado" 
        value={formatCurrency(metrics.totalFunded)} 
        icon={<CheckCircle className="text-purple-400" size={24} />}
        subtext="Solo 'Entregada'"
      />
      <Card 
        title="Prom. Días Fondeo" 
        value={`${metrics.avgFundingDays.toFixed(1)} días`} 
        icon={<Clock className="text-orange-400" size={24} />}
        subtext="Eficiencia operativa"
      />
    </div>
  );
};

const Card = ({ title, value, icon, subtext }: { title: string, value: string, icon: React.ReactNode, subtext: string }) => (
  <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-sm hover:border-slate-600 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wide">{title}</h3>
      <div className="p-2 bg-slate-900/50 rounded-lg">{icon}</div>
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <p className="text-xs text-slate-500">{subtext}</p>
  </div>
);
