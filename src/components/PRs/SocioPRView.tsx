// src/components/PRs/SocioPRView.tsx
import React, { useState, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { useGym } from '../../GymContext';
import { Cliente, EjercicioPR, RepMaxKey } from '../../types';
import {
  REP_MAX_KEYS,
  calcularTablaPorcentajes,
  formatearFechaCortaPR,
  formatearPesoPR,
  obtenerPesoPorReps
} from '../../lib/prs';
import { hoyArgentina } from '../../lib/fechas';
import {
  Pencil,
  ChevronRight,
  ChevronDown,
  Dumbbell,
  Trash2,
  X,
  Check,
  Sparkles,
  History,
  Timer
} from 'lucide-react';
import { RutinaTiempoCard } from './RutinaTiempoCard';

interface SocioPRViewProps {
  socio: Cliente;
  compact?: boolean;
}

export const SocioPRView: React.FC<SocioPRViewProps> = ({ socio, compact = false }) => {
  const { ejerciciosPR, registrosPR, rutinasPR, guardarPRSocio, eliminarHistorialPRItem } = useGym();
  const baseId = useId();

  const [modoVista, setModoVista] = useState<'PESOS' | 'RUTINAS'>('PESOS');

  const rutinasAsignadasSocio = useMemo(
    () =>
      rutinasPR.filter(
        r => r.activo && (r.asignado_todos || (r.clientes_ids || []).includes(socio.id))
      ),
    [rutinasPR, socio.id]
  );

  const ejerciciosActivos = useMemo(
    () => [...ejerciciosPR].filter(e => e.activo).sort((a, b) => a.orden - b.orden),
    [ejerciciosPR]
  );

  const [selectedEjercicioId, setSelectedEjercicioId] = useState<string>(
    () => ejerciciosActivos[0]?.id || 'pr-clean'
  );
  const [selectedRepTab, setSelectedRepTab] = useState<RepMaxKey>(1);
  const [showInstruccion, setShowInstruccion] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states inside Edit PRs Modal
  const [formRm1, setFormRm1] = useState('');
  const [formRm2, setFormRm2] = useState('');
  const [formRm3, setFormRm3] = useState('');
  const [formRm5, setFormRm5] = useState('');
  const [formFecha, setFormFecha] = useState(() => hoyArgentina());
  const [formNota, setFormNota] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const ejercicioActual: EjercicioPR | null = useMemo(() => {
    return (
      ejerciciosActivos.find(e => e.id === selectedEjercicioId) ||
      ejerciciosActivos[0] ||
      null
    );
  }, [ejerciciosActivos, selectedEjercicioId]);

  const registroActual = useMemo(() => {
    if (!ejercicioActual) return null;
    const id = `${socio.id}__${ejercicioActual.id}`;
    return (
      registrosPR.find(
        r => r.id === id || (r.cliente_id === socio.id && r.ejercicio_id === ejercicioActual.id)
      ) || null
    );
  }, [registrosPR, socio.id, ejercicioActual]);

  const pesoBaseSeleccionado = useMemo(
    () => obtenerPesoPorReps(registroActual, selectedRepTab),
    [registroActual, selectedRepTab]
  );

  const celdasPorcentajes = useMemo(
    () => calcularTablaPorcentajes(pesoBaseSeleccionado),
    [pesoBaseSeleccionado]
  );

  const abrirModalEdicion = () => {
    setFormRm1(registroActual?.rm_1 != null && registroActual.rm_1 > 0 ? String(registroActual.rm_1) : '');
    setFormRm2(registroActual?.rm_2 != null && registroActual.rm_2 > 0 ? String(registroActual.rm_2) : '');
    setFormRm3(registroActual?.rm_3 != null && registroActual.rm_3 > 0 ? String(registroActual.rm_3) : '');
    setFormRm5(registroActual?.rm_5 != null && registroActual.rm_5 > 0 ? String(registroActual.rm_5) : '');
    setFormFecha(hoyArgentina());
    setFormNota('');
    setIsEditModalOpen(true);
  };

  const handleGuardarPRs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ejercicioActual || isSaving) return;

    const parseVal = (raw: string): number | null => {
      const cleaned = raw.trim().replace(',', '.');
      if (!cleaned) return null;
      const n = Number(cleaned);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    setIsSaving(true);
    try {
      await guardarPRSocio({
        cliente_id: socio.id,
        ejercicio_id: ejercicioActual.id,
        rm_1: parseVal(formRm1),
        rm_2: parseVal(formRm2),
        rm_3: parseVal(formRm3),
        rm_5: parseVal(formRm5),
        fecha: formFecha || hoyArgentina(),
        nota: formNota
      });
      setIsEditModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!ejercicioActual) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-xs text-slate-500">
        No hay ejercicios configurados en el catálogo de PRs.
      </div>
    );
  }

  const unidad = ejercicioActual.unidad || 'kg';

  return (
    <div className="space-y-4 font-sans select-none" id="socio-pr-view">
      {/* HEADER Y SELECTOR DE EJERCICIOS (5 ejercicios base o los configurados por el Admin) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Mis PRs · Marcas y WODS
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                  {unidad.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {modoVista === 'PESOS'
                  ? 'Seleccioná un ejercicio para ver y editar tus RMs y tabla de porcentajes'
                  : 'Completá en cuánto tiempo realizaste los WODS asignados por tu profe'}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Modo de PRs del socio"
            className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modoVista === 'PESOS'}
              onClick={() => setModoVista('PESOS')}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-none ${
                modoVista === 'PESOS'
                  ? 'bg-white text-zinc-900 shadow-xs after:content-[""] after:absolute after:inset-x-3 after:bottom-0.5 after:border-b-2 after:border-emerald-600'
                  : 'bg-transparent text-slate-600 hover:text-zinc-900'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pesos y % RM</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modoVista === 'RUTINAS'}
              onClick={() => setModoVista('RUTINAS')}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-none ${
                modoVista === 'RUTINAS'
                  ? 'bg-white text-zinc-900 shadow-xs after:content-[""] after:absolute after:inset-x-3 after:bottom-0.5 after:border-b-2 after:border-[#1890ff]'
                  : 'bg-transparent text-slate-600 hover:text-zinc-900'
              }`}
            >
              <Timer className="w-3.5 h-3.5 text-[#1890ff]" />
              <span>WODS ({rutinasAsignadasSocio.length})</span>
            </button>
          </div>
        </div>

        {/* TABS DE EJERCICIOS (SOLO EN MODO PESOS) */}
        {modoVista === 'PESOS' && (
          <div
            role="tablist"
            aria-label="Ejercicios de PR"
            className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar"
            style={{ scrollSnapType: 'inline proximity' }}
          >
            {ejerciciosActivos.map((ej) => {
              const isSelected = ej.id === ejercicioActual.id;
              const regEj = registrosPR.find(
                r => r.cliente_id === socio.id && r.ejercicio_id === ej.id
              );
              const best1RM = regEj?.rm_1;

              return (
                <button
                  key={ej.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-ej-${ej.id}`}
                  aria-selected={isSelected}
                  onClick={(e) => {
                    setSelectedEjercicioId(ej.id);
                    setShowInstruccion(false);
                    e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                  }}
                  className={`relative flex-none px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm after:content-[""] after:absolute after:inset-x-3 after:bottom-0 after:border-b-2 after:border-lime-400'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                  }`}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <span>{ej.nombre}</span>
                  {best1RM != null && best1RM > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-extrabold ${
                        isSelected
                          ? 'bg-lime-400/20 text-lime-300'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {formatearPesoPR(best1RM)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* VISTA RUTINAS POR TIEMPO (EJ: BULGER) */}
      {modoVista === 'RUTINAS' ? (
        <RutinaTiempoCard socio={socio} rutinasDisponibles={rutinasAsignadasSocio} />
      ) : (
        /* TARJETA PRINCIPAL ESTILO IMAGEN DE REFERENCIA */
        <div
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-ej-${ejercicioActual.id}`}
          className="max-w-xl mx-auto"
        >
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {/* CABECERA DEL EJERCICIO ACTIVO */}
          <div className="px-6 pt-5 pb-2 flex items-center justify-between border-b border-slate-100">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 font-bold">
                {ejercicioActual.categoria || ' Levantamiento'}
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {ejercicioActual.nombre}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              Unidad: {unidad}
            </span>
          </div>

          {/* 4 COLUMNAS DE REP MAX (1 REP MAX, 2 REP MAX, 3 REP MAX, 5 REP MAX) */}
          <div className="px-4 sm:px-6 pt-6 pb-5">
            <div className="grid grid-cols-4 gap-2 text-center">
              {REP_MAX_KEYS.map((repKey) => {
                const valor = obtenerPesoPorReps(registroActual, repKey);
                const isCurrentRepTab = selectedRepTab === repKey;
                return (
                  <button
                    key={repKey}
                    type="button"
                    onClick={() => setSelectedRepTab(repKey)}
                    className={`py-2 px-1 rounded-2xl transition-all cursor-pointer border bg-transparent ${
                      isCurrentRepTab
                        ? 'border-sky-200 bg-sky-50/40'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight leading-none font-sans">
                      {formatearPesoPR(valor)}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-2">
                      {repKey} REP MAX
                    </div>
                  </button>
                );
              })}
            </div>

            {/* BOTÓN EDIT PRs */}
            <div className="mt-5">
              <button
                type="button"
                onClick={abrirModalEdicion}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
                id="btn-edit-prs"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                <span>Editar PRs</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN PORCENTAJES */}
          <div className="bg-slate-100/80 px-6 py-2.5 border-y border-slate-200/70">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              PORCENTAJES
            </span>
          </div>

          <div className="p-5 sm:p-6">
            {/* CONTROL SEGMENTADO: 1 REP | 2 REP | 3 REP | 5 REP */}
            <div
              role="tablist"
              aria-label="Seleccionar repetición base para porcentajes"
              className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl border border-slate-200/80 mb-6"
            >
              {REP_MAX_KEYS.map((repKey) => {
                const active = selectedRepTab === repKey;
                return (
                  <button
                    key={repKey}
                    type="button"
                    role="tab"
                    id={`${baseId}-rep-tab-${repKey}`}
                    aria-selected={active}
                    onClick={() => setSelectedRepTab(repKey)}
                    className={`relative py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer border-none ${
                      active
                        ? 'bg-white text-zinc-900 shadow-xs after:content-[""] after:absolute after:inset-x-4 after:bottom-0.5 after:border-b-2 after:border-sky-500'
                        : 'bg-transparent text-slate-600 hover:text-zinc-900'
                    }`}
                  >
                    {repKey} REP
                  </button>
                );
              })}
            </div>

            {/* GRILLA 4x4 DE PORCENTAJES (105% a 30%) */}
            <div
              role="tabpanel"
              aria-labelledby={`${baseId}-rep-tab-${selectedRepTab}`}
            >
              {pesoBaseSeleccionado === null && (
                <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 flex items-center justify-between gap-2 text-xs text-amber-900">
                  <span>
                    Aún no cargaste tu <strong>{selectedRepTab} REP MAX</strong> en {ejercicioActual.nombre}.
                  </span>
                  <button
                    type="button"
                    onClick={abrirModalEdicion}
                    className="font-bold underline hover:text-amber-950 cursor-pointer bg-transparent border-none text-xs shrink-0"
                  >
                    Cargar ahora
                  </button>
                </div>
              )}

              <div className="grid grid-cols-4 gap-y-5 gap-x-2 text-center">
                {celdasPorcentajes.map((celda) => (
                  <div
                    key={celda.porcentaje}
                    className={`py-1.5 rounded-xl transition-colors ${
                      celda.esCienPorciento ? 'bg-sky-50/70 ring-1 ring-sky-200/70' : ''
                    }`}
                  >
                    <div className="text-lg sm:text-xl font-black text-zinc-900 leading-tight">
                      {celda.pesoFormateado}
                    </div>
                    <div
                      className={`text-[11px] font-semibold mt-0.5 ${
                        celda.esCienPorciento ? 'text-sky-500 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {celda.porcentaje}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN HISTORIA */}
          <div className="bg-slate-100/80 px-6 py-2.5 border-y border-slate-200/70 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              HISTORIA
            </span>
            {registroActual?.historial && registroActual.historial.length > 0 && (
              <span className="text-[10px] font-mono text-slate-400">
                {registroActual.historial.length} reg.
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {!registroActual?.historial || registroActual.historial.length === 0 ? (
              <div className="px-6 py-5 text-xs text-slate-400 flex items-center justify-between">
                <span>Sin registros históricos en {ejercicioActual.nombre}.</span>
                <button
                  type="button"
                  onClick={abrirModalEdicion}
                  className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer bg-transparent border-none text-xs"
                >
                  + Registrar primer PR
                </button>
              </div>
            ) : (
              registroActual.historial.map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-semibold text-zinc-900">
                      {ejercicioActual.nombre} 1x{item.reps}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatearFechaCortaPR(item.fecha)}
                    </span>
                    {item.nota && (
                      <span className="text-[11px] text-slate-400 truncate">
                        · {item.nota}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base font-bold text-zinc-900 font-sans">
                      {formatearPesoPR(item.peso)}
                    </span>
                    <button
                      type="button"
                      onClick={() => eliminarHistorialPRItem(socio.id, ejercicioActual.id, item.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                      title="Eliminar registro histórico"
                      aria-label={`Eliminar registro de ${item.peso} ${unidad}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* SECCIÓN INSTRUCCIÓN DE MOVIMIENTO */}
          <div className="bg-slate-100/80 px-6 py-2.5 border-y border-slate-200/70">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              INSTRUCCIÓN DE MOVIMIENTO
            </span>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowInstruccion(!showInstruccion)}
              aria-expanded={showInstruccion}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer bg-white border-none"
            >
              <span className="text-sm font-medium text-zinc-800">
                {ejercicioActual.instruccion_titulo || ejercicioActual.nombre}
              </span>
              {showInstruccion ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showInstruccion && (
              <div className="px-6 pb-5 pt-1 text-xs text-slate-600 leading-relaxed bg-slate-50/60 border-t border-slate-100">
                <div className="flex items-start gap-2 pt-3">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    {ejercicioActual.instruccion_detalle ||
                      'Mantené una técnica controlada en todo el rango de movimiento. Consultá con el profesor de turno ante cualquier duda sobre la carga.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* MODAL PARA EDITAR PRs */}
      {isEditModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans"
            onClick={() => setIsEditModalOpen(false)}
          >
            <div
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-lime-300 block">
                    Actualizar Récords Personales
                  </span>
                  <h3
                    id={`${baseId}-edit-pr-title`}
                    className="text-base font-black tracking-tight"
                  >
                    {ejercicioActual.nombre} ({unidad})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-none"
                  aria-label="Cerrar ventana"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                aria-labelledby={`${baseId}-edit-pr-title`}
                onSubmit={handleGuardarPRs}
                className="p-6 space-y-4"
              >
                <fieldset className="border-none p-0 m-0">
                  <legend className="text-xs font-bold text-slate-700 mb-3">
                    Pesos máximos por repeticiones ({unidad})
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`${baseId}-input-1rm`}
                        className="text-[11px] font-bold text-slate-600 uppercase"
                      >
                        1 REP MAX ({unidad})
                      </label>
                      <input
                        id={`${baseId}-input-1rm`}
                        name="rm_1"
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="next"
                        value={formRm1}
                        onChange={(e) => setFormRm1(e.target.value)}
                        placeholder="Ej: 100"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-slate-900 focus:outline-2 focus:outline-emerald-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`${baseId}-input-2rm`}
                        className="text-[11px] font-bold text-slate-600 uppercase"
                      >
                        2 REP MAX ({unidad})
                      </label>
                      <input
                        id={`${baseId}-input-2rm`}
                        name="rm_2"
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="next"
                        value={formRm2}
                        onChange={(e) => setFormRm2(e.target.value)}
                        placeholder="--"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-slate-900 focus:outline-2 focus:outline-emerald-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`${baseId}-input-3rm`}
                        className="text-[11px] font-bold text-slate-600 uppercase"
                      >
                        3 REP MAX ({unidad})
                      </label>
                      <input
                        id={`${baseId}-input-3rm`}
                        name="rm_3"
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="next"
                        value={formRm3}
                        onChange={(e) => setFormRm3(e.target.value)}
                        placeholder="--"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-slate-900 focus:outline-2 focus:outline-emerald-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`${baseId}-input-5rm`}
                        className="text-[11px] font-bold text-slate-600 uppercase"
                      >
                        5 REP MAX ({unidad})
                      </label>
                      <input
                        id={`${baseId}-input-5rm`}
                        name="rm_5"
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="next"
                        value={formRm5}
                        onChange={(e) => setFormRm5(e.target.value)}
                        placeholder="--"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-slate-900 focus:outline-2 focus:outline-emerald-600"
                      />
                    </div>
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={`${baseId}-input-fecha`}
                      className="text-[11px] font-bold text-slate-600 uppercase"
                    >
                      Fecha del registro
                    </label>
                    <input
                      id={`${baseId}-input-fecha`}
                      name="fecha"
                      type="date"
                      value={formFecha}
                      onChange={(e) => setFormFecha(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={`${baseId}-input-nota`}
                      className="text-[11px] font-bold text-slate-600 uppercase"
                    >
                      Nota opcional
                    </label>
                    <input
                      id={`${baseId}-input-nota`}
                      name="nota"
                      type="text"
                      enterKeyHint="done"
                      value={formNota}
                      onChange={(e) => setFormNota(e.target.value)}
                      placeholder="Ej: Con cinturón / RPE 9"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-xs disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSaving ? 'Guardando...' : 'Guardar PRs'}</span>
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
