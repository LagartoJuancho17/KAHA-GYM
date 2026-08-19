// src/components/SocioPanel/SocioWaitlistPromotedModal.tsx
import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Clock, CheckCircle2, X } from 'lucide-react';

interface PromoWaitlistData {
  id: string;
  clienteId: string;
  nombre: string;
  turnoId: string;
  dia: string;
  hora: string;
  fecha?: string;
  timestamp: number;
}

interface SocioWaitlistPromotedModalProps {
  socioId: string;
}

export const SocioWaitlistPromotedModal: React.FC<SocioWaitlistPromotedModalProps> = ({ socioId }) => {
  const [activePromo, setActivePromo] = useState<PromoWaitlistData | null>(null);

  useEffect(() => {
    if (!socioId) return;

    try {
      const storageKey = `kaha_waitlist_promocion_${socioId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const promos: PromoWaitlistData[] = JSON.parse(stored);
        if (Array.isArray(promos) && promos.length > 0) {
          // Tomar la primera promoción pendiente con un pequeño delay para una animación suave
          const timer = setTimeout(() => {
            setActivePromo(promos[0]);
          }, 600);
          return () => clearTimeout(timer);
        }
      }
    } catch (e) {
      console.error("Error al leer promociones de lista de espera:", e);
    }
  }, [socioId]);

  const handleDismiss = () => {
    if (!activePromo || !socioId) return;

    try {
      const storageKey = `kaha_waitlist_promocion_${socioId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const promos: PromoWaitlistData[] = JSON.parse(stored);
        const remaining = promos.filter(p => p.id !== activePromo.id);
        if (remaining.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(remaining));
          setActivePromo(remaining[0]);
          return;
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.error("Error al actualizar promociones:", e);
    }

    setActivePromo(null);
  };

  if (!activePromo) return null;

  // Formatear fecha legible si existe (ej: 2026-08-20 -> Jueves 20 de Agosto)
  const formatearFecha = (f?: string) => {
    if (!f) return null;
    try {
      const [year, month, day] = f.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
      return f;
    }
  };

  const fechaLegible = formatearFecha(activePromo.fecha);

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-md font-sans animate-fade-in" id="modal-waitlist-celebration">
      <div className="bg-zinc-950 border-2 border-lime-400/90 rounded-3xl shadow-2xl shadow-lime-500/20 w-full max-w-md overflow-hidden relative animate-scale-in text-white">
        
        {/* Glow de fondo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-lime-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Botón cerrar sutil */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800 transition-colors z-10 cursor-pointer border-none bg-transparent"
          title="Cerrar aviso"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Contenido Principal */}
        <div className="p-6 sm:p-8 text-center space-y-5 relative z-10">
          
          {/* Badge superior */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-400/15 border border-lime-400/40 text-lime-400 text-[11px] font-mono font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
            ¡Lista de Espera Liberada!
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ¡Lugar Confirmado! 🎉
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Hola <strong className="text-white">{activePromo.nombre}</strong>, se liberó una vacante y fuiste promovido/a automáticamente:
            </p>
          </div>

          {/* Tarjeta destacada del turno asignado */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-inner">
            <div className="flex items-center justify-center gap-2 text-lime-400 text-xs font-mono font-bold uppercase tracking-widest">
              <CheckCircle2 className="w-4 h-4 text-lime-400" />
              <span>Turno Asignado</span>
            </div>

            <div className="space-y-1">
              <div className="text-xl sm:text-2xl font-black text-white capitalize">
                {fechaLegible || activePromo.dia}
              </div>
              <div className="flex items-center justify-center gap-2 text-zinc-300 font-mono font-bold text-sm sm:text-base">
                <Clock className="w-4 h-4 text-lime-400" />
                <span>{activePromo.hora.slice(0, 5)} hs</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
              {activePromo.fecha 
                ? 'Tu reserva puntual ya se encuentra confirmada en tu cronograma.'
                : 'Este horario ha sido incorporado a tus turnos fijos semanales.'}
            </p>
          </div>

          {/* Recordatorio de aviso si no asiste */}
          <div className="bg-lime-950/40 border border-lime-900/50 rounded-xl p-3 text-[11px] text-lime-200/90 text-left flex items-start gap-2.5">
            <span className="text-sm shrink-0">💡</span>
            <span>
              <strong>Recordá:</strong> Si sabés que no vas a poder venir, date de baja con tiempo desde tu panel para liberar el lugar a otro compañero.
            </span>
          </div>

          {/* Botón de acción */}
          <button
            onClick={handleDismiss}
            className="w-full py-3.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-lime-400/20 cursor-pointer border-none flex items-center justify-center gap-2"
          >
            <span>¡Excelente, nos vemos ahí!</span>
          </button>
        </div>

      </div>
    </div>
  );
};
