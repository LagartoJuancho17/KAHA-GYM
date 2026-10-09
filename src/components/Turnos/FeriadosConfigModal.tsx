// src/components/Turnos/FeriadosConfigModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Feriado, TipoFeriado } from '../../types';
import { 
  X, Calendar, Plus, Trash2, Edit2, Megaphone, Check, AlertTriangle, 
  Sparkles, CalendarOff, Clock, Search, ShieldAlert, RefreshCw, CheckSquare, Square
} from 'lucide-react';
import { formatearFechaFeriado, HORAS_GIMNASIO_ESTANDAR } from '../../lib/feriados';
import { hoyArgentina } from '../../lib/fechas';

interface FeriadosConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeriadosConfigModal: React.FC<FeriadosConfigModalProps> = ({ isOpen, onClose }) => {
  const { 
    feriados, agregarFeriado, editarFeriado, eliminarFeriado, 
    toggleFeriadoActivo, cargarFeriadosNacionales, publicarFeriadoComoNovedad 
  } = useGym();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const hoy = hoyArgentina();
    return Number(hoy.split('-')[0]) || 2026;
  });
  const [filterType, setFilterType] = useState<string>('TODOS');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    fecha: string;
    nombre: string;
    tipo: TipoFeriado;
    cerrado: boolean;
    horario_especial: string;
    horas_habilitadas: string[];
    hora_desde: string;
    hora_hasta: string;
    observaciones: string;
    activo: boolean;
  }>({
    fecha: '',
    nombre: '',
    tipo: 'INAMOVIBLE',
    cerrado: true,
    horario_especial: '',
    horas_habilitadas: [],
    hora_desde: '',
    hora_hasta: '',
    observaciones: '',
    activo: true
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifiedId, setNotifiedId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showForm) {
          setShowForm(false);
          setEditingId(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showForm, onClose]);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      fecha: `${selectedYear}-05-01`,
      nombre: '',
      tipo: 'INAMOVIBLE',
      cerrado: true,
      horario_especial: '',
      horas_habilitadas: [],
      hora_desde: '',
      hora_hasta: '',
      observaciones: '',
      activo: true
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (f: Feriado) => {
    setEditingId(f.id);
    setFormData({
      fecha: f.fecha,
      nombre: f.nombre,
      tipo: f.tipo || 'INAMOVIBLE',
      cerrado: f.cerrado,
      horario_especial: f.horario_especial || '',
      horas_habilitadas: Array.isArray(f.horas_habilitadas) ? [...f.horas_habilitadas] : [],
      hora_desde: f.hora_desde || '',
      hora_hasta: f.hora_hasta || '',
      observaciones: f.observaciones || '',
      activo: f.activo
    });
    setFormError(null);
    setShowForm(true);
  };

  // Toggle single hour in special schedule
  const toggleHoraHabilitada = (hora: string) => {
    setFormData(prev => {
      const exists = prev.horas_habilitadas.includes(hora);
      const nextHoras = exists 
        ? prev.horas_habilitadas.filter(h => h !== hora)
        : [...prev.horas_habilitadas, hora].sort();

      // Auto-suggest text if empty or was previously auto-generated
      let nextHorario = prev.horario_especial;
      if (nextHoras.length > 0) {
        if (!nextHorario || nextHorario.includes('hs')) {
          nextHorario = `${nextHoras[0]} a ${nextHoras[nextHoras.length - 1]} hs (${nextHoras.length} turnos)`;
        }
      }
      return {
        ...prev,
        horas_habilitadas: nextHoras,
        horario_especial: nextHorario
      };
    });
  };

  // Preset hours applications
  const aplicarPresetHoras = (preset: 'MANANA' | 'MANANA_REDUCIDA' | 'TARDE' | 'TARDE_REDUCIDA' | 'TODAS' | 'NINGUNA') => {
    let horas: string[] = [];
    let texto = '';

    switch (preset) {
      case 'MANANA':
        horas = ['07:30', '08:30', '09:30', '10:30', '11:30', '12:00'];
        texto = 'Turno Mañana (07:30 a 13:00 hs)';
        break;
      case 'MANANA_REDUCIDA':
        horas = ['09:30', '10:30', '11:30', '12:00'];
        texto = 'Mañana Reducida (09:30 a 13:00 hs)';
        break;
      case 'TARDE':
        horas = ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
        texto = 'Turno Tarde (15:00 a 22:00 hs)';
        break;
      case 'TARDE_REDUCIDA':
        horas = ['16:00', '17:00', '18:00', '19:00'];
        texto = 'Tarde Reducida (16:00 a 20:00 hs)';
        break;
      case 'TODAS':
        horas = [...HORAS_GIMNASIO_ESTANDAR];
        texto = 'Horario Normal Completo';
        break;
      case 'NINGUNA':
        horas = [];
        texto = '';
        break;
    }

    setFormData(prev => ({
      ...prev,
      horas_habilitadas: horas,
      horario_especial: texto
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fecha) {
      setFormError('La fecha es obligatoria.');
      return;
    }
    if (!formData.nombre.trim()) {
      setFormError('El nombre o motivo del feriado es obligatorio.');
      return;
    }

    // Validation for special schedule
    if (!formData.cerrado && formData.horas_habilitadas.length === 0 && !formData.horario_especial.trim()) {
      setFormError('Al seleccionar Horario Especial, debés seleccionar al menos un turno habilitado o especificar el horario.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fecha: formData.fecha,
        nombre: formData.nombre.trim(),
        tipo: formData.tipo,
        cerrado: formData.cerrado,
        horario_especial: formData.cerrado ? '' : formData.horario_especial.trim(),
        horas_habilitadas: formData.cerrado ? [] : formData.horas_habilitadas,
        hora_desde: formData.cerrado ? '' : formData.hora_desde,
        hora_hasta: formData.cerrado ? '' : formData.hora_hasta,
        observaciones: formData.observaciones.trim(),
        activo: formData.activo
      };

      if (editingId) {
        const res = await editarFeriado(editingId, payload);
        if (!res.success) {
          setFormError(res.message);
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await agregarFeriado(payload);
        if (!res.success) {
          setFormError(res.message);
          setIsSubmitting(false);
          return;
        }
      }

      setShowForm(false);
      setEditingId(null);
    } catch (err: any) {
      setFormError(err.message || 'Ocurrió un error al guardar el feriado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCargarOficiales = async () => {
    setIsSubmitting(true);
    try {
      await cargarFeriadosNacionales(selectedYear);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublicarNovedad = async (id: string) => {
    const res = await publicarFeriadoComoNovedad(id);
    if (res.success) {
      setNotifiedId(id);
      setTimeout(() => setNotifiedId(null), 3000);
    }
  };

  // Filtered feriados
  const filteredFeriados = useMemo(() => {
    return feriados
      .filter(f => {
        const matchesYear = f.fecha.startsWith(String(selectedYear));
        const matchesQuery = f.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || f.fecha.includes(searchQuery);
        const matchesType = filterType === 'TODOS' || f.tipo === filterType;
        return matchesYear && matchesQuery && matchesType;
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [feriados, selectedYear, searchQuery, filterType]);

  const hoy = hoyArgentina();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans text-xs">
      <div 
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-feriados-title"
      >
        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <CalendarOff className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-feriados-title" className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Configuración de Feriados y Horarios
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 font-mono">
                  Argentina
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Definí feriados de cierre total o días con <strong>horarios especiales/reducidos</strong>. Los turnos fuera de horario quedan suspendidos y los habilitados permiten entrenar.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent"
            title="Cerrar modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Selector */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <label htmlFor="select-feriados-year" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1.5">Año:</label>
              <select
                id="select-feriados-year"
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-bold text-xs text-slate-800 outline-none cursor-pointer border-none"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[160px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar feriado..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none shadow-2xs"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium outline-none shadow-2xs cursor-pointer"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="INAMOVIBLE">Inamovibles</option>
              <option value="TRASLADABLE">Trasladables</option>
              <option value="PUENTE">Puente Turístico</option>
              <option value="GIMNASIO">Propio del Gimnasio</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Sync National Holidays Button */}
            <button
              onClick={handleCargarOficiales}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title="Cargar o reponer los feriados oficiales de la República Argentina para el año seleccionado"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Cargar Feriados</span> Nacionales {selectedYear}
            </button>

            {/* Add Holiday Button */}
            <button
              onClick={handleOpenNew}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 border-none"
              id="btn-agregar-feriado"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Nuevo Feriado</span>
            </button>
          </div>
        </div>

        {/* MODAL FORM SECTION (DRAWER/EXPANDABLE) */}
        {showForm && (
          <div className="bg-indigo-50/70 border-b border-indigo-100 p-4 sm:p-5 animate-scale-in shrink-0 overflow-y-auto max-h-[60vh]">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  {editingId ? 'Editar Feriado / Horario' : 'Agregar Feriado / Horario Especial'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer border-none bg-transparent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Fecha del Feriado *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={e => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tipo de Feriado
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={e => setFormData(prev => ({ ...prev, tipo: e.target.value as TipoFeriado }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                    >
                      <option value="INAMOVIBLE">Feriado Inamovible</option>
                      <option value="TRASLADABLE">Feriado Trasladable</option>
                      <option value="PUENTE">Feriado Puente Turístico</option>
                      <option value="GIMNASIO">Propio del Gimnasio / Cierre Extraordinario</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nombre o Motivo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Día de la Bandera, Paso a la Inmortalidad, Aniversario KAHA..."
                    value={formData.nombre}
                    onChange={e => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                {/* MODALIDAD DE ATENCIÓN */}
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <span className="block text-[11px] font-bold text-slate-800">
                    Modalidad de Atención en este Feriado
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      formData.cerrado 
                        ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold shadow-2xs ring-1 ring-rose-400/30' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="cerrado_toggle"
                        checked={formData.cerrado}
                        onChange={() => setFormData(prev => ({ ...prev, cerrado: true }))}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-rose-900">🛑 Gimnasio CERRADO</span>
                        <span className="block text-[10px] text-slate-500 font-normal">No se dictan clases en ningún horario durante todo el día.</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      !formData.cerrado 
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-2xs ring-1 ring-amber-400/30' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="cerrado_toggle"
                        checked={!formData.cerrado}
                        onChange={() => setFormData(prev => ({ ...prev, cerrado: false }))}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="block text-xs font-bold text-amber-900">⚡ Horario Especial / Reducido</span>
                        <span className="block text-[10px] text-slate-500 font-normal">Abre en turnos seleccionados; los turnos no elegidos quedan cerrados.</span>
                      </div>
                    </label>
                  </div>

                  {/* SELECTOR DE TURNOS HABILITADOS (CUANDO NO ESTÁ CERRADO) */}
                  {!formData.cerrado && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
                      {/* Presets Rápidos */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Plantillas Rápidas de Horario:</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formData.horas_habilitadas.length} de {HORAS_GIMNASIO_ESTANDAR.length} turnos
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => aplicarPresetHoras('MANANA')}
                            className="px-2 py-1 bg-amber-100/70 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            🌅 Solo Mañana (07:30 a 12:00)
                          </button>
                          <button
                            type="button"
                            onClick={() => aplicarPresetHoras('MANANA_REDUCIDA')}
                            className="px-2 py-1 bg-amber-100/70 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            ☀️ Mañana Reducida (09:30 a 12:00)
                          </button>
                          <button
                            type="button"
                            onClick={() => aplicarPresetHoras('TARDE')}
                            className="px-2 py-1 bg-indigo-100/70 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            🌆 Solo Tarde (15:00 a 21:00)
                          </button>
                          <button
                            type="button"
                            onClick={() => aplicarPresetHoras('TARDE_REDUCIDA')}
                            className="px-2 py-1 bg-indigo-100/70 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            🌆 Tarde Reducida (16:00 a 19:00)
                          </button>
                          <button
                            type="button"
                            onClick={() => aplicarPresetHoras('TODAS')}
                            className="px-2 py-1 bg-emerald-100/70 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            ✓ Todas
                          </button>
                          <button
                            type="button"
                            onClick={() => aplicarPresetHoras('NINGUNA')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            ✕ Limpiar
                          </button>
                        </div>
                      </div>

                      {/* Grilla interactiva de turnos */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-1.5">
                          Seleccioná qué turnos se dictan en este feriado:
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                          {HORAS_GIMNASIO_ESTANDAR.map(hora => {
                            const isChecked = formData.horas_habilitadas.includes(hora);
                            return (
                              <button
                                key={hora}
                                type="button"
                                onClick={() => toggleHoraHabilitada(hora)}
                                className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 select-none ${
                                  isChecked
                                    ? 'bg-emerald-600 text-white border-emerald-600 font-extrabold shadow-2xs scale-102'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 font-semibold opacity-70'
                                }`}
                              >
                                <span className="font-mono text-[11px]">{hora}</span>
                                <span className={`text-[8px] uppercase tracking-wider ${isChecked ? 'text-emerald-100' : 'text-slate-400'}`}>
                                  {isChecked ? 'ABRE' : 'CERRADO'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Texto del Horario Especial */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          Descripción o Frase del Horario (visible para los socios):
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Turno Mañana de 09:30 a 13:00 hs únicamente"
                          value={formData.horario_especial}
                          onChange={e => setFormData(prev => ({ ...prev, horario_especial: e.target.value }))}
                          className="w-full px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Observaciones / Nota adicional (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: No se computan inasistencias para este feriado."
                    value={formData.observaciones}
                    onChange={e => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none shadow-2xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer border-none disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingId ? 'Guardar Cambios' : 'Registrar Feriado'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* HOLIDAYS LIST CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredFeriados.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
              <CalendarOff className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-bold text-xs">
                No se encontraron feriados para los filtros seleccionados ({selectedYear}).
              </p>
              <p className="text-slate-400 text-[11px] mt-1 max-w-sm mx-auto">
                Podés sincronizar los feriados nacionales oficiales de Argentina con un clic o crear uno personalizado.
              </p>
              <button
                onClick={handleCargarOficiales}
                disabled={isSubmitting}
                className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer border-none shadow-2xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cargar Feriados Oficiales de {selectedYear}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFeriados.map(f => {
                const esPasado = f.fecha < hoy;
                const esHoy = f.fecha === hoy;

                let tipoBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                if (f.tipo === 'INAMOVIBLE') tipoBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                else if (f.tipo === 'TRASLADABLE') tipoBadge = 'bg-purple-50 text-purple-700 border-purple-200';
                else if (f.tipo === 'PUENTE') tipoBadge = 'bg-teal-50 text-teal-700 border-teal-200';
                else if (f.tipo === 'GIMNASIO') tipoBadge = 'bg-amber-50 text-amber-700 border-amber-200';

                const turnosHabilitados = Array.isArray(f.horas_habilitadas) ? f.horas_habilitadas : [];

                return (
                  <div
                    key={f.id}
                    className={`rounded-2xl border p-4 transition-all relative flex flex-col justify-between ${
                      !f.activo 
                        ? 'bg-slate-50/70 border-slate-200 opacity-60' 
                        : esHoy 
                          ? 'bg-indigo-50/50 border-indigo-300 shadow-md ring-2 ring-indigo-500/20' 
                          : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${tipoBadge}`}>
                          {f.tipo || 'INAMOVIBLE'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {esHoy && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-600 text-white animate-pulse">
                              ¡HOY!
                            </span>
                          )}
                          {esPasado && (
                            <span className="text-[9px] text-slate-400 font-mono">
                              Pasado
                            </span>
                          )}

                          {/* Toggle Active Switch */}
                          <button
                            onClick={() => toggleFeriadoActivo(f.id)}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border cursor-pointer transition-colors ${
                              f.activo
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={f.activo ? 'Desactivar feriado' : 'Activar feriado'}
                          >
                            {f.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </div>
                      </div>

                      {/* Title & Date */}
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                        {f.nombre}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatearFechaFeriado(f.fecha)}</span>
                        <span className="font-mono text-[10px] text-slate-400">({f.fecha})</span>
                      </p>

                      {/* Gym Status Indicator */}
                      <div className="mt-3 space-y-1.5">
                        {f.cerrado ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10.5px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                            <span>Gimnasio CERRADO (Sin clases)</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10.5px] font-bold">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Horario Especial: {f.horario_especial || `${turnosHabilitados.length} turnos habilitados`}</span>
                            </div>

                            {turnosHabilitados.length > 0 && (
                              <div className="flex flex-wrap gap-1 items-center pt-0.5">
                                <span className="text-[9px] font-bold text-slate-400 mr-0.5">Abren:</span>
                                {turnosHabilitados.map(hora => (
                                  <span key={hora} className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-mono font-bold">
                                    {hora}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {f.observaciones && (
                        <p className="text-[10px] text-slate-500 mt-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{f.observaciones}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handlePublicarNovedad(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                          notifiedId === f.id
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        }`}
                        title="Publicar un comunicado en la cartelera de Novedades de los socios con los horarios exactos"
                      >
                        {notifiedId === f.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>¡Publicado!</span>
                          </>
                        ) : (
                          <>
                            <Megaphone className="w-3 h-3 text-indigo-600" />
                            <span>Avisar a Socios</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(f)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                          title="Editar feriado / modificar horarios"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar el feriado "${f.nombre}"?`)) {
                              eliminarFeriado(f.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                          title="Eliminar feriado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{filteredFeriados.length} feriados en {selectedYear}</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">{filteredFeriados.filter(f => f.activo).length} activos</span>
            <span>•</span>
            <span className="text-amber-700 font-bold">{filteredFeriados.filter(f => f.activo && !f.cerrado).length} con horario especial</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-all cursor-pointer border-none"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
