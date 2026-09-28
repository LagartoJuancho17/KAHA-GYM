// src/components/Pagos/FacturacionRuloModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  X, FileSpreadsheet, Download, ExternalLink, 
  Check, RefreshCw, AlertCircle, Copy, Settings, ChevronDown, ChevronUp, Sparkles 
} from 'lucide-react';
import { Pago, Cliente, Plan } from '../../types';
import { 
  generarFilasFacturacionRulo, 
  generarCSVFacturacionRulo, 
  enviarAGoogleSheets,
  DEFAULT_WEBHOOK_URL,
  DEFAULT_SPREADSHEET_URL
} from '../../lib/facturacionRulo';

interface FacturacionRuloModalProps {
  isOpen: boolean;
  onClose: () => void;
  mes: string;
  nombreMes: string;
  pagos: Pago[];
  clientes: Cliente[];
  planes: Plan[];
}

export const FacturacionRuloModal: React.FC<FacturacionRuloModalProps> = ({
  isOpen,
  onClose,
  mes,
  nombreMes,
  pagos,
  clientes,
  planes
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('kaha_rulo_webhook_url') || DEFAULT_WEBHOOK_URL;
    } catch {
      return DEFAULT_WEBHOOK_URL;
    }
  });

  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('kaha_rulo_spreadsheet_url') || DEFAULT_SPREADSHEET_URL;
    } catch {
      return DEFAULT_SPREADSHEET_URL;
    }
  });

  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error' | 'aviso'; mensaje: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Calcular filas para el mes seleccionado
  const { filas, objetos, totalMonto, cantidadPagos } = useMemo(() => {
    return generarFilasFacturacionRulo({ mes, pagos, clientes, planes });
  }, [mes, pagos, clientes, planes]);

  if (!isOpen) return null;

  // Manejar guardado de URLs
  const handleGuardarConfig = () => {
    try {
      localStorage.setItem('kaha_rulo_webhook_url', webhookUrl);
      localStorage.setItem('kaha_rulo_spreadsheet_url', spreadsheetUrl);
    } catch {
      // ignore
    }
    setMostrarConfig(false);
  };

  // Manejar sincronización automática
  const handleSincronizar = async () => {
    setEnviando(true);
    setResultado(null);

    const res = await enviarAGoogleSheets(webhookUrl, filas);

    setEnviando(false);
    if (res.ok) {
      setResultado({
        tipo: 'exito',
        mensaje: `¡Excelente! Se sincronizaron exitosamente ${cantidadPagos} comprobantes en Google Sheets.`
      });
    } else {
      setResultado({
        tipo: 'error',
        mensaje: res.message
      });
    }
  };

  // Manejar descarga CSV
  const handleDescargarCSV = () => {
    const csvContent = generarCSVFacturacionRulo(filas);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facturacion_rulo_${mes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manejar copiar TSV para pegar directamente
  const handleCopiarPortapapeles = () => {
    const tsv = filas.map(f => f.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-3xl overflow-hidden my-auto">
        
        {/* ENCABEZADO */}
        <div className="bg-linear-to-r from-amber-600 via-amber-500 to-amber-600 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
              🟡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                  Plantilla AFIP Facturación
                </span>
                <span className="text-[10px] font-bold text-amber-100 font-mono">
                  {nombreMes}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                Facturación Caja Rulo
              </h3>
            </div>
          </div>
        </div>

        {/* CUERPO */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* TARJETAS RESUMEN DE LA EXPORTACIÓN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Comprobantes
              </span>
              <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
                {cantidadPagos}
              </div>
              <span className="text-[10px] text-amber-700">transferencias Rulo</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Total Facturado
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono mt-0.5 truncate">
                ${totalMonto.toLocaleString('es-AR')}
              </div>
              <span className="text-[10px] text-emerald-700">monto bruto cobrado</span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">
                Condición Venta
              </span>
              <div className="text-sm font-bold text-zinc-900 mt-1">
                TRANSFERENCIA
              </div>
              <span className="text-[10px] text-zinc-500">Consumidor Final</span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block">
                Período Servicio
              </span>
              <div className="text-xs font-bold text-zinc-900 mt-1 font-mono">
                {objetos[0]?.facturadoDesde || '01/09/26'} - {objetos[0]?.facturadoHasta || '30/09/26'}
              </div>
              <span className="text-[10px] text-zinc-500">mes completo</span>
            </div>
          </div>

          {/* MENSAJE DE RESULTADO */}
          {resultado && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm ${
              resultado.tipo === 'exito'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}>
              {resultado.tipo === 'exito' ? (
                <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{resultado.mensaje}</p>
                {resultado.tipo === 'error' && (
                  <p className="text-xs text-rose-700">
                    💡 Si el Apps Script aún requiere autorización en Google, puedes usar el botón <strong>"Descargar CSV para AFIP"</strong> o <strong>"Copiar para Google Sheets"</strong> para cargarlo en 2 clics.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* BOTONES DE ACCIÓN PRINCIPALES */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {/* BOTÓN 1: SINCRONIZAR AUTOMÁTICAMENTE */}
            <button
              onClick={handleSincronizar}
              disabled={enviando || cantidadPagos === 0}
              className={`flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all cursor-pointer ${
                enviando 
                  ? 'bg-amber-400 cursor-not-allowed' 
                  : 'bg-amber-600 hover:bg-amber-500 active:scale-[0.99] shadow-amber-200'
              }`}
            >
              {enviando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sincronizando con Google Sheets...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ Sincronizar con Google Sheets</span>
                </>
              )}
            </button>

            {/* BOTÓN 2: DESCARGAR CSV */}
            <button
              onClick={handleDescargarCSV}
              disabled={cantidadPagos === 0}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 transition-all cursor-pointer"
              title="Descargar archivo CSV listo para importar en AFIP o Excel"
            >
              <Download className="w-4 h-4 text-zinc-600" />
              <span>Descargar CSV</span>
            </button>

            {/* BOTÓN 3: COPIAR AL PORTAPAPELES */}
            <button
              onClick={handleCopiarPortapapeles}
              disabled={cantidadPagos === 0}
              className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-bold border transition-all cursor-pointer ${
                copiado
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
              title="Copia todas las filas formateadas para pegarlas directamente en Google Sheets con Cmd+V"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-emerald-700" />}
              <span>{copiado ? '¡Copiado!' : 'Copiar para Sheets'}</span>
            </button>
          </div>

          {/* ACCESO DIRECTO A LA HOJA ONLINE */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
            <div className="flex items-center gap-2 text-zinc-700">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Hoja de Cálculo en Google Drive:</span>
            </div>
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-amber-700 hover:text-amber-800 underline hover:no-underline"
            >
              <span>Abrir Plantilla Online</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* PREVIEW DE COMPROBANTES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-700 px-1">
              <span>Vista previa de comprobantes ({objetos.length}):</span>
              <span className="text-[10px] text-zinc-500 font-normal">Mostrando primeros 5 registros</span>
            </div>

            <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] uppercase font-bold text-zinc-600">
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Producto / Servicio</th>
                      <th className="py-2 px-3">Monto</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono">
                    {objetos.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2 px-3 text-zinc-700 whitespace-nowrap">{row.fechaComprobante}</td>
                        <td className="py-2 px-3 font-sans font-medium text-zinc-900">{row.productoServicio}</td>
                        <td className="py-2 px-3 text-emerald-700 font-bold whitespace-nowrap">{row.total.trim()}</td>
                        <td className="py-2 px-3 text-zinc-500 text-[10px]">{row.tipo}</td>
                        <td className="py-2 px-3 text-zinc-500 text-[10px] truncate max-w-[150px]">{row.email || '-'}</td>
                      </tr>
                    ))}
                    {objetos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-zinc-400 font-sans">
                          No se registraron pagos con destino Rulo en este mes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CONFIGURACIÓN AVANZADA COLAPSABLE */}
          <div className="border border-zinc-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setMostrarConfig(!mostrarConfig)}
              className="w-full flex items-center justify-between p-3.5 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-500" />
                <span>Configuración de enlaces (Webhook y Google Sheet)</span>
              </div>
              {mostrarConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {mostrarConfig && (
              <div className="p-4 space-y-3 bg-white text-xs border-t border-zinc-200">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                    URL del Webhook de Apps Script:
                  </label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono text-[11px] focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                    URL de la Hoja de Google Sheets:
                  </label>
                  <input
                    type="text"
                    value={spreadsheetUrl}
                    onChange={e => setSpreadsheetUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl font-mono text-[11px] focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleGuardarConfig}
                    className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Guardar configuración
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* PIE */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
