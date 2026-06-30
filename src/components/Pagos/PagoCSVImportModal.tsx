// src/components/Pagos/PagoCSVImportModal.tsx
import React, { useState } from 'react';
import { useGym } from '../../GymContext';
import { MedioPago } from '../../types';
import { X, Upload, Check } from 'lucide-react';

interface PagoCSVImportModalProps {
  onClose: () => void;
}

export const PagoCSVImportModal: React.FC<PagoCSVImportModalProps> = ({ onClose }) => {
  const { clientes, pagos, importarPagosCSV } = useGym();

  const [statementCSV, setStatementCSV] = useState('');
  const [statementParsedRows, setStatementParsedRows] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<{ procesados: number; insertados: number; duplicados: number; errores: string[] } | null>(null);

  const handleStatementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setStatementCSV(text);
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        const rowsToPreview: any[] = [];
        lines.slice(1).forEach((l, idx) => {
          const cells = l.split(',');
          if (cells.length < 3) return;
          rowsToPreview.push({
            cliente_email: cells[0]?.trim(),
            monto: parseFloat(cells[1]?.trim() || '0'),
            hash: cells[2]?.trim() || `MP-CSV-${Date.now()}-${idx}`,
            medio_pago: (cells[3]?.trim()?.toUpperCase() || 'MERCADO_PAGO') as MedioPago,
            mes: cells[4]?.trim() || new Date().toISOString().slice(0, 7),
            fecha_pago: new Date().toISOString()
          });
        });
        setStatementParsedRows(rowsToPreview);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmStatementImport = () => {
    if (statementParsedRows.length === 0) return;
    const report = importarPagosCSV(statementParsedRows, 'admin@gimnasio.com.ar');
    setImportReport(report);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col text-xs font-sans">
        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
          <h3 className="text-base font-bold">Conciliar Extracto .CSV (Billeteras Digitales)</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {!statementCSV ? (
            <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center bg-zinc-50">
              <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <p className="font-semibold text-zinc-700">Subí tu archivo .CSV de Mercado Pago / Uala</p>
              <p className="text-zinc-400 text-[10px] mt-1">Formato: Email, Monto, Hash, Medio, Mes</p>
              <input type="file" accept=".csv" onChange={handleStatementUpload} className="mt-4 block mx-auto text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer" />
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-bold text-zinc-900 border-b border-zinc-100 pb-2">Vista previa de transacciones leídas</h4>
              <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 font-semibold uppercase tracking-wider text-[9px] border-b border-zinc-200">
                    <tr><th className="p-2">Socio</th><th className="p-2">Email</th><th className="p-2">Monto</th><th className="p-2">Hash</th><th className="p-2">Medio</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {statementParsedRows.map((row, idx) => {
                      const cli = clientes.find(c => c.activo && c.email.toLowerCase() === row.cliente_email?.toLowerCase());
                      const esDuplicado = pagos.some(p => p.hash_transaccion === row.hash);
                      return (
                        <tr key={idx} className={esDuplicado ? 'bg-amber-50/50 opacity-70' : 'hover:bg-zinc-50'}>
                          <td className="p-2 font-semibold">{cli ? `${cli.apellido}, ${cli.nombre}` : <span className="text-red-500 font-bold">No encontrado</span>}</td>
                          <td className="p-2 font-mono">{row.cliente_email}</td>
                          <td className="p-2 font-mono font-bold text-emerald-600">${row.monto}</td>
                          <td className="p-2 font-mono text-[10px]">{row.hash}</td>
                          <td className="p-2 text-zinc-400">{row.medio_pago}{esDuplicado && <span className="ml-2 bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-[8px] font-bold border border-amber-200 font-mono">DUPLICADO</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-205 rounded-xl font-medium">
                <span className="text-zinc-650">{statementParsedRows.length} líneas identificadas. Los duplicados serán omitidos.</span>
                <button onClick={handleConfirmStatementImport} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs cursor-pointer border-none">Ejecutar Conciliación</button>
              </div>
              {importReport && (
                <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl space-y-2 font-sans">
                  <h4 className="font-bold text-emerald-700 flex items-center gap-1.5"><Check className="w-5 h-5 text-emerald-605" />Conciliación finalizada</h4>
                  <p className="text-zinc-600 font-medium">Procesados: <strong>{importReport.procesados}</strong> | Registrados: <strong className="text-emerald-600">{importReport.insertados}</strong> | Duplicados: <strong className="text-amber-600">{importReport.duplicados}</strong></p>
                  {importReport.errores.length > 0 && <div className="bg-white p-2 rounded-lg text-[9.5px] border border-red-200 text-red-650 font-mono">{importReport.errores.map((e, i) => <div key={i}>{e}</div>)}</div>}
                  <button onClick={onClose} className="w-full bg-black text-white rounded-lg py-2 mt-2 font-bold text-xs cursor-pointer border-none">Finalizar</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
