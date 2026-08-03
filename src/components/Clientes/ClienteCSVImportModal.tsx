// src/components/Clientes/ClienteCSVImportModal.tsx
import React, { useState, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { TipoCliente } from '../../types';
import { FileSpreadsheet, X, Upload, ArrowRight, Check } from 'lucide-react';

interface ClienteCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClienteCSVImportModal: React.FC<ClienteCSVImportModalProps> = ({
  isOpen,
  onClose
}) => {
  const { clientes, planes, importarClientesCSV } = useGym();
  
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({
    nombre: -1,
    apellido: -1,
    email: -1,
    telefono: -1,
    tipo: -1,
    plan_nombre: -1
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<{ procesados: number; insertados: number; errores: string[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCsvContent('');
      setCsvHeaders([]);
      setCsvRows([]);
      setMapping({
        nombre: -1,
        apellido: -1,
        email: -1,
        telefono: -1,
        tipo: -1,
        plan_nombre: -1
      });
      setPreviewData([]);
      setImportReport(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
        setCsvHeaders(headers);

        const rows = lines.slice(1).map(l => {
          const matched = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || l.split(',');
          return matched.map(val => val.replace(/^["']|["']$/g, '').trim());
        });
        
        setCsvRows(rows);

        const tempMapping = {
          nombre: -1,
          apellido: -1,
          email: -1,
          telefono: -1,
          tipo: -1,
          plan_nombre: -1
        };

        headers.forEach((h, idx) => {
          const lH = h.toLowerCase();
          if (lH.includes('nom') || lH.includes('name')) tempMapping.nombre = idx;
          if (lH.includes('ape') || lH.includes('sur')) tempMapping.apellido = idx;
          if (lH.includes('mail') || lH.includes('correo')) tempMapping.email = idx;
          if (lH.includes('tel') || lH.includes('cel') || lH.includes('phone')) tempMapping.telefono = idx;
          if (lH.includes('tipo') || lH.includes('type')) tempMapping.tipo = idx;
          if (lH.includes('plan')) tempMapping.plan_nombre = idx;
        });

        setMapping(tempMapping);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateMapping = (field: keyof typeof mapping, indexString: string) => {
    const val = parseInt(indexString);
    setMapping(prev => ({ ...prev, [field]: val }));
  };

  const handleGeneratePreview = () => {
    if (mapping.nombre === -1 || mapping.apellido === -1 || mapping.email === -1) {
      alert('Debes mapear como mínimo los campos Nombre, Apellido y Email.');
      return;
    }

    const prev: any[] = [];
    csvRows.slice(0, 10).forEach(row => {
      if (row.length === 0) return;
      prev.push({
        nombre: row[mapping.nombre] || '',
        apellido: row[mapping.apellido] || '',
        email: row[mapping.email] || '',
        telefono: mapping.telefono !== -1 ? row[mapping.telefono] : '',
        tipo: 'FIJO',
        plan_nombre: mapping.plan_nombre !== -1 ? row[mapping.plan_nombre] : planes[0]?.nombre
      });
    });
    setPreviewData(prev);
  };

  const handleExecuteImport = () => {
    const finalDataToImport = csvRows.map(row => {
      return {
        nombre: row[mapping.nombre] || '',
        apellido: row[mapping.apellido] || '',
        email: row[mapping.email] || '',
        telefono: mapping.telefono !== -1 ? row[mapping.telefono] : '',
        tipo: 'FIJO' as TipoCliente,
        plan_nombre: mapping.plan_nombre !== -1 ? row[mapping.plan_nombre] : planes[0]?.nombre,
      };
    });

    const report = importarClientesCSV(finalDataToImport);
    setImportReport(report);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="csv-import-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold tracking-tight">Importador Masivo de Clientes (.CSV)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white cursor-pointer"
            id="btn-close-csv-import"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {!csvContent ? (
            <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center bg-zinc-50 hover:bg-zinc-100/50 transition-colors">
              <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <p className="font-semibold text-zinc-700 font-sans">Selecciona o arrastra el archivo CSV para procesar</p>
              <p className="text-zinc-400 text-xs mt-1">El archivo debe contener el listado de alumnos de tu base anterior.</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-4 block mx-auto text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                id="csv-file-selector"
              />
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Mapping */}
              <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
                <h4 className="font-bold text-zinc-900 mb-3 block">Mapeo de Columnas del Archivo</h4>
                <p className="text-zinc-500 text-[11px] mb-4">Relaciona las columnas del archivo subido con los campos requeridos en la base del sistema.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
                  {[
                    { label: 'Nombre (Obligatorio)', field: 'nombre' as const },
                    { label: 'Apellido (Obligatorio)', field: 'apellido' as const },
                    { label: 'Email (Obligatorio)', field: 'email' as const },
                    { label: 'Teléfono', field: 'telefono' as const },
                    { label: 'Plan o Abono', field: 'plan_nombre' as const }
                  ].map(item => (
                    <div key={item.field} className="flex flex-col gap-1.5 p-2 bg-white rounded-lg border border-zinc-200">
                      <span className="font-semibold text-zinc-700 block">{item.label}</span>
                      <select
                        value={mapping[item.field]}
                        onChange={(e) => handleUpdateMapping(item.field, e.target.value)}
                        className="p-1.5 border border-zinc-200 rounded-md bg-white w-full outline-hidden cursor-pointer"
                      >
                        <option value="-1">-- No mapeado --</option>
                        {csvHeaders.map((header, idx) => (
                          <option key={idx} value={idx}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGeneratePreview}
                  className="mt-4 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                  id="btn-generate-preview"
                >
                  Generar Previsualización de Datos
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Preview */}
              {previewData.length > 0 && !importReport && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="font-bold text-zinc-900 block border-b border-zinc-100 pb-2">Previsualización del mapeo (Primeras 10 filas)</h4>
                  
                  <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                    <table className="w-full text-left text-xs text-zinc-700 font-sans">
                      <thead className="bg-zinc-50 font-semibold border-b border-zinc-200 text-zinc-500 uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Nombre Completo</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Celular</th>
                          <th className="p-3">Tipo Fijo/Flex</th>
                          <th className="p-3">Plan Mapeado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        {previewData.map((row, idx) => {
                          const duplicadoFuzzy = clientes.some(c => c.activo && c.email.toLowerCase() === row.email?.toLowerCase());

                          return (
                            <tr key={idx} className={duplicadoFuzzy ? 'bg-red-50/50' : 'hover:bg-zinc-50'}>
                              <td className="p-3 font-semibold text-zinc-900">
                                {row.apellido}, {row.nombre}
                                {duplicadoFuzzy && (
                                  <span className="ml-2 text-[9px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                                    Duplicado
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono">{row.email}</td>
                              <td className="p-3">{row.telefono || '-'}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-sm font-bold bg-zinc-100 border border-zinc-200 text-[10px]">
                                  FIJO
                                </span>
                              </td>
                              <td className="p-3 font-medium text-emerald-700">{row.plan_nombre}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
                    <div className="text-zinc-600 block leading-tight font-sans">
                      Se procesarán un total de <span className="font-bold text-zinc-900">{csvRows.length} miembros</span> listados en el archivo.
                      <p className="text-[10px] text-zinc-400 mt-1">Los emails repetidos serán ignorados o listados en reporte de errores para resguardar la consistencia.</p>
                    </div>
                    <button
                      onClick={handleExecuteImport}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      id="btn-confirm-import"
                    >
                      Confirmar Importación Masiva
                    </button>
                  </div>
                </div>
              )}

              {/* Import report */}
              {importReport && (
                <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200 space-y-3 font-sans animate-fade-in">
                  <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-500" />
                    ¡Proceso de Importación Finalizado!
                  </h4>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white p-3 rounded-lg border border-zinc-100">
                      <span className="text-zinc-400 block uppercase font-medium text-[9px]">Leidos</span>
                      <span className="text-xl font-bold font-mono block">{importReport.procesados}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-zinc-100">
                      <span className="text-zinc-400 block uppercase font-medium text-[9px] text-emerald-600">Registrados con éxito</span>
                      <span className="text-xl font-bold text-emerald-600 font-mono block">{importReport.insertados}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-zinc-100">
                      <span className="text-zinc-400 block uppercase font-medium text-[9px] text-red-500">Errores / Ignorados</span>
                      <span className="text-xl font-bold text-red-500 font-mono block">{importReport.errores.length}</span>
                    </div>
                  </div>

                  {importReport.errores.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-semibold text-zinc-800 block text-[11px] uppercase">Detalle del Registro de Fallas:</span>
                      <div className="bg-white p-3 rounded-lg border border-zinc-200 max-h-32 overflow-y-auto font-mono text-[10px] text-red-600 divide-y divide-zinc-100">
                        {importReport.errores.map((err, idx) => (
                          <div key={idx} className="py-1.5">{err}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    className="mt-2 w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold cursor-pointer"
                    id="btn-close-import-success"
                  >
                    Entendido, cerrar panel
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
