import React from 'react';
import { LoanData } from '../types';

interface DataTableProps {
  data: LoanData[];
}

export const DataTable: React.FC<DataTableProps> = ({ data }) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white">Detalle de Solicitudes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-900 uppercase text-xs font-semibold text-slate-300">
            <tr>
              <th className="px-6 py-4">ID Solicitud</th>
              <th className="px-6 py-4">Asesor</th>
              <th className="px-6 py-4">Lote</th>
              <th className="px-6 py-4">Fecha Creación</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Monto</th>
              <th className="px-6 py-4 text-right">Días Fondeo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data.slice(0, 100).map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{row.id}</td>
                <td className="px-6 py-4 text-white">{row.advisor}</td>
                <td className="px-6 py-4">{row.batch}</td>
                <td className="px-6 py-4">
                  {new Date(row.creationDate).toLocaleDateString('es-MX')}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${row.status === 'Entregada' ? 'bg-emerald-500/10 text-emerald-500' : 
                      row.status === 'Rechazada' ? 'bg-red-500/10 text-red-500' : 
                      'bg-blue-500/10 text-blue-500'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-white">
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.amount)}
                </td>
                <td className="px-6 py-4 text-right">
                  {row.fundingDays !== null ? `${row.fundingDays}` : '-'}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                        No hay datos que coincidan con los filtros.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-700 text-xs text-center text-slate-500">
        Mostrando {Math.min(data.length, 100)} de {data.length} registros
      </div>
    </div>
  );
};