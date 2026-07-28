// src/components/SocioPanel/SocioPaymentChoiceModal.tsx
import React, { useState } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { X, CreditCard, Sparkles, Loader2, Check, Copy, Landmark } from 'lucide-react';

interface SocioPaymentChoiceModalProps {
  socio: Cliente;
  onClose: () => void;
  setPaymentError: (err: string | null) => void;
  isPaying: boolean;
  setIsPaying: (paying: boolean) => void;
}

export const SocioPaymentChoiceModal: React.FC<SocioPaymentChoiceModalProps> = ({
  socio,
  onClose,
  setPaymentError,
  isPaying,
  setIsPaying
}) => {
  const { planes, solicitarPagoTransferencia, registrarPago } = useGym();
  const [activeTab, setActiveTab] = useState<'MERCADO_PAGO' | 'TRANSFERENCIA'>('TRANSFERENCIA');
  const [copied, setCopied] = useState(false);
  const [simulatedSuccessData, setSimulatedSuccessData] = useState<{ clientName: string; amount: number; method: string } | null>(null);

  const montoBase = socio.deuda_acumulada;
  const amountMP = Math.round(montoBase * 1.10); // 10% surcharge
  const feeMP = Math.round(montoBase * 0.10);

  const handlePagarMercadoPago = async () => {
    setIsPaying(true);
    setPaymentError(null);
    try {
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountMP,
          title: `Cuota KAHA GYM - ${socio.nombre} ${socio.apellido} (+10% recargo)`,
          clientId: socio.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al iniciar el pago con Mercado Pago.');
      }

      const preference = await response.json();
      if (preference.init_point) {
        window.location.href = preference.init_point;
      } else {
        throw new Error('No se recibió la URL de redirección de Mercado Pago.');
      }
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.message || 'Error de conexión con la pasarela de pagos.');
      setIsPaying(false);
    }
  };

  const handleCopyAlias = () => {
    navigator.clipboard.writeText('kaha.fitness.center');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmTransfer = () => {
    const res = solicitarPagoTransferencia(socio.id);
    if (res.success) {
      setSimulatedSuccessData({
        clientName: `${socio.nombre} ${socio.apellido}`,
        amount: montoBase,
        method: 'REVISION'
      });
    }
  };

  const handleSimulateMP = () => {
    const simulatedHash = `SIM-MP-${Date.now()}`;
    const res = registrarPago({
      cliente_id: socio.id,
      cliente_nombre_completo: `${socio.nombre} ${socio.apellido}`,
      monto: amountMP,
      medio_pago: 'MERCADO_PAGO',
      mes_correspondiente: new Date().toISOString().slice(0, 7),
      hash_transaccion: simulatedHash,
      registrado_por: socio.email
    }, socio.email);

    if (res.success) {
      setSimulatedSuccessData({
        clientName: `${socio.nombre} ${socio.apellido}`,
        amount: amountMP,
        method: 'MERCADO_PAGO'
      });
    }
  };

  return (
    <>
      {/* CHOICE MODAL FOR PAYMENT METHOD */}
      {!simulatedSuccessData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in font-sans" id="payment-choice-modal">
          <div className="bg-white rounded-3xl p-7.5 max-w-md w-full border border-slate-100/80 shadow-2xl relative overflow-hidden flex flex-col animate-scale-up">
            {/* Decorative background gradients */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-35 pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Opciones de Pago</h3>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200 gap-0.5 mb-5 relative z-10">
              <button
                onClick={() => setActiveTab('MERCADO_PAGO')}
                className={`py-2 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                  activeTab === 'MERCADO_PAGO'
                    ? 'bg-white text-sky-700 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Mercado Pago
              </button>
              <button
                onClick={() => setActiveTab('TRANSFERENCIA')}
                className={`py-2 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                  activeTab === 'TRANSFERENCIA'
                    ? 'bg-white text-emerald-700 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Transferencia
              </button>
            </div>

            <div className="space-y-4 relative z-10 flex-1">
              {activeTab === 'MERCADO_PAGO' ? (
                // MERCADO PAGO VIEW
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Monto base:</span>
                      <span className="font-semibold text-slate-700 font-mono">${montoBase.toLocaleString('es-AR')} ARS</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-amber-600">
                      <span>Recargo Mercado Pago (10%):</span>
                      <span className="font-semibold font-mono">+${feeMP.toLocaleString('es-AR')} ARS</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Total a abonar:</span>
                      <span className="text-xl font-black text-sky-600 font-mono">${amountMP.toLocaleString('es-AR')} ARS</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Aboná de forma segura y directa mediante Checkout Pro oficial. La acreditación impactará instantáneamente en tu cuenta del gimnasio.
                  </p>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      onClick={handlePagarMercadoPago}
                      disabled={isPaying}
                      className="w-full bg-[#009EE3] hover:bg-[#008bc7] text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-md border-none disabled:opacity-60"
                    >
                      {isPaying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      <span>{isPaying ? 'Iniciando Mercado Pago...' : 'Pagar con Mercado Pago (10% más)'}</span>
                    </button>

                  </div>
                </div>
              ) : (
                // TRANSFERENCIA VIEW
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Monto Neto a transferir:</span>
                      <span className="text-xl font-black text-emerald-700 font-mono">${montoBase.toLocaleString('es-AR')} ARS</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md inline-block">
                      ✓ Sin cargos extra (0% Recargo)
                    </div>
                  </div>

                  {/* HIGH VISIBILITY COPY CONTAINER */}
                  <div className="bg-slate-50/50 border-2 border-emerald-500/20 rounded-2xl p-4 space-y-3.5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Alias Bancario</span>
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5 pl-3.5">
                        <span className="font-mono text-sm font-extrabold text-slate-800 select-all">kahafitweb</span>
                        <button
                          onClick={handleCopyAlias}
                          className={`ml-2 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-tight flex items-center gap-1.5 transition-all shadow-3xs border-none cursor-pointer ${
                            copied 
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500/10'
                          }`}
                          id="btn-copy-alias"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              ¡Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar Alias
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[10px] pt-1.5 border-t border-slate-200/50">
                      <div>
                        <span className="text-slate-400 font-mono">CVU</span>
                        <p className="font-bold text-slate-700 font-mono mt-0.5">0000003100021307778401</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-mono">Titular</span>
                        <p className="font-bold text-slate-700 mt-0.5">KAHA Fitness Center</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Realizá la transferencia desde la app de tu banco o billetera virtual usando el Alias o CVU de arriba. Una vez enviada, confirmala haciendo clic abajo para impacto contable.
                  </p>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      onClick={handleConfirmTransfer}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-md border-none"
                    >
                      <Check className="w-4 h-4" />
                      <span>Ya realicé la transferencia</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT SUCCESS RECEIPT MODAL */}
      {simulatedSuccessData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-scale-up">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

            {/* Pending / Clock icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-amber-100 rounded-full scale-150 animate-ping opacity-25"></div>
              <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center text-white border-4 border-white shadow-md relative z-10">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                </svg>
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Transferencia en Revisión</h3>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-xs">
              Tu comprobante fue enviado. El equipo de <strong>KAHA GYM</strong> lo revisará y confirmará tu pago a la brevedad.
            </p>

            {/* Receipt card */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 my-6 space-y-3 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono uppercase font-bold">Socio</span>
                <span className="font-bold text-slate-800">{simulatedSuccessData.clientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono uppercase font-bold">Medio de Pago</span>
                <span className="font-semibold px-2 py-0.5 rounded-md border text-[10px] text-amber-700 bg-amber-50 border-amber-100">
                  TRANSFERENCIA BANCARIA
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono uppercase font-bold">Monto Declarado</span>
                <span className="font-black text-sm font-mono text-emerald-700">
                  ${simulatedSuccessData.amount.toLocaleString('es-AR')} ARS
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-200">
                <span className="text-slate-400 font-mono uppercase font-bold">Estado</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-[9px] border border-amber-200 uppercase tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  EN REVISIÓN
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setSimulatedSuccessData(null);
                onClose();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all shadow-md active:scale-98 cursor-pointer relative z-10 border-none"
            >
              Entendido, gracias
            </button>
          </div>
        </div>
      )}
    </>
  );
};
