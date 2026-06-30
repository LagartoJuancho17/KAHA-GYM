// src/components/SocioPanel/SocioPaymentChoiceModal.tsx
import React, { useState } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { X, CreditCard, Sparkles, Loader2, Check } from 'lucide-react';

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
  const { registrarPago } = useGym();
  const [simulatedSuccessData, setSimulatedSuccessData] = useState<{ clientName: string; amount: number } | null>(null);

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
          amount: socio.deuda_acumulada,
          title: `Cuota KAHA GYM - ${socio.nombre} ${socio.apellido}`,
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

  return (
    <>
      {/* CHOICE MODAL FOR PAYMENT METHOD */}
      {!simulatedSuccessData && (
        <div className="fixed inset-0 bg-slate-905/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in font-sans" id="payment-choice-modal">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl relative overflow-hidden flex flex-col animate-scale-in">
            {/* Decorative background gradients */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-100 rounded-full blur-3xl opacity-55"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-150 rounded-full blur-3xl opacity-40"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Confirmar Método de Pago</h3>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Monto a abonar</span>
                <span className="text-2xl font-black text-slate-805 font-mono">${socio.deuda_acumulada.toLocaleString('es-AR')} ARS</span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Selecciona cómo deseas procesar este pago. Puedes usar la pasarela oficial de Mercado Pago o simular el cobro de forma instantánea localmente sin configurar cuentas externas.
              </p>

              <div className="pt-2 flex flex-col gap-3">
                {/* Option 1: Official Checkout */}
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
                  <span>{isPaying ? 'Iniciando Mercado Pago...' : 'Proceder con Mercado Pago (Oficial)'}</span>
                </button>

                {/* Option 2: Local Simulation */}
                <button
                  onClick={() => {
                    const simulatedHash = `SIM-MP-${Date.now()}`;
                    const res = registrarPago({
                      cliente_id: socio.id,
                      cliente_nombre_completo: `${socio.nombre} ${socio.apellido}`,
                      monto: socio.deuda_acumulada,
                      medio_pago: 'MERCADO_PAGO',
                      mes_correspondiente: new Date().toISOString().slice(0, 7),
                      hash_transaccion: simulatedHash,
                      registrado_por: socio.email
                    }, socio.email);

                    if (res.success) {
                      setSimulatedSuccessData({
                        clientName: `${socio.nombre} ${socio.apellido}`,
                        amount: socio.deuda_acumulada
                      });
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-md border-none"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Simular Pago Rápido (Local)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED PAYMENT SUCCESS RECEIPT MODAL */}
      {simulatedSuccessData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-105 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-scale-in">
            {/* Decorative background gradients */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-100 rounded-full blur-3xl opacity-50"></div>

            {/* Big check icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-100 rounded-full scale-150 animate-ping opacity-30"></div>
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white border-4 border-white shadow-md relative z-10">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-800 tracking-tight">¡Pago Aprobado (Simulado)!</h3>
            <p className="text-slate-550 text-sm mt-2 leading-relaxed">
              Tu transacción simulada se ha procesado con éxito y se ha reportado al panel administrativo.
            </p>

            {/* Receipt display card */}
            <div className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-5 my-6 space-y-3 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono uppercase font-bold">Socio</span>
                <span className="font-bold text-slate-800">{simulatedSuccessData.clientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono uppercase font-bold">Medio de Pago</span>
                <span className="font-semibold text-sky-650 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 text-[10px]">
                  SIMULACIÓN MP
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono uppercase font-bold">Monto Abonado</span>
                <span className="font-black text-emerald-700 text-sm font-mono">
                  ${simulatedSuccessData.amount.toLocaleString('es-AR')} ARS
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-200">
                <span className="text-slate-400 font-mono uppercase font-bold">Estado Cuenta</span>
                <span className="font-bold text-emerald-750 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[9px] border border-emerald-150 uppercase tracking-wide">
                  ✓ Al Día
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setSimulatedSuccessData(null);
                onClose();
              }}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all shadow-md active:scale-98 cursor-pointer relative z-10 border-none"
            >
              Entendido, gracias
            </button>
          </div>
        </div>
      )}
    </>
  );
};
