import * as XLSX from 'xlsx';
import { LoanData, STATUS_ORDER } from '../types';

// Helper to parse dates
const parseDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;

  // Excel serial date
  if (typeof value === 'number') {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  // String parsing
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Check for dd/mm/yyyy or dd-mm-yyyy (Latin format)
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1; 
      const year = parseInt(ddmmyyyy[3], 10);
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

// Helper to clean currency
const parseCurrency = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const clean = value.replace(/[$,\s]/g, '');
    const floatVal = parseFloat(clean);
    return isNaN(floatVal) ? 0 : floatVal;
  }
  return 0; // Default to 0 if NaN/Null
};

export const processExcelFile = async (file: File): Promise<LoanData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Use header: 1 to get raw rows
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (!rows || rows.length === 0) {
            resolve([]);
            return;
        }

        // 1. Dynamic Header Search
        let headerRowIndex = -1;
        
        // Scan first 20 rows for "ID Solicitud"
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i];
            if (!row) continue;
            const hasIdColumn = row.some((cell: any) => 
                String(cell).toLowerCase().trim() === 'id solicitud'
            );
            if (hasIdColumn) {
                headerRowIndex = i;
                break;
            }
        }

        // Fallback
        if (headerRowIndex === -1) {
             for (let i = 0; i < Math.min(rows.length, 20); i++) {
                const row = rows[i];
                if (!row) continue;
                if (row.some((cell: any) => String(cell).toLowerCase().includes('monto a financiar'))) {
                    headerRowIndex = i;
                    break;
                }
            }
            if (headerRowIndex === -1) headerRowIndex = 0;
        }

        const headerRow = rows[headerRowIndex];
        const colMap: Record<string, number> = {};
        headerRow.forEach((cell, idx) => {
            if (typeof cell === 'string') {
                colMap[cell.toLowerCase().trim()] = idx;
            }
        });

        // 2. Identify Column Indices
        const idxId = colMap['id solicitud'];
        
        let idxName = -1;
        Object.keys(colMap).forEach(key => {
            if (key.includes('nombre') || key.includes('cliente')) idxName = colMap[key];
        });

        let idxAmount = -1;
        Object.keys(colMap).forEach(key => {
            if (key.includes('monto') && key.includes('financiar')) idxAmount = colMap[key];
        });
        
        let idxBatch = -1;
        Object.keys(colMap).forEach(key => {
            if (key === 'lote') idxBatch = colMap[key];
        });

        let idxAdvisor = -1;
        Object.keys(colMap).forEach(key => {
            if (key.includes('operador') && key.includes('coloca')) idxAdvisor = colMap[key];
        });

        let idxStatus = -1;
        Object.keys(colMap).forEach(key => {
            if (key === 'estado') idxStatus = colMap[key];
        });

        let idxCreated = -1;
        Object.keys(colMap).forEach(key => {
            if (key.includes('fecha') && key.includes('creaci')) idxCreated = colMap[key];
        });
        // Fallback for Creation Date (Column N / ~Index 13)
        if (idxCreated === -1 && headerRow.length > 13) idxCreated = 13;

        // NEW: "Último cambio de estado" (Columna F / ~Index 5)
        let idxLastChange = -1;
        Object.keys(colMap).forEach(key => {
            if (key.includes('ultimo') && key.includes('cambio')) idxLastChange = colMap[key];
        });
        // Fallback for Last Change (Column F / ~Index 5)
        if (idxLastChange === -1 && headerRow.length > 5) idxLastChange = 5;

        // Check for Notes column
        let idxNotes = -1;
         Object.keys(colMap).forEach(key => {
            if (key === 'notas' || key.includes('observaciones')) idxNotes = colMap[key];
        });

        // 4. Process Rows
        const processed: LoanData[] = [];
        // Data usually starts right after header
        const startRow = headerRowIndex + 1;

        for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;

            const idVal = (idxId !== undefined && row[idxId] !== undefined) ? row[idxId] : null;
            const amountValRaw = (idxAmount !== -1) ? row[idxAmount] : null;
            
            if (!idVal && !amountValRaw) continue;

            const id = idVal ? String(idVal) : `ROW-${i}`;
            const customerName = (idxName !== -1 && row[idxName]) ? String(row[idxName]) : 'Sin Nombre';
            const amount = parseCurrency(amountValRaw);
            
            let rawStatus = (idxStatus !== -1 && row[idxStatus]) ? String(row[idxStatus]).trim() : 'Solicitud';
            
            const batch = (idxBatch !== -1 && row[idxBatch]) ? String(row[idxBatch]) : 'Sin Lote';
            const advisor = (idxAdvisor !== -1 && row[idxAdvisor]) ? String(row[idxAdvisor]) : 'Sin Asignar';
            const notes = (idxNotes !== -1 && row[idxNotes]) ? String(row[idxNotes]) : '';

            const createdVal = (idxCreated !== -1) ? row[idxCreated] : null;
            const creationDate = parseDate(createdVal) || new Date();

            // FIX #2: Calculation Logic (Last Change - Creation)
            let daysElapsed = 0;
            const lastChangeVal = (idxLastChange !== -1) ? row[idxLastChange] : null;
            const lastChangeDate = parseDate(lastChangeVal);

            if (lastChangeDate && creationDate) {
                 const diff = lastChangeDate.getTime() - creationDate.getTime();
                 daysElapsed = Math.floor(diff / (1000 * 60 * 60 * 24));
            } else {
                 // If null/NaN => 0
                 daysElapsed = 0;
            }

            // If negative => 0
            if (daysElapsed < 0) daysElapsed = 0;

            // Historical funding days (only for Entregada)
            let fundingDays: number | null = null;
            if (rawStatus.toLowerCase() === 'entregada') {
                fundingDays = daysElapsed;
            }

            processed.push({
                id,
                customerName,
                status: rawStatus,
                amount,
                batch,
                advisor,
                notes,
                creationDate,
                fundingDays,
                daysElapsed,
                raw: row
            });
        }

        resolve(processed);

      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const exportToExcel = (data: LoanData[]) => {
  const exportData = data.map(item => ({
    'ID Solicitud': item.id,
    'Cliente': item.customerName,
    'Estado': item.status,
    'Monto a financiar': item.amount,
    'Lote': item.batch,
    'Operador coloca': item.advisor,
    'Notas': item.notes,
    'Fecha de creación': item.creationDate.toLocaleDateString('es-MX'),
    'Días Transcurridos': item.daysElapsed
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos Editados");
  XLSX.writeFile(wb, "Reporte_Creditos_Editado.xlsx");
};

export const generateSampleData = (): LoanData[] => {
  const advisors = ['Juan Pérez', 'Maria Garcia', 'Carlos Lopez', 'Ana Martinez', 'Luis Rodriguez'];
  const batches = ['Lote 1', 'Lote 2', 'Lote 3'];
  const data: LoanData[] = [];
  const now = new Date();

  for (let i = 1; i <= 50; i++) {
    const statusIndex = Math.floor(Math.random() * STATUS_ORDER.length);
    const status = STATUS_ORDER[statusIndex];
    const creationDate = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    
    let daysElapsed = Math.floor(Math.random() * 30); // Random days for sample
    let fundingDays: number | null = null;

    if (status === 'Entregada') {
      fundingDays = daysElapsed;
    }

    data.push({
      id: `SAMPLE-${1000 + i}`,
      customerName: `Cliente ${i}`,
      status,
      amount: Math.floor(Math.random() * 500000) + 50000,
      batch: batches[Math.floor(Math.random() * batches.length)],
      advisor: advisors[Math.floor(Math.random() * advisors.length)],
      notes: Math.random() > 0.7 ? 'Nota de ejemplo' : '',
      creationDate,
      fundingDays,
      daysElapsed,
      raw: {}
    });
  }
  
  return data;
};