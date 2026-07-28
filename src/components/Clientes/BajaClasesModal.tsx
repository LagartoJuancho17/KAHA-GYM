// src/components/Clientes/BajaClasesModal.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { X, CalendarX, Check, AlertCircle, Calendar, ShieldAlert } from 'lucide-react';

interface BajaClasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

export const BajaClasesModal: React.FC<BajaClasesModalProps> = ({
  isOpen,
  onClose,
  cliente
}) => {
  const { turnos, bajaClasesSocio } = useGym();

  // Selected Month (Default: current month YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [esBajaTemporal, setEsBajaTemporal] = useState<boolean>(true);
  const [selectedFechas, setSelectedFechas] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Month options (current month + 3 upcoming months)
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const val = d.toISOString().slice(0, 7);
      const name = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      opts.push({ value: val, label: name.charAt(0).toUpperCase() + name.slice(1) });
    }
    return opts;
  }, []);

  // Calculate all class dates for the selected client's turnos_fijos in selectedMonth
  const clasesDelMes = useMemo(() => {
    if (!cliente || cliente.turnos_fijos.length === 0) return [];

    const daysMap = { 'DOMINGO': 0, 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3, 'JUEVES': 4, 'VIERNES': 5, 'SABADO': 6 };
    const [year, month] = selectedMonth.split('-').map(Number);
    const dates: { turno_id: string; diaNombre: string; hora: string; fecha: string; yaSuspendida: boolean }[] = [];

    cliente.turnos_fijos.forEach(tfId => {
      const t = turnos.find(turno => turno.id === tfId);
      if (!t) return;

      const targetDay = daysMap[t.dia as keyof typeof daysMap] ?? 1;
      const date = new Date(year, month - 1, 1);

      while (date.getMonth() === month - 1) {
        if (date.getDay() === targetDay) {
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          const fechaStr = `${yyyy}-${mm}-${dd}`;

          const yaSuspendida = (cliente.clases_suspendidas || []).some(s => s.turno_id === tfId && s.fecha === fechaStr);

          dates.push({
            turno_id: tfId,
            diaNombre: t.dia,
            hora: t.hora,
            fecha: fechaStr,
            yaSuspendida
          });
        }
        date.setDate(date.getDate() + 1);
      }
    });

    // Sort by date chronologically
    return dates.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [cliente, selectedMonth, turnos]);

  // Auto-select non-suspended classes when month or client changes
  React.useEffect(() => {
    if (clasesDelMes.length > 0) {
      setSelectedFechas(clasesDelMes.filter(c => !c.yaSuspendida).map(c => `${c.turno_id}_${c.fecha}`));
    } else {
      setSelectedFechas([]);
    }
  }, [clasesDelMes]);

  if (!isOpen || !cliente) return null;

  const toggleSelectAll = () => {
    const disponibles = clasesDelMes.filter(c => !c.yaSuspendida).map(c => `${c.turno_id}_${c.fecha}`);
    if (selectedFechas.length === disponibles.length) {
      setSelectedFechas([]);
    } else {
      setSelectedFechas(disponibles);
    }
  };

  const toggleFecha = (key: string) => {
    setSelectedFechas(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleConfirmBaja = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedFechas.length === 0) {
      setErrorMsg('Debes seleccionar al menos una clase para dar de baja.');
      return;
    }

    const payloadClases = selectedFechas.map(key => {
      const [turno_id, fecha] = key.split('_');
      return { turno_id, fecha };
    });

    const res = bajaClasesSocio(cliente.id, payloadClases, {
      esBajaTemporal,
      exencionCobro: esBajaTemporal ? 'SUSPENDIDO' : 'NINGUNA'
    });

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1800);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight">Aviso de Ausencia / Vacaciones / Viaje</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Socio: <strong className="text-white">{cliente.apellido}, {cliente.nombre}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer border-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY FORM */}
        <form onSubmit={handleConfirmBaja} className="p-6 overflow-y-auto space-y-5 flex-grow text-xs">
          
          {successMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl flex items-center gap-2 font-medium animate-fade-in">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl flex items-center gap-2 font-medium animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MONTH SELECTOR */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">
              1. Selecciona el Mes de la Ausencia
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-400 transition-all cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* BAJA TEMPORAL CHECKBOX */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3">
            <input
              type="checkbox"
              id="chk-baja-temporal"
              checked={esBajaTemporal}
              onChange={(e) => setEsBajaTemporal(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="chk-baja-temporal" className="cursor-pointer select-none">
              <span className="font-bold text-amber-950 block text-xs">Eximir cobro y suspender cobro del mes (Baja Temporal)</span>
              <span className="text-[11px] text-amber-800/80 block mt-0.5 leading-relaxed">
                Al activar esta opción, el socio figurará en estado <strong>SUSPENDIDO</strong> sin generar deuda ni aranceles durante el periodo.
              </span>
            </label>
          </div>

          {/* CLASSES CHECKBOX LIST */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">
                2. Clases programadas en el mes ({selectedFechas.length} de {clasesDelMes.length} seleccionadas)
              </label>
              {clasesDelMes.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer bg-transparent border-none"
                >
                  {selectedFechas.length === clasesDelMes.filter(c => !c.yaSuspendida).length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              )}
            </div>

            {clasesDelMes.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 italic">
                El socio no posee turnos fijos asignados en este mes o no registra horarios semanales.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                {clasesDelMes.map((c) => {
                  const key = `${c.turno_id}_${c.fecha}`;
                  const isChecked = selectedFechas.includes(key);
                  const dateFormatted = new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });

                  return (
                    <div
                      key={key}
                      onClick={() => !c.yaSuspendida && toggleFecha(key)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        c.yaSuspendida 
                          ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' 
                          : isChecked 
                            ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-200' 
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={c.yaSuspendida}
                          onChange={() => {}}
                          className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-900 capitalize block text-xs">{dateFormatted}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{c.hora} hs</span>
                        </div>
                      </div>

                      {c.yaSuspendida ? (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">Ya dada de baja</span>
                      ) : isChecked ? (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">A cancelar</span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Mantener</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={selectedFechas.length === 0}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer border-none"
            >
              <CalendarX className="w-4 h-4" />
              Confirmar Baja de {selectedFechas.length} Clase(s)
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
