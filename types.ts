export interface LoanData {
  id: string;
  customerName: string; // New 'Nombre' column
  status: string; 
  amount: number;
  batch: string; // 'Lote'
  advisor: string; // 'Operador coloca'
  notes: string; // 'Notas' column
  creationDate: Date;
  fundingDays: number | null; // Specific for 'Entregada' (historical)
  daysElapsed: number; // General calculation for ALL rows (Fix #1)
  raw: any; 
}

export interface FilterState {
  selectedBatches: string[];
  selectedAdvisors: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

export interface DashboardMetrics {
  totalRequests: number;
  totalAmount: number;
  totalFunded: number;
  avgFundingDays: number;
}

// Order defined by the business logic
export const STATUS_ORDER = [
  'Solicitud', 
  'Capturada', 
  'Mesa de control', 
  'Revisión análisis', 
  'Análisis', 
  'Visita', 
  'Autorizado', 
  'Contrato', 
  'Entregada', 
  'Rechazada', 
  'Cancelado'
];