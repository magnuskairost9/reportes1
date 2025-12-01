import React from 'react';
import { FilterState } from '../types';
import { Filter, Calendar, Layers, Users } from 'lucide-react';

interface SidebarProps {
  batches: string[];
  advisors: string[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ batches, advisors, filters, setFilters }) => {
  const toggleBatch = (batch: string) => {
    setFilters(prev => {
      const isSelected = prev.selectedBatches.includes(batch);
      if (isSelected) {
        return { ...prev, selectedBatches: prev.selectedBatches.filter(b => b !== batch) };
      } else {
        return { ...prev, selectedBatches: [...prev.selectedBatches, batch] };
      }
    });
  };

  const toggleAdvisor = (advisor: string) => {
    setFilters(prev => {
      const isSelected = prev.selectedAdvisors.includes(advisor);
      if (isSelected) {
        return { ...prev, selectedAdvisors: prev.selectedAdvisors.filter(a => a !== advisor) };
      } else {
        return { ...prev, selectedAdvisors: [...prev.selectedAdvisors, advisor] };
      }
    });
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: value ? new Date(value) : null
      }
    }));
  };

  return (
    <div className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-8 h-full overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Filter className="text-blue-500" size={24} />
          Filtros
        </h2>
        
        {/* Date Range Filter */}
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} /> Rango de Fechas
          </h3>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-500">Desde</label>
            <input 
              type="date" 
              className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
              onChange={(e) => handleDateChange('start', e.target.value)}
            />
            <label className="text-xs text-slate-500">Hasta</label>
            <input 
              type="date" 
              className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
              onChange={(e) => handleDateChange('end', e.target.value)}
            />
          </div>
        </div>

        {/* Batch Multiselect */}
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} /> Lotes
          </h3>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {batches.map(batch => (
              <label 
                key={batch} 
                className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer transition-colors group"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filters.selectedBatches.includes(batch) ? 'bg-blue-600 border-blue-600' : 'border-slate-600 group-hover:border-slate-400'}`}>
                    {filters.selectedBatches.includes(batch) && <span className="text-white text-[10px]">✓</span>}
                </div>
                <input 
                  type="checkbox" 
                  checked={filters.selectedBatches.includes(batch)}
                  onChange={() => toggleBatch(batch)}
                  className="hidden"
                />
                <span className={`text-sm ${filters.selectedBatches.includes(batch) ? 'text-white' : 'text-slate-400'}`}>
                  {batch}
                </span>
              </label>
            ))}
            {batches.length === 0 && <p className="text-xs text-slate-600 italic">No se encontraron lotes</p>}
          </div>
        </div>

        {/* Advisor Multiselect */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Users size={14} /> Asesores
          </h3>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {advisors.map(advisor => (
              <label 
                key={advisor} 
                className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer transition-colors group"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filters.selectedAdvisors.includes(advisor) ? 'bg-blue-600 border-blue-600' : 'border-slate-600 group-hover:border-slate-400'}`}>
                    {filters.selectedAdvisors.includes(advisor) && <span className="text-white text-[10px]">✓</span>}
                </div>
                <input 
                  type="checkbox" 
                  checked={filters.selectedAdvisors.includes(advisor)}
                  onChange={() => toggleAdvisor(advisor)}
                  className="hidden"
                />
                <span className={`text-sm ${filters.selectedAdvisors.includes(advisor) ? 'text-white' : 'text-slate-400'}`}>
                  {advisor}
                </span>
              </label>
            ))}
            {advisors.length === 0 && <p className="text-xs text-slate-600 italic">No se encontraron asesores</p>}
          </div>
        </div>

      </div>
      
      <div className="mt-auto pt-6 border-t border-slate-800">
        <p className="text-xs text-slate-600 text-center">
            Dashboard Ejecutivo v1.1
        </p>
      </div>
    </div>
  );
};