// src/components/Pagos/PagoReceiptModal.tsx
import React, { useState } from 'react';
import { X, Copy } from 'lucide-react';

interface PagoReceiptModalProps {
  receiptClientText: string | null;
  onCloseReceipt: () => void;
  recibosMultiples: Array<{ cliente_nombre: string, messageText: string, telefono: string, copiado: boolean }> | null;
  onCloseRecibos: () => void;
}

export const PagoReceiptModal: React.FC<PagoReceiptModalProps> = ({
  receiptClientText,
  onCloseReceipt,
  recibosMultiples,
  onCloseRecibos
}) => {
  const [copiado, setCopiado] = useState(false);
  const [localRecibos, setLocalRecibos] = useState<typeof recibosMultiples>(recibosMultiples);

  React.useEffect(() => {
    setLocalRecibos(recibosMultiples);
  }, [recibosMultiples]);

  return (
    <>
      {/* ═══ SINGLE RECEIPT PREVIEW ═══ */}
      {receiptClientText && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans text-xs">
          <div className="bg-zinc-950 text-white rounded-xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-sans font-bold text-sm flex items-center gap-2">
                <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
                Comprobante WhatsApp
              </h3>
              <button onClick={onCloseReceipt} className="text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg font-sans text-xs text-zinc-300 leading-relaxed italic select-all">"{receiptClientText}"</div>
            <div className="flex gap-2 font-semibold">
              <button 
                onClick={() => { 
                  navigator.clipboard.writeText(receiptClientText); 
                  setCopiado(true); 
                  setTimeout(() => setCopiado(false), 2000); 
                }} 
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-xs flex items-center justify-center gap-1.5 border border-zinc-700 cursor-pointer"
              >
                <Copy className="w-4 h-4" />{copiado ? 'Copiado' : 'Copiar Texto'}
              </button>
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(receiptClientText)}`} 
                target="_blank" 
                rel="noreferrer" 
                className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 text-center shadow-sm shadow-emerald-600/20 transition-colors"
              >
                <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
                Enviar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MULTIPLE RECEIPTS ═══ */}
      {localRecibos && localRecibos.length > 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans text-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 fill-current text-[#25D366]" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
                <h3 className="text-base font-bold">Comprobantes de Pago para Socios</h3>
              </div>
              <button onClick={onCloseRecibos} className="text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-zinc-500 font-sans">Cobros registrados correctamente. Mensajes listos para enviar por WhatsApp.</p>
              <div className="space-y-4">
                {localRecibos.map((rec, index) => {
                  const handleCopySingle = () => {
                    navigator.clipboard.writeText(rec.messageText);
                    setLocalRecibos(prev => prev ? prev.map((r, i) => i === index ? { ...r, copiado: true } : r) : null);
                    setTimeout(() => setLocalRecibos(prev => prev ? prev.map((r, i) => i === index ? { ...r, copiado: false } : r) : null), 2000);
                  };
                  return (
                    <div key={index} className="border border-zinc-200 rounded-lg p-4 bg-zinc-50 space-y-2">
                      <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                        <span className="font-bold text-zinc-900">{rec.cliente_nombre}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">WhatsApp: {rec.telefono}</span>
                      </div>
                      <div className="bg-white border border-zinc-200 p-2.5 rounded font-mono text-[11px] text-zinc-700 italic select-all whitespace-pre-wrap">{rec.messageText}</div>
                      <div className="flex gap-2 pt-1 font-semibold">
                        <button type="button" onClick={handleCopySingle} className="flex-1 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded text-xs flex items-center justify-center gap-1 cursor-pointer bg-white">
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />{rec.copiado ? 'Copiado' : 'Copiar'}
                        </button>
                        <a href={`https://wa.me/${rec.telefono}?text=${encodeURIComponent(rec.messageText)}`} target="_blank" rel="noreferrer" className="flex-1 py-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 text-center transition-colors shadow-sm">
                          <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end">
              <button type="button" onClick={onCloseRecibos} className="px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold text-xs cursor-pointer border-none">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
