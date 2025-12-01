import React, { useCallback } from 'react';
import { Upload, Database } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, onLoadSample }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-slate-300">
      <div 
        className="w-full max-w-xl p-12 border-2 border-dashed border-slate-600 rounded-xl bg-slate-800/50 hover:bg-slate-800 hover:border-blue-500 transition-all cursor-pointer flex flex-col items-center gap-4 text-center group"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <div className="p-4 bg-slate-700 rounded-full group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-colors">
            <Upload size={48} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Arrastra aquí tu Excel Mensual para actualizar el reporte</h3>
          <p className="text-slate-400">Soporta .xlsx, .xls</p>
        </div>
        <input 
          id="file-upload" 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          className="hidden" 
          onChange={handleChange}
        />
      </div>

      <div className="flex items-center gap-4 mt-8 w-full max-w-xl">
        <div className="h-px bg-slate-700 flex-1"></div>
        <span className="text-slate-500 text-sm">O</span>
        <div className="h-px bg-slate-700 flex-1"></div>
      </div>

      <button 
        onClick={onLoadSample}
        className="mt-6 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20"
      >
        <Database size={20} />
        Cargar Datos de Muestra
      </button>
    </div>
  );
};
