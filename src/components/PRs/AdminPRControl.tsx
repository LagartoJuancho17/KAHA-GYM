// src/components/PRs/AdminPRControl.tsx
import React, { useState, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { useGym } from '../../GymContext';
import { EjercicioPR, RutinaTiempoPR, MovimientoRutinaPR } from '../../types';
import { SocioPRView } from './SocioPRView';
import {
  formatearPesoPR,
  formatearFechaRutinaPR,
  obtenerMejorTiempoSegundos
} from '../../lib/prs';
import {
  Dumbbell,
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  Settings2,
  X,
  Check,
  ChevronRight,
  Timer
} from 'lucide-react';

export const AdminPRControl: React.FC = () => {
  const {
    clientes,
    ejerciciosPR,
    registrosPR,
    agregarEjercicioPR,
    editarEjercicioPR,
    eliminarEjercicioPR,
    rutinasPR,
    registrosRutinaPR,
    agregarRutinaPR,
    editarRutinaPR,
    eliminarRutinaPR,
    eliminarTiempoRutinaPR
  } = useGym();
  const baseId = useId();

  const [subTab, setSubTab] = useState<'SOCIOS' | 'RUTINAS' | 'CATALOGO'>('SOCIOS');
  const [searchSocio, setSearchSocio] = useState('');
  const [selectedSocioId, setSelectedSocioId] = useState<string | null>(null);

  // Modal state for adding/editing an exercise in the catalog
  const [editingEjercicio, setEditingEjercicio] = useState<EjercicioPR | null>(null);
  const [isAddingEjercicio, setIsAddingEjercicio] = useState(false);

  const [formNombre, setFormNombre] = useState('');
  const [formCategoria, setFormCategoria] = useState('Fuerza');
  const [formInstruccionTitulo, setFormInstruccionTitulo] = useState('');
  const [formInstruccionDetalle, setFormInstruccionDetalle] = useState('');
  const [formUnidad, setFormUnidad] = useState<'kg' | 'lb'>('kg');
  const [formActivo, setFormActivo] = useState(true);

  // Modal state for adding/editing a Rutina por Tiempo (ej. BULGER)
  const [editingRutina, setEditingRutina] = useState<RutinaTiempoPR | null>(null);
  const [isAddingRutina, setIsAddingRutina] = useState(false);
  const [rutinaTitulo, setRutinaTitulo] = useState('');
  const [rutinaSubtitulo, setRutinaSubtitulo] = useState('Ten rounds for time of:');
  const [rutinaItemsText, setRutinaItemsText] = useState('');
  const [rutinaMovsText, setRutinaMovsText] = useState('');
  const [rutinaAsignadoTodos, setRutinaAsignadoTodos] = useState(true);
  const [rutinaClientesIds, setRutinaClientesIds] = useState<string[]>([]);
  const [searchSocioRutina, setSearchSocioRutina] = useState('');

  const clientesActivos = useMemo(
    () =>
      clientes
        .filter(c => c.activo)
        .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es')),
    [clientes]
  );

  const resultadosBusquedaSocio = useMemo(() => {
    const q = searchSocio.trim().toLowerCase();
    if (!q) return [];
    return clientesActivos
      .filter(
        c =>
          `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
          `${c.apellido} ${c.nombre}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [clientesActivos, searchSocio]);

  const resultadosBusquedaSocioRutina = useMemo(() => {
    const q = searchSocioRutina.trim().toLowerCase();
    if (!q) return [];
    return clientesActivos
      .filter(
        c =>
          !rutinaClientesIds.includes(c.id) &&
          (`${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
            `${c.apellido} ${c.nombre}`.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [clientesActivos, searchSocioRutina, rutinaClientesIds]);

  const socioSeleccionado = useMemo(() => {
    if (selectedSocioId) {
      return clientesActivos.find(c => c.id === selectedSocioId) || clientesActivos[0] || null;
    }
    return clientesActivos[0] || null;
  }, [clientesActivos, selectedSocioId]);

  const ejerciciosOrdenados = useMemo(
    () => [...ejerciciosPR].sort((a, b) => a.orden - b.orden),
    [ejerciciosPR]
  );

  const ejerciciosActivos = useMemo(
    () => ejerciciosOrdenados.filter(e => e.activo),
    [ejerciciosOrdenados]
  );

  const abrirNuevoEjercicio = () => {
    setEditingEjercicio(null);
    setFormNombre('');
    setFormCategoria('Fuerza');
    setFormInstruccionTitulo('');
    setFormInstruccionDetalle('');
    setFormUnidad('kg');
    setFormActivo(true);
    setIsAddingEjercicio(true);
  };

  const abrirEditarEjercicio = (ej: EjercicioPR) => {
    setEditingEjercicio(ej);
    setFormNombre(ej.nombre);
    setFormCategoria(ej.categoria || 'Fuerza');
    setFormInstruccionTitulo(ej.instruccion_titulo || ej.nombre);
    setFormInstruccionDetalle(ej.instruccion_detalle || '');
    setFormUnidad(ej.unidad || 'kg');
    setFormActivo(ej.activo !== false);
    setIsAddingEjercicio(true);
  };

  const handleGuardarEjercicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) return;

    if (editingEjercicio) {
      await editarEjercicioPR(editingEjercicio.id, {
        nombre: formNombre.trim(),
        categoria: formCategoria.trim() || 'Fuerza',
        instruccion_titulo: formInstruccionTitulo.trim() || formNombre.trim(),
        instruccion_detalle: formInstruccionDetalle.trim(),
        unidad: formUnidad,
        activo: formActivo
      });
    } else {
      await agregarEjercicioPR({
        nombre: formNombre.trim(),
        categoria: formCategoria.trim() || 'Fuerza',
        instruccion_titulo: formInstruccionTitulo.trim() || formNombre.trim(),
        instruccion_detalle: formInstruccionDetalle.trim(),
        unidad: formUnidad,
        activo: formActivo
      });
    }
    setIsAddingEjercicio(false);
    setEditingEjercicio(null);
  };

  const abrirNuevaRutina = () => {
    setEditingRutina(null);
    setRutinaTitulo('');
    setRutinaSubtitulo('Ten rounds for time of:');
    setRutinaItemsText(
      'Run 150 meters\n7 Chest to bar pull-ups\n135/95 pound Front squat, 7 reps\n7 Handstand push-ups'
    );
    setRutinaMovsText(
      'Chest-to-Bar Pull-up | 2\nFront Squat | 1\nHandstand Push-Up | 2\nRun | 0'
    );
    setRutinaAsignadoTodos(false);
    setRutinaClientesIds(socioSeleccionado ? [socioSeleccionado.id] : []);
    setSearchSocioRutina('');
    setIsAddingRutina(true);
  };

  const abrirEditarRutina = (rut: RutinaTiempoPR) => {
    setEditingRutina(rut);
    setRutinaTitulo(rut.titulo);
    setRutinaSubtitulo(rut.subtitulo || '');
    setRutinaItemsText((rut.items || []).join('\n'));
    setRutinaMovsText(
      (rut.movimientos || [])
        .map(m => `${m.nombre} | ${m.videos_count}`)
        .join('\n')
    );
    setRutinaAsignadoTodos(rut.asignado_todos);
    setRutinaClientesIds(rut.clientes_ids || []);
    setSearchSocioRutina('');
    setIsAddingRutina(true);
  };

  const handleGuardarRutina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rutinaTitulo.trim()) return;

    const items = rutinaItemsText
      .split('\n')
      .map(l => l.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean);

    const movimientos: MovimientoRutinaPR[] = rutinaMovsText
      .split('\n')
      .map((l, idx) => {
        const [nombreRaw, vidsRaw] = l.split('|');
        const nombre = (nombreRaw || '').trim();
        if (!nombre) return null;
        const count = parseInt((vidsRaw || '0').trim(), 10);
        return {
          id: `mov-${idx}-${Date.now()}`,
          nombre,
          videos_count: Number.isFinite(count) && count >= 0 ? count : 0
        };
      })
      .filter((m): m is MovimientoRutinaPR => m !== null);

    if (editingRutina) {
      await editarRutinaPR(editingRutina.id, {
        titulo: rutinaTitulo.trim().toUpperCase(),
        subtitulo: rutinaSubtitulo.trim(),
        items,
        movimientos,
        asignado_todos: rutinaAsignadoTodos,
        clientes_ids: rutinaClientesIds
      });
    } else {
      await agregarRutinaPR({
        titulo: rutinaTitulo.trim().toUpperCase(),
        subtitulo: rutinaSubtitulo.trim(),
        items,
        movimientos,
        asignado_todos: rutinaAsignadoTodos,
        clientes_ids: rutinaClientesIds,
        activo: true
      });
    }

    setIsAddingRutina(false);
    setEditingRutina(null);
  };

  return (
    <div className="space-y-6 font-sans select-none" id="admin-pr-control">
      {/* TOP BAR */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-lime-300 flex items-center justify-center shrink-0 shadow-xs">
            <Dumbbell className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
              Control de PRs y WODS
            </h2>
            <p className="text-xs text-slate-500">
              Visualizá y modificá las marcas de cualquier socio, creá WODS asignados por tiempo o configurá los ejercicios.
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Secciones de administración de PRs"
          className="flex flex-wrap items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto gap-1"
        >
          <button
            type="button"
            role="tab"
            id={`${baseId}-admin-tab-socios`}
            aria-selected={subTab === 'SOCIOS'}
            onClick={() => setSubTab('SOCIOS')}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none ${
              subTab === 'SOCIOS'
                ? 'bg-white text-zinc-900 shadow-xs after:content-[""] after:absolute after:inset-x-3 after:bottom-0.5 after:border-b-2 after:border-emerald-600'
                : 'bg-transparent text-slate-600 hover:text-zinc-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>PRs por Socio</span>
          </button>

          <button
            type="button"
            role="tab"
            id={`${baseId}-admin-tab-rutinas`}
            aria-selected={subTab === 'RUTINAS'}
            onClick={() => setSubTab('RUTINAS')}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none ${
              subTab === 'RUTINAS'
                ? 'bg-white text-zinc-900 shadow-xs after:content-[""] after:absolute after:inset-x-3 after:bottom-0.5 after:border-b-2 after:border-[#1890ff]'
                : 'bg-transparent text-slate-600 hover:text-zinc-900'
            }`}
          >
            <Timer className="w-4 h-4 text-[#1890ff]" />
            <span>WODS ({rutinasPR.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            id={`${baseId}-admin-tab-catalogo`}
            aria-selected={subTab === 'CATALOGO'}
            onClick={() => setSubTab('CATALOGO')}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none ${
              subTab === 'CATALOGO'
                ? 'bg-white text-zinc-900 shadow-xs after:content-[""] after:absolute after:inset-x-3 after:bottom-0.5 after:border-b-2 after:border-emerald-600'
                : 'bg-transparent text-slate-600 hover:text-zinc-900'
            }`}
          >
            <Settings2 className="w-4 h-4 text-emerald-600" />
            <span>Ejercicios ({ejerciciosOrdenados.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PRs POR SOCIO */}
      {subTab === 'SOCIOS' && (
        <div
          role="tabpanel"
          aria-labelledby={`${baseId}-admin-tab-socios`}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* COLUMNA IZQUIERDA: BUSCADOR Y SOCIO ACTIVO (SOLO 1 SOCIO VISIBLE) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono">
                Buscar Socio
              </h3>
              <button
                type="button"
                onClick={() => setSubTab('RUTINAS')}
                className="text-[11px] font-bold text-[#1890ff] hover:text-sky-700 cursor-pointer bg-transparent border-none"
              >
                Crear / Asignar WOD →
              </button>
            </div>

            <search>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <label htmlFor={`${baseId}-search-socio`} className="sr-only">
                  Buscar socio por nombre o email
                </label>
                <input
                  id={`${baseId}-search-socio`}
                  name="searchSocio"
                  type="search"
                  value={searchSocio}
                  onChange={(e) => setSearchSocio(e.target.value)}
                  placeholder="Escribí nombre o apellido para buscar otro socio..."
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-2 focus:outline-emerald-600"
                />
              </div>
            </search>

            {/* RESULTADOS AL ESCRIBIR EN EL BUSCADOR */}
            {searchSocio.trim().length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 divide-y divide-slate-100 overflow-hidden">
                {resultadosBusquedaSocio.length === 0 ? (
                  <div className="p-3.5 text-center text-xs text-slate-400">
                    No se encontraron socios con "{searchSocio.trim()}".
                  </div>
                ) : (
                  resultadosBusquedaSocio.map((cli) => {
                    const isSelected = socioSeleccionado?.id === cli.id;
                    return (
                      <button
                        key={cli.id}
                        type="button"
                        onClick={() => {
                          setSelectedSocioId(cli.id);
                          setSearchSocio('');
                        }}
                        className={`w-full py-2.5 px-3.5 text-left transition-all cursor-pointer border-none flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-950 font-bold'
                            : 'bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {cli.apellido}, {cli.nombre}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold shrink-0">
                          Seleccionar →
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* ÚNICO SOCIO SELECCIONADO */}
            {socioSeleccionado && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold block">
                      Socio Seleccionado
                    </span>
                    <p className="text-sm font-black text-slate-900">
                      {socioSeleccionado.apellido}, {socioSeleccionado.nombre}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {ejerciciosActivos.slice(0, 5).map((ej) => {
                    const regsSocio = registrosPR.filter(
                      r => r.cliente_id === socioSeleccionado.id
                    );
                    const r = regsSocio.find(x => x.ejercicio_id === ej.id);
                    const val = r?.rm_1;
                    return (
                      <span
                        key={ej.id}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                          val != null && val > 0
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white/90 border-slate-200 text-slate-500'
                        }`}
                      >
                        {ej.nombre}: {formatearPesoPR(val)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: VISTA Y EDICIÓN DE PRs DEL SOCIO SELECCIONADO */}
          <div className="lg:col-span-7">
            {socioSeleccionado ? (
              <SocioPRView socio={socioSeleccionado} />
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-xs text-slate-500">
                Buscá un socio arriba para ver o editar sus PRs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: RUTINAS POR TIEMPO (ADMIN / PROFE CREA RUTINA Y SELECCIONA USUARIOS) */}
      {subTab === 'RUTINAS' && (
        <div
          role="tabpanel"
          aria-labelledby={`${baseId}-admin-tab-rutinas`}
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                WODS Asignados a Socios
              </h3>
              <p className="text-xs text-slate-500">
                Creá un WOD (ej. BULGER), seleccioná los socios que deben realizarlo y consultá en cuánto tiempo lo completaron.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirNuevaRutina}
              className="px-4 py-2.5 rounded-xl bg-[#1890ff] hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer border-none shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Crear WOD y Asignar Socios</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {rutinasPR.map((rut) => {
              const regsRutina = registrosRutinaPR
                .filter(r => r.rutina_id === rut.id)
                .sort((a, b) => a.tiempo_segundos - b.tiempo_segundos);
              const mejorGlobal = obtenerMejorTiempoSegundos(regsRutina);

              return (
                <div
                  key={rut.id}
                  className="rounded-3xl border border-slate-200 overflow-hidden bg-[#f3f4f6] flex flex-col justify-between"
                >
                  <div>
                    {/* Cabecera azul estilo captura */}
                    <div className="bg-[#1890ff] text-white px-5 py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/80 block">
                          {rut.asignado_todos
                            ? 'Asignada a todos los socios'
                            : `Asignada a ${rut.clientes_ids.length} socio(s)`}
                        </span>
                        <h4 className="text-base font-black tracking-wide uppercase m-0">
                          {rut.titulo}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEditarRutina(rut)}
                          className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer border-none"
                          title="Editar rutina y socios asignados"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarRutinaPR(rut.id)}
                          className="p-2 rounded-xl bg-white/15 hover:bg-rose-500 text-white cursor-pointer border-none"
                          title="Eliminar rutina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Descripción de la rutina */}
                    <div className="bg-white p-5 border-b border-slate-200">
                      <p className="text-xs font-bold text-slate-700 mb-1.5">
                        {rut.subtitulo}
                      </p>
                      <ul className="list-none p-0 m-0 space-y-1 text-xs text-slate-700">
                        {rut.items.map((it, i) => (
                          <li key={i}>• {it}</li>
                        ))}
                      </ul>

                      {!rut.asignado_todos && rut.clientes_ids.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                          {rut.clientes_ids.map((cid) => {
                            const cli = clientes.find(c => c.id === cid);
                            if (!cli) return null;
                            return (
                              <span
                                key={cid}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200"
                              >
                                {cli.apellido}, {cli.nombre}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Tiempos completados por los socios */}
                    <div className="px-5 pt-3 pb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        HISTORIA DE TIEMPOS ({regsRutina.length})
                      </span>
                    </div>

                    <div className="bg-white border-t border-slate-200 divide-y divide-slate-100">
                      {regsRutina.length === 0 ? (
                        <div className="px-5 py-4 text-xs text-slate-400">
                          Aún ningún socio cargó su tiempo en {rut.titulo}.
                        </div>
                      ) : (
                        regsRutina.map((reg) => {
                          const cli = clientes.find(c => c.id === reg.cliente_id);
                          const esMejor =
                            mejorGlobal !== null && reg.tiempo_segundos === mejorGlobal;
                          return (
                            <div
                              key={reg.id}
                              className="px-5 py-3 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-900 truncate">
                                  {cli ? `${cli.apellido}, ${cli.nombre}` : 'Socio'} ·{' '}
                                  <span className="font-normal text-slate-500">
                                    {formatearFechaRutinaPR(reg.fecha)}
                                  </span>
                                </div>
                                {reg.nota && (
                                  <div className="text-[11px] text-slate-500 truncate">
                                    {reg.nota}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-bold text-zinc-900 tabular-nums">
                                  {reg.tiempo_texto}
                                </span>
                                {esMejor && (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-300 text-white font-extrabold text-[10px] border-2 border-amber-400">
                                    PR
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => eliminarTiempoRutinaPR(reg.id)}
                                  className="p-1 text-slate-300 hover:text-rose-600 rounded-lg cursor-pointer bg-transparent border-none"
                                  title="Eliminar tiempo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CATÁLOGO DE EJERCICIOS (5 por defecto + modificables por el Admin) */}
      {subTab === 'CATALOGO' && (
        <div
          role="tabpanel"
          aria-labelledby={`${baseId}-admin-tab-catalogo`}
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Catálogo de Ejercicios de PR
              </h3>
              <p className="text-xs text-slate-500">
                Estos son los ejercicios que ven los socios en su apartado de PRs. Podés modificar los 5 base o sumar nuevos.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirNuevoEjercicio}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer border-none shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Ejercicio</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ejerciciosOrdenados.map((ej, idx) => (
              <div
                key={ej.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  ej.activo
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-200/60 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 text-lime-300">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {ej.categoria || 'Fuerza'}
                      </span>
                      {!ej.activo && (
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          Oculto
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-black text-slate-900 mt-1.5">
                      {ej.nombre}{' '}
                      <span className="text-xs font-mono font-normal text-slate-400">
                        ({ej.unidad || 'kg'})
                      </span>
                    </h4>
                    <p className="text-xs font-semibold text-slate-700 mt-1">
                      Instrucción: {ej.instruccion_titulo || ej.nombre}
                    </p>
                    {ej.instruccion_detalle && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {ej.instruccion_detalle}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => abrirEditarEjercicio(ej)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-none"
                      title="Editar ejercicio"
                      aria-label={`Editar ${ej.nombre}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarEjercicioPR(ej.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer bg-transparent border-none"
                      title="Eliminar ejercicio"
                      aria-label={`Eliminar ${ej.nombre}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR / EDITAR RUTINA POR TIEMPO Y SELECCIONAR USUARIOS */}
      {isAddingRutina &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans"
            onClick={() => setIsAddingRutina(false)}
          >
            <div
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 bg-[#1890ff] text-white flex items-center justify-between sticky top-0 z-10">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/80 block">
                    WODS
                  </span>
                  <h3 className="text-sm sm:text-base font-black tracking-tight m-0">
                    {editingRutina ? `Editar WOD: ${editingRutina.titulo}` : 'Nuevo WOD'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingRutina(false)}
                  className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer border-none"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGuardarRutina} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${baseId}-rut-titulo`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Nombre del WOD *
                    </label>
                    <input
                      id={`${baseId}-rut-titulo`}
                      type="text"
                      required
                      value={rutinaTitulo}
                      onChange={(e) => setRutinaTitulo(e.target.value)}
                      placeholder="Ej: BULGER"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 uppercase"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${baseId}-rut-subtitulo`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Encabezado / Modalidad
                    </label>
                    <input
                      id={`${baseId}-rut-subtitulo`}
                      type="text"
                      value={rutinaSubtitulo}
                      onChange={(e) => setRutinaSubtitulo(e.target.value)}
                      placeholder="Ej: Ten rounds for time of:"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`${baseId}-rut-items`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Bloques / Ejercicios de la Rutina (uno por línea)
                  </label>
                  <textarea
                    id={`${baseId}-rut-items`}
                    rows={4}
                    value={rutinaItemsText}
                    onChange={(e) => setRutinaItemsText(e.target.value)}
                    placeholder={'Run 150 meters\n7 Chest to bar pull-ups\n135/95 pound Front squat, 7 reps\n7 Handstand push-ups'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${baseId}-rut-movs`}
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Movimientos (MOVEMENTS) — Formato: Nombre | Cantidad de vídeos
                  </label>
                  <textarea
                    id={`${baseId}-rut-movs`}
                    rows={3}
                    value={rutinaMovsText}
                    onChange={(e) => setRutinaMovsText(e.target.value)}
                    placeholder={'Chest-to-Bar Pull-up | 2\nFront Squat | 1\nHandstand Push-Up | 2\nRun | 0'}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800"
                  />
                </div>

                {/* SELECCIÓN DE USUARIOS ASIGNADOS */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800">
                      Usuarios que deben completar la rutina
                    </span>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rutinaAsignadoTodos}
                        onChange={(e) => setRutinaAsignadoTodos(e.target.checked)}
                        className="w-4 h-4 accent-[#1890ff] rounded"
                      />
                      <span>Asignar a todos los socios</span>
                    </label>
                  </div>

                  {!rutinaAsignadoTodos && (
                    <div className="space-y-2.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="search"
                          value={searchSocioRutina}
                          onChange={(e) => setSearchSocioRutina(e.target.value)}
                          placeholder="Escribí el nombre del socio para asignarlo..."
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
                        />
                      </div>

                      {searchSocioRutina.trim().length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 max-h-36 overflow-y-auto">
                          {resultadosBusquedaSocioRutina.length === 0 ? (
                            <div className="p-2.5 text-xs text-slate-400 text-center">
                              Sin coincidencias
                            </div>
                          ) : (
                            resultadosBusquedaSocioRutina.map((cli) => (
                              <button
                                key={cli.id}
                                type="button"
                                onClick={() => {
                                  setRutinaClientesIds(prev => [...prev, cli.id]);
                                  setSearchSocioRutina('');
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-sky-50 flex items-center justify-between cursor-pointer border-none bg-transparent"
                              >
                                <span>{cli.apellido}, {cli.nombre}</span>
                                <span className="text-[10px] font-mono text-[#1890ff]">+ Agregar</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {rutinaClientesIds.length === 0 ? (
                          <span className="text-[11px] text-amber-700">
                            Buscá y seleccioná al menos 1 socio arriba, o marcá "Asignar a todos".
                          </span>
                        ) : (
                          rutinaClientesIds.map((cid) => {
                            const cli = clientes.find(c => c.id === cid);
                            if (!cli) return null;
                            return (
                              <span
                                key={cid}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1890ff] text-white text-xs font-bold"
                              >
                                <span>{cli.apellido}, {cli.nombre}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRutinaClientesIds(prev => prev.filter(id => id !== cid))
                                  }
                                  className="text-white/80 hover:text-white cursor-pointer bg-transparent border-none p-0 leading-none"
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingRutina(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#1890ff] hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar WOD</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL PARA AGREGAR / EDITAR EJERCICIO DEL CATÁLOGO */}
      {isAddingEjercicio &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans"
            onClick={() => setIsAddingEjercicio(false)}
          >
            <div
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between">
                <h3
                  id={`${baseId}-modal-ej-title`}
                  className="text-sm font-black tracking-tight"
                >
                  {editingEjercicio ? `Editar Ejercicio: ${editingEjercicio.nombre}` : 'Nuevo Ejercicio para PRs'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingEjercicio(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-none"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                aria-labelledby={`${baseId}-modal-ej-title`}
                onSubmit={handleGuardarEjercicio}
                className="p-6 space-y-4"
              >
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`${baseId}-ej-nombre`}
                    className="text-xs font-bold text-slate-700"
                  >
                    Nombre del Ejercicio <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id={`${baseId}-ej-nombre`}
                    name="nombre"
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej: Clean, Back Squat, Bench Press..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={`${baseId}-ej-categoria`}
                      className="text-xs font-bold text-slate-700"
                    >
                      Categoría
                    </label>
                    <input
                      id={`${baseId}-ej-categoria`}
                      name="categoria"
                      type="text"
                      value={formCategoria}
                      onChange={(e) => setFormCategoria(e.target.value)}
                      placeholder="Olímpico / Fuerza"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={`${baseId}-ej-unidad`}
                      className="text-xs font-bold text-slate-700"
                    >
                      Unidad de peso
                    </label>
                    <select
                      id={`${baseId}-ej-unidad`}
                      name="unidad"
                      value={formUnidad}
                      onChange={(e) => setFormUnidad(e.target.value as 'kg' | 'lb')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="lb">Libras (lb)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`${baseId}-ej-inst-titulo`}
                    className="text-xs font-bold text-slate-700"
                  >
                    Título de Instrucción de Movimiento
                  </label>
                  <input
                    id={`${baseId}-ej-inst-titulo`}
                    name="instruccion_titulo"
                    type="text"
                    value={formInstruccionTitulo}
                    onChange={(e) => setFormInstruccionTitulo(e.target.value)}
                    placeholder="Ej: Squat Clean"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`${baseId}-ej-inst-detalle`}
                    className="text-xs font-bold text-slate-700"
                  >
                    Descripción / Guía técnica
                  </label>
                  <textarea
                    id={`${baseId}-ej-inst-detalle`}
                    name="instruccion_detalle"
                    rows={3}
                    value={formInstruccionDetalle}
                    onChange={(e) => setFormInstruccionDetalle(e.target.value)}
                    placeholder="Indicaciones técnicas para el socio..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id={`${baseId}-ej-activo`}
                    name="activo"
                    type="checkbox"
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <label
                    htmlFor={`${baseId}-ej-activo`}
                    className="text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Mostrar ejercicio activo a los socios
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingEjercicio(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer border-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Ejercicio</span>
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
