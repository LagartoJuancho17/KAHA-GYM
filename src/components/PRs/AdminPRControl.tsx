// src/components/PRs/AdminPRControl.tsx
import React, { useState, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { useGym } from '../../GymContext';
import { EjercicioPR } from '../../types';
import { SocioPRView } from './SocioPRView';
import { formatearPesoPR } from '../../lib/prs';
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
  ChevronRight
} from 'lucide-react';

export const AdminPRControl: React.FC = () => {
  const {
    clientes,
    ejerciciosPR,
    registrosPR,
    agregarEjercicioPR,
    editarEjercicioPR,
    eliminarEjercicioPR
  } = useGym();
  const baseId = useId();

  const [subTab, setSubTab] = useState<'SOCIOS' | 'CATALOGO'>('SOCIOS');
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
              Control de PRs y Porcentajes de Carga
            </h2>
            <p className="text-xs text-slate-500">
              Visualizá y modificá las marcas personales de cualquier socio o configurá los ejercicios del gimnasio ({ejerciciosActivos.length} activos).
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Secciones de administración de PRs"
          className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            id={`${baseId}-admin-tab-socios`}
            aria-selected={subTab === 'SOCIOS'}
            onClick={() => setSubTab('SOCIOS')}
            className={`relative px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none ${
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
            id={`${baseId}-admin-tab-catalogo`}
            aria-selected={subTab === 'CATALOGO'}
            onClick={() => setSubTab('CATALOGO')}
            className={`relative px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none ${
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
                onClick={() => setSubTab('CATALOGO')}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer bg-transparent border-none"
              >
                Configurar ejercicios →
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

      {/* SUBTAB 2: CATÁLOGO DE EJERCICIOS (5 por defecto + modificables por el Admin) */}
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
