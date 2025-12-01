import React, { useState, useMemo } from 'react';
import { LoanData, STATUS_ORDER } from '../types';
import { Download, Edit2, Search } from 'lucide-react';
import { exportToExcel } from '../utils/dataProcessing';

interface EditableTableProps {
  data: LoanData[];
  onRowUpdate: (id: string, field: keyof LoanData, value: any) => void;
}

export const EditableTable: React.FC<EditableTableProps> = ({ data, onRowUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleExport = () => {
    exportToExcel(data);
  };

  // Filter and Sort Data
  const processedData = useMemo(() => {
    let filtered = data;
    
    // 1. Search Logic
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = data.filter(row => 
            row.id.toLowerCase().includes(query) || 
            row.customerName.toLowerCase().includes(query) ||
            row.advisor.toLowerCase().includes(query)
        );
    }

    // 2. Sorting Logic: Status Order first, then Name alphabetically
    return [...filtered].sort((a, b) => {
        const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        if (statusDiff !== 0) return statusDiff;
        return a.customerName.localeCompare(b.customerName);
    });
  }, [data, searchQuery]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-[700px]">
      <div className="p-6 border-b border-slate-700 space-y-4">
        <div className="flex justify-between items-center">
            <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 size={18} className="text-blue-400" />
                Editor de Solicitudes (Live)
            </h3>
            <p className="text-xs text-slate-500 mt-1">Edita Estado, Monto o Notas para recalcular métricas.</p>
            </div>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
                <Download size={16} />
                Excel
            </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="🔍 Buscar Cliente (Nombre, Folio o Asesor)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-900 uppercase text-xs font-semibold text-slate-300 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 bg-slate-900">ID Solicitud</th>
              <th className="px-6 py-4 bg-slate-900">Cliente (Editable)</th>
              <th className="px-6 py-4 bg-slate-900">Estado (Editable)</th>
              <th className="px-6 py-4 bg-slate-900 text-right">Monto (Editable)</th>
              <th className="px-6 py-4 bg-slate-900">Notas (Editable)</th>
              <th className="px-6 py-4 bg-slate-900">Asesor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {processedData.map((row) => (
              <tr key={row.id} className="hover:bg-slate-700/30 transition-colors group">
                {/* ID - Read Only */}
                <td className="px-6 py-3 font-medium text-white opacity-70">
                    {row.id}
                </td>

                {/* Name - Editable */}
                <td className="px-6 py-3">
                    <input 
                        type="text"
                        value={row.customerName}
                        onChange={(e) => onRowUpdate(row.id, 'customerName', e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-slate-500 focus:border-blue-500 text-white text-sm w-full py-1 focus:outline-none transition-all"
                    />
                </td>

                {/* Status - Editable Select */}
                <td className="px-6 py-3">
                  <select 
                    value={row.status}
                    onChange={(e) => onRowUpdate(row.id, 'status', e.target.value)}
                    className={`bg-slate-900 border border-slate-600 text-white text-xs rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-40 font-medium
                        ${row.status === 'Entregada' ? 'text-emerald-400 border-emerald-900' : ''}
                        ${row.status === 'Rechazada' ? 'text-red-400 border-red-900' : ''}
                    `}
                  >
                    {STATUS_ORDER.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>

                {/* Amount - Editable Number */}
                <td className="px-6 py-3 text-right">
                    <input 
                        type="number"
                        value={row.amount}
                        onChange={(e) => onRowUpdate(row.id, 'amount', parseFloat(e.target.value))}
                        className="bg-slate-900 border border-slate-600 text-white text-xs rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-32 text-right"
                    />
                </td>

                {/* Notes - Editable Text */}
                <td className="px-6 py-3">
                    <input 
                        type="text"
                        value={row.notes}
                        placeholder="Agregar nota..."
                        onChange={(e) => onRowUpdate(row.id, 'notes', e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-slate-500 focus:border-blue-500 focus:bg-slate-900 text-slate-300 text-xs w-full py-1 focus:outline-none transition-all"
                    />
                </td>

                {/* Advisor - Read Only */}
                <td className="px-6 py-3 text-slate-500 text-xs">
                    {row.advisor}
                </td>
              </tr>
            ))}
            {processedData.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        No se encontraron resultados para "{searchQuery}"
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-700 text-xs text-center text-slate-500 bg-slate-800">
        Mostrando {processedData.length} registros. Ordenado por Estatus y Nombre.
      </div>
    </div>
  );
};