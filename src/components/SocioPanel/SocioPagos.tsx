// src/components/SocioPanel/SocioPagos.tsx
import React, { useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { CreditCard } from 'lucide-react';

interface SocioPagosProps {
  socio: Cliente;
}

export const SocioPagos: React.FC<SocioPagosProps> = ({ socio }) => {
  const { pagos } = useGym();

  const misPagos = useMemo(() => {
    return pagos
      .filter(p => p.cliente_id === socio.id)
      .sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
  }, [pagos, socio]);

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6.5 lg:p-8 shadow-sm space-y-6 animate-fade-in" id="socio-ledger-payments">
      <div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <CreditCard className="w-4.5 h-4.5 text-emerald-600" />
          HISTORIAL DE TRANSACCIONES PROCESADAS
        </h3>

        {misPagos.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs italic font-semibold">
            No tienes abonos procesados cargados en tu cartera histórica.
          </div>
        ) : (
          <div className="space-y-2.5">
            {misPagos.map(p => (
              <div key={p.id} className="bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs transition-colors">
                <div className="space-y-1 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">Arancel correspondiente: {p.mes_correspondiente}</span>
                    <span className="text-[8.5px] bg-emerald-100 text-emerald-800 border border-emerald-100 px-1.5 py-0.2 rounded font-mono font-bold tracking-wider">PAGO SEGURO</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono tracking-tight text-emerald-600/80">
                    HASH: {p.hash_transaccion}
                  </p>
                  <p className="text-[9px] text-emerald-800">
                    Procesado el {new Date(p.fecha_pago).toLocaleDateString('es-AR')} a las {new Date(p.fecha_pago).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <p className="font-mono font-bold text-slate-800 text-sm sm:text-base">${p.monto.toLocaleString('es-AR')}</p>
                  <span className="text-[8px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider inline-block mt-1 border border-emerald-100 font-mono">
                    {p.medio_pago}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
