import React, { useState, useMemo } from 'react';
import { LoanData, FilterState, DashboardMetrics } from './types';
import { processExcelFile, generateSampleData } from './utils/dataProcessing';
import { FileUpload } from './components/FileUpload';
import { Sidebar } from './components/Sidebar';
import { KPICards } from './components/KPICards';
import { Charts } from './components/Charts';
import { EditableTable } from './components/EditableTable';
import { LayoutDashboard, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  // We maintain 'data' as the source of truth, including edits.
  const [data, setData] = useState<LoanData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [filters, setFilters] = useState<FilterState>({
    selectedBatches: [],
    selectedAdvisors: [],
    dateRange: { start: null, end: null }
  });

  // 1. LIVE EDIT HANDLER
  const handleRowUpdate = (id: string, field: keyof LoanData, value: any) => {
    setData(prevData => prevData.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // 2. Derive options from current data
  const uniqueBatches = useMemo(() => {
    return Array.from(new Set(data.map(d => d.batch))).sort();
  }, [data]);

  const uniqueAdvisors = useMemo(() => {
    return Array.from(new Set(data.map(d => d.advisor))).sort();
  }, [data]);

  // 3. Apply Filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Batch Filter
      if (filters.selectedBatches.length > 0 && !filters.selectedBatches.includes(item.batch)) {
        return false;
      }
      // Advisor Filter
      if (filters.selectedAdvisors.length > 0 && !filters.selectedAdvisors.includes(item.advisor)) {
        return false;
      }
      // Date Range Filter
      const itemDate = new Date(item.creationDate);
      if (filters.dateRange.start && itemDate < filters.dateRange.start) return false;
      if (filters.dateRange.end && itemDate > filters.dateRange.end) return false;

      return true;
    });
  }, [data, filters]);

  // 4. Calculate Metrics (Reactive to Edits)
  const metrics: DashboardMetrics = useMemo(() => {
    const totalRequests = filteredData.length;
    const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
    const delivered = filteredData.filter(item => item.status === 'Entregada');
    const totalFunded = delivered.reduce((sum, item) => sum + item.amount, 0);
    
    const fundingDaysSum = delivered.reduce((sum, item) => sum + (item.fundingDays || 0), 0);
    const avgFundingDays = delivered.length > 0 ? fundingDaysSum / delivered.length : 0;

    return { totalRequests, totalAmount, totalFunded, avgFundingDays };
  }, [filteredData]);

  const handleFileUpload = async (file: File) => {
    try {
      const processed = await processExcelFile(file);
      setData(processed);
    } catch (error) {
      console.error("Error loading file:", error);
      alert("Error al cargar el archivo. Asegúrate de que es un Excel válido.");
    }
  };

  const handleLoadSample = () => {
    const processed = generateSampleData();
    setData(processed);
  };

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
        <header className="bg-slate-800 border-b border-slate-700 p-4">
           <div className="max-w-7xl mx-auto flex items-center gap-3">
             <LayoutDashboard className="text-blue-500" />
             <h1 className="text-xl font-bold">AutoLoan Operational Dashboard</h1>
           </div>
        </header>
        <FileUpload onFileUpload={handleFileUpload} onLoadSample={handleLoadSample} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          batches={uniqueBatches} 
          advisors={uniqueAdvisors}
          filters={filters} 
          setFilters={setFilters} 
        />
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white md:hidden"
        >
          <X />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="p-2 bg-blue-600/20 rounded text-blue-500">
                <LayoutDashboard size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold hidden sm:block">Dashboard Operativo (Live Edit)</h1>
                <p className="text-xs text-slate-400 hidden sm:block">Los cambios en la tabla actualizan los gráficos en tiempo real</p>
            </div>
          </div>
          <button 
            onClick={() => setData([])} 
            className="text-sm text-slate-400 hover:text-white px-3 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            Cargar otro archivo
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* 1. KPIs */}
            <KPICards metrics={metrics} />

            {/* 2. Interactive Table (Core of Operational Dashboard) */}
            <EditableTable data={filteredData} onRowUpdate={handleRowUpdate} />

            {/* 3. Visualizations (Reactive) */}
            <Charts data={filteredData} />
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
