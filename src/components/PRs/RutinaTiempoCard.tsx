// src/components/PRs/RutinaTiempoCard.tsx
import React, { useState, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { useGym } from '../../GymContext';
import { Cliente, RutinaTiempoPR } from '../../types';
import {
  formatearFechaRutinaPR,
  obtenerMejorTiempoSegundos
} from '../../lib/prs';
import { hoyArgentina } from '../../lib/fechas';
import {
  ChevronLeft,
  Trash2,
  X,
  Check,
  Timer,
  Plus
} from 'lucide-react';

interface RutinaTiempoCardProps {
  socio: Cliente;
  rutinasDisponibles: RutinaTiempoPR[];
}

interface FilaTiempoDraft {
  id: string;
  tiempo: string;
  fecha: string;
  nota: string;
}

export const RutinaTiempoCard: React.FC<RutinaTiempoCardProps> = ({
  socio,
  rutinasDisponibles
}) => {
  const {
    registrosRutinaPR,
    registrarTiempoRutinaPR,
    eliminarTiempoRutinaPR
  } = useGym();
  const baseId = useId();

  const [selectedRutinaId, setSelectedRutinaId] = useState<string>(
    () => rutinasDisponibles[0]?.id || ''
  );
  const [isRegistroModalOpen, setIsRegistroModalOpen] = useState(false);
  const [filasTiempo, setFilasTiempo] = useState<FilaTiempoDraft[]>(() => [
    { id: 'fila-1', tiempo: '', fecha: hoyArgentina(), nota: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const rutinaActual = useMemo(() => {
    return (
      rutinasDisponibles.find(r => r.id === selectedRutinaId) ||
      rutinasDisponibles[0] ||
      null
    );
  }, [rutinasDisponibles, selectedRutinaId]);

  const historialSocioRutina = useMemo(() => {
    if (!rutinaActual) return [];
    return registrosRutinaPR
      .filter(
        r => r.rutina_id === rutinaActual.id && r.cliente_id === socio.id
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado_at.localeCompare(a.creado_at));
  }, [registrosRutinaPR, rutinaActual, socio.id]);

  const mejorTiempoSegundos = useMemo(
    () => obtenerMejorTiempoSegundos(historialSocioRutina),
    [historialSocioRutina]
  );

  const abrirModalRegistro = () => {
    setFilasTiempo([
      {
        id: `fila-${Date.now()}`,
        tiempo: '',
        fecha: hoyArgentina(),
        nota: ''
      }
    ]);
    setIsRegistroModalOpen(true);
  };

  const agregarFilaTiempo = () => {
    setFilasTiempo(prev => [
      ...prev,
      {
        id: `fila-${Date.now()}-${prev.length + 1}`,
        tiempo: '',
        fecha: hoyArgentina(),
        nota: ''
      }
    ]);
  };

  const eliminarFilaTiempo = (id: string) => {
    setFilasTiempo(prev => (prev.length > 1 ? prev.filter(f => f.id !== id) : prev));
  };

  const actualizarFilaTiempo = (
    id: string,
    campo: keyof Omit<FilaTiempoDraft, 'id'>,
    valor: string
  ) => {
    setFilasTiempo(prev =>
      prev.map(f => (f.id === id ? { ...f, [campo]: valor } : f))
    );
  };

  const guardarFilas = async (cerrarAlFinalizar: boolean) => {
    if (!rutinaActual || isSaving) return;

    const filasConTiempo = filasTiempo.filter(f => f.tiempo.trim() !== '');
    if (filasConTiempo.length === 0) return;

    setIsSaving(true);
    try {
      let todasOk = true;
      for (const fila of filasConTiempo) {
        const res = await registrarTiempoRutinaPR({
          rutina_id: rutinaActual.id,
          cliente_id: socio.id,
          tiempo_texto: fila.tiempo,
          fecha: fila.fecha || hoyArgentina(),
          nota: fila.nota
        });
        if (!res.success) {
          todasOk = false;
          break;
        }
      }

      if (todasOk) {
        if (cerrarAlFinalizar) {
          setIsRegistroModalOpen(false);
        } else {
          // Limpiar para seguir cargando otro tiempo inmediatamente
          setFilasTiempo([
            {
              id: `fila-${Date.now()}`,
              tiempo: '',
              fecha: hoyArgentina(),
              nota: ''
            }
          ]);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuardarTiempo = async (e: React.FormEvent) => {
    e.preventDefault();
    await guardarFilas(true);
  };

  if (!rutinaActual) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-xs text-slate-500">
        No tenés WODS asignados en este momento.
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans select-none">
      {/* SELECTOR DE RUTINAS SI HAY MÁS DE UNA ASIGNADA */}
      {rutinasDisponibles.length > 1 && (
        <div
          role="tablist"
          aria-label="Seleccionar rutina asignada"
          className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          {rutinasDisponibles.map((rut) => {
            const active = rut.id === rutinaActual.id;
            return (
              <button
                key={rut.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedRutinaId(rut.id)}
                className={`relative px-4 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer border ${
                  active
                    ? 'bg-[#1890ff] text-white border-[#1890ff] shadow-xs after:content-[""] after:absolute after:inset-x-3 after:bottom-0.5 after:border-b-2 after:border-white'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {rut.titulo}
              </button>
            );
          })}
        </div>
      )}

      {/* TARJETA ESTILO IMAGEN DE REFERENCIA ("BULGER") */}
      <div className="max-w-xl mx-auto bg-[#f3f4f6] border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* BARRA SUPERIOR AZUL (#1890ff): < | TÍTULO | Registro */}
        <div className="bg-[#1890ff] text-white px-4 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (rutinasDisponibles.length > 1) {
                const idx = rutinasDisponibles.findIndex(r => r.id === rutinaActual.id);
                const prev =
                  rutinasDisponibles[(idx - 1 + rutinasDisponibles.length) % rutinasDisponibles.length];
                if (prev) setSelectedRutinaId(prev.id);
              }
            }}
            className="p-1 text-white/95 hover:text-white bg-transparent border-none cursor-pointer flex items-center"
            aria-label="Rutina anterior"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>

          <h3 className="text-base sm:text-lg font-bold tracking-wide uppercase m-0">
            {rutinaActual.titulo}
          </h3>

          <button
            type="button"
            onClick={abrirModalRegistro}
            className="text-sm sm:text-base font-medium text-white hover:text-white/90 bg-transparent border-none cursor-pointer px-1 py-0.5"
          >
            Registro
          </button>
        </div>

        {/* BLOQUE BLANCO DE DESCRIPCIÓN DE LA RUTINA */}
        <div className="bg-white px-5 py-5 border-b border-slate-200/80">
          <h4 className="text-base sm:text-lg font-extrabold text-zinc-900 uppercase tracking-tight mb-1.5">
            {rutinaActual.titulo}
          </h4>
          {rutinaActual.subtitulo && (
            <p className="text-sm sm:text-[15px] text-zinc-700 mb-1.5">
              {rutinaActual.subtitulo}
            </p>
          )}
          <ul className="list-none p-0 m-0 space-y-1 text-sm sm:text-[15px] text-zinc-700 leading-snug">
            {rutinaActual.items.map((linea, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-zinc-700 font-bold">•</span>
                <span>{linea}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SECCIÓN HISTORIA CON BOTÓN VISIBLE PARA CARGAR MÁS TIEMPOS */}
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            HISTORIA ({historialSocioRutina.length})
          </span>
          <button
            type="button"
            onClick={abrirModalRegistro}
            className="text-xs font-bold text-[#1890ff] hover:text-sky-700 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cargar nuevo tiempo</span>
          </button>
        </div>

        <div className="bg-white border-y border-slate-200/80 divide-y divide-slate-100">
          {historialSocioRutina.length === 0 ? (
            <div className="px-5 py-5 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Todavía no registraste tiempos en {rutinaActual.titulo}.
              </span>
              <button
                type="button"
                onClick={abrirModalRegistro}
                className="px-3.5 py-2 rounded-xl bg-[#1890ff] text-white text-xs font-bold border-none cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cargar Tiempo</span>
              </button>
            </div>
          ) : (
            <>
              {historialSocioRutina.map((reg) => {
                const esPR =
                  mejorTiempoSegundos !== null &&
                  reg.tiempo_segundos === mejorTiempoSegundos;

                return (
                  <div
                    key={reg.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm sm:text-[15px] font-medium text-zinc-900">
                        {formatearFechaRutinaPR(reg.fecha)}
                      </div>
                      {reg.nota && (
                        <div className="text-xs text-zinc-500 mt-0.5 truncate">
                          {reg.nota}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-base sm:text-lg font-medium text-zinc-900 tabular-nums">
                        {reg.tiempo_texto}
                      </span>

                      {/* MEDALLA DORADA PR IDÉNTICA A LA CAPTURA */}
                      {esPR && (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-300 text-white font-extrabold text-[11px] tracking-tight shadow-xs border-2 border-amber-400 ring-2 ring-amber-200/80"
                          title="Mejor Tiempo Personal (PR)"
                        >
                          PR
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => eliminarTiempoRutinaPR(reg.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                        title="Eliminar registro de tiempo"
                        aria-label={`Eliminar tiempo ${reg.tiempo_texto}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* FILA INFERIOR PARA AGREGAR OTRO TIEMPO FÁCILMENTE */}
              <div className="px-5 py-3 bg-slate-50/50 flex justify-center">
                <button
                  type="button"
                  onClick={abrirModalRegistro}
                  className="w-full py-2 rounded-xl border border-dashed border-sky-300 hover:border-[#1890ff] bg-sky-50/40 hover:bg-sky-50 text-[#1890ff] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar otro tiempo realizado</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* SECCIÓN MOVEMENTS */}
        {rutinaActual.movimientos && rutinaActual.movimientos.length > 0 && (
          <>
            <div className="px-5 pt-5 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                MOVEMENTS
              </span>
            </div>

            <div className="bg-white border-t border-slate-200/80 divide-y divide-slate-100">
              {rutinaActual.movimientos.map((mov) => (
                <div
                  key={mov.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3"
                >
                  <span className="text-sm sm:text-[15px] font-medium text-zinc-900">
                    {mov.nombre}
                  </span>
                  <span className="text-sm text-zinc-600 tabular-nums">
                    {mov.videos_count} {mov.videos_count === 1 ? 'vídeo' : 'vídeos'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL PARA REGISTRAR UNO O VARIOS TIEMPOS ("Registro") */}
      {isRegistroModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans"
            onClick={() => setIsRegistroModalOpen(false)}
          >
            <div
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 bg-[#1890ff] text-white flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <Timer className="w-5 h-5" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/85 block">
                      Registrar Tiempos del WOD
                    </span>
                    <h3 className="text-base font-black tracking-tight m-0">
                      {rutinaActual.titulo} · {socio.nombre} {socio.apellido}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegistroModalOpen(false)}
                  className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer border-none"
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGuardarTiempo} className="p-6 space-y-4">
                <div className="space-y-3">
                  {filasTiempo.map((fila, index) => (
                    <div
                      key={fila.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                          Tiempo #{index + 1}
                        </span>
                        {filasTiempo.length > 1 && (
                          <button
                            type="button"
                            onClick={() => eliminarFilaTiempo(fila.id)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer bg-transparent border-none"
                          >
                            Quitar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`${baseId}-tiempo-${fila.id}`}
                            className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1"
                          >
                            Tiempo (MM:SS) *
                          </label>
                          <input
                            id={`${baseId}-tiempo-${fila.id}`}
                            type="text"
                            required
                            value={fila.tiempo}
                            onChange={(e) =>
                              actualizarFilaTiempo(fila.id, 'tiempo', e.target.value)
                            }
                            placeholder="Ej: 23:30"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-black text-zinc-900 focus:outline-2 focus:outline-[#1890ff]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`${baseId}-fecha-${fila.id}`}
                            className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1"
                          >
                            Fecha
                          </label>
                          <input
                            id={`${baseId}-fecha-${fila.id}`}
                            type="date"
                            value={fila.fecha}
                            onChange={(e) =>
                              actualizarFilaTiempo(fila.id, 'fecha', e.target.value)
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-zinc-900 focus:outline-2 focus:outline-[#1890ff]"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`${baseId}-nota-${fila.id}`}
                          className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1"
                        >
                          Adaptación / Nota (opcional)
                        </label>
                        <input
                          id={`${baseId}-nota-${fila.id}`}
                          type="text"
                          value={fila.nota}
                          onChange={(e) =>
                            actualizarFilaTiempo(fila.id, 'nota', e.target.value)
                          }
                          placeholder="Ej: Vertical + Push up"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-zinc-900 focus:outline-2 focus:outline-[#1890ff]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOTÓN PARA SUMAR OTRA FILA DE TIEMPO EN EL MISMO MODAL */}
                <button
                  type="button"
                  onClick={agregarFilaTiempo}
                  className="w-full py-2.5 rounded-xl border border-dashed border-sky-300 hover:border-[#1890ff] bg-sky-50/50 hover:bg-sky-50 text-[#1890ff] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Agregar otro tiempo más</span>
                </button>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRegistroModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => guardarFilas(false)}
                    className="px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#1890ff] font-bold text-xs cursor-pointer border border-sky-200 disabled:opacity-50"
                  >
                    Guardar y cargar otro
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-[#1890ff] hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {filasTiempo.length > 1
                        ? `Guardar ${filasTiempo.length} Tiempos`
                        : 'Guardar Tiempo'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
