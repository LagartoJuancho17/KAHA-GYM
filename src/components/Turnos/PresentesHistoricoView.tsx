// src/components/Turnos/PresentesHistoricoView.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { 
  UserCheck, Users, Calendar, Clock, Search, ChevronDown, ChevronUp,
  TrendingUp, Award, Plus, Edit3, Trash2, CheckCircle2, UserX, AlertTriangle, Filter
} from 'lucide-react';
import { hoyArgentina } from '../../lib/fechas';
import {
  leerTodasLasAsistencias,
  calcularMetricasHistoricas,
  eliminarRegistroAsistencia,
  RegistroAsistenciaClase,
  horaAMinutos
} from '../../lib/controlAsistencia';

interface PresentesHistoricoViewProps {
  onAbrirTomarPresentes: (turnoId?: string, fecha?: string) => void;
}

export const PresentesHistoricoView: React.FC<PresentesHistoricoViewProps> = ({
  onAbrirTomarPresentes
}) => {
  const { clientes, turnos, addToast } = useGym();
  const hoyArg = hoyArgentina();

  // Mapa rápido de clientes para lookup por ID
  const clientesMap = useMemo(() => {
    const map = new Map<string, { nombreCompleto: string; email: string; telefono?: string }>();
    clientes.forEach(c => {
      map.set(c.id, {
        nombreCompleto: `${c.nombre} ${c.apellido}`.trim(),
        email: c.email || '',
        telefono: c.telefono || ''
      });
    });
    return map;
  }, [clientes]);

  // Registros cargados
  const [registrosDict, setRegistrosDict] = useState<Record<string, RegistroAsistenciaClase>>(() => {
    return leerTodasLasAsistencias();
  });

  const recargarRegistros = () => {
    setRegistrosDict(leerTodasLasAsistencias());
  };

  // Convertir a lista y ordenar cronológicamente (más recientes primero)
  const listaRegistros = useMemo(() => {
    return Object.values(registrosDict).sort((a, b) => {
      // Comparar por fecha descendente
      if (a.fecha !== b.fecha) {
        return b.fecha.localeCompare(a.fecha);
      }
      // Comparar por hora descendente
      return horaAMinutos(b.hora) - horaAMinutos(a.hora);
    });
  }, [registrosDict]);

  // Filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState<'TODOS' | 'HOY' | 'ESTA_SEMANA' | 'ESTE_MES'>('TODOS');
  const [filtroHorario, setFiltroHorario] = useState<string>('TODOS');
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');

  // ID de clase expandida para ver lista completa
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  // Filtrado de registros
  const registrosFiltrados = useMemo(() => {
    const mesActual = hoyArg.slice(0, 7);
    
    // Cálculo de inicio de semana
    const [y, m, d] = hoyArg.split('-').map(Number);
    const dateHoy = new Date(y, m - 1, d, 12, 0, 0);
    const dayOfWeek = dateHoy.getDay(); // 0 domingo ... 1 lunes
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const lunesDate = new Date(dateHoy);
    lunesDate.setDate(dateHoy.getDate() + diffToMonday);
    const lunesStr = lunesDate.toISOString().slice(0, 10);

    return listaRegistros.filter(r => {
      // 1. Periodo
      if (filtroPeriodo === 'HOY' && r.fecha !== hoyArg) return false;
      if (filtroPeriodo === 'ESTE_MES' && !r.fecha.startsWith(mesActual)) return false;
      if (filtroPeriodo === 'ESTA_SEMANA' && r.fecha < lunesStr) return false;

      // 2. Horario
      if (filtroHorario !== 'TODOS' && r.hora !== filtroHorario) return false;

      // 3. Búsqueda por texto (nombre de socio presente, ausente, notas o profe)
      if (busquedaTexto.trim()) {
        const q = busquedaTexto.toLowerCase().trim();
        const coincideProfe = (r.profesor || '').toLowerCase().includes(q);
        const coincideNotas = (r.notas || '').toLowerCase().includes(q);
        const coincideFecha = r.fecha.includes(q);
        const coincideHora = r.hora.includes(q);

        // Coincidencia con alumnos presentes o ausentes
        const coincideSocioPresente = (r.presentesIds || []).some(id => {
          const cli = clientesMap.get(id);
          return cli?.nombreCompleto.toLowerCase().includes(q);
        });

        const coincideSocioAusente = (r.ausentesIds || []).some(id => {
          const cli = clientesMap.get(id);
          return cli?.nombreCompleto.toLowerCase().includes(q);
        });

        const coincideWalkin = (r.walkins || []).some(w => {
          return w.nombreCompleto.toLowerCase().includes(q);
        });

        if (!coincideProfe && !coincideNotas && !coincideFecha && !coincideHora && !coincideSocioPresente && !coincideSocioAusente && !coincideWalkin) {
          return false;
        }
      }

      return true;
    });
  }, [listaRegistros, filtroPeriodo, filtroHorario, busquedaTexto, hoyArg, clientesMap]);

  // Métricas históricas del conjunto filtrado
  const metricas = useMemo(() => {
    return calcularMetricasHistoricas(registrosFiltrados);
  }, [registrosFiltrados]);

  // Lista de horarios únicos para el filtro
  const horariosDisponibles = useMemo(() => {
    const setH = new Set<string>();
    listaRegistros.forEach(r => {
      if (r.hora) setH.add(r.hora);
    });
    return Array.from(setH).sort((a, b) => horaAMinutos(a) - horaAMinutos(b));
  }, [listaRegistros]);

  // Eliminar un registro puntual
  const handleEliminarRegistro = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta planilla de asistencia guardada?')) {
      eliminarRegistroAsistencia(id);
      recargarRegistros();
      addToast('delete', 'Planilla de asistencia eliminada.');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans text-slate-800" id="presentes-historico-view">
      
      {/* HEADER DE LA SECCIÓN */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-extrabold shadow-xs shrink-0">
              <UserCheck className="w-5 h-5 text-lime-100" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-zinc-900 leading-tight">
                Contabilización de Asistencias
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Historial completo de planillas tomadas, asistencia por clase y socios más activos
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAbrirTomarPresentes()}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer border border-emerald-500/40 shrink-0"
          id="btn-nueva-asistencia-historico"
        >
          <Plus className="w-4 h-4" />
          <span>Tomar Lista de Clase</span>
        </button>
      </div>

      {/* METRICAS / KPIS MINIMALISTAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Clases Controladas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900">{metricas.totalClases}</span>
            <span className="text-xs text-slate-500 font-medium">planillas</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Presentes Totales
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-600">{metricas.totalPresentes}</span>
            <span className="text-xs text-slate-500 font-medium">alumnos</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Promedio x Clase
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-800">{metricas.promedioPresentesPorClase}</span>
            <span className="text-xs text-slate-500 font-medium">alumnos/clase</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
            % Asistencia General
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-sky-700">{metricas.porcentajeGlobal}%</span>
            <span className="text-xs text-slate-500 font-medium">de presentismo</span>
          </div>
        </div>
      </div>

      {/* TOOLBAR DE FILTROS MINIMALISTAS */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Pills de periodo */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
          {(['TODOS', 'HOY', 'ESTA_SEMANA', 'ESTE_MES'] as const).map(p => {
            const activo = filtroPeriodo === p;
            const labels: Record<typeof p, string> = {
              TODOS: 'Todo el Historial',
              HOY: 'Hoy',
              ESTA_SEMANA: 'Esta Semana',
              ESTE_MES: 'Este Mes'
            };
            return (
              <button
                key={p}
                onClick={() => setFiltroPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activo
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Selector de horario + buscador */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          {/* Selector horario */}
          <div className="relative">
            <select
              value={filtroHorario}
              onChange={e => setFiltroHorario(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="TODOS">Todos los horarios</option>
              {horariosDisponibles.map(h => (
                <option key={h} value={h}>{h} hs</option>
              ))}
            </select>
          </div>

          {/* Buscador */}
          <div className="relative w-44 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={busquedaTexto}
              onChange={e => setBusquedaTexto(e.target.value)}
              placeholder="Buscar socio, profe o nota..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 outline-hidden focus:border-slate-400 placeholder:text-slate-400"
            />
          </div>
        </div>

      </div>

      {/* TABLA / LISTA DE PLANILLAS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {registrosFiltrados.length === 0 ? (
          <div className="text-center py-14 px-4 text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No se encontraron registros de asistencia</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {busquedaTexto || filtroPeriodo !== 'TODOS' || filtroHorario !== 'TODOS'
                ? 'Probá ajustando los filtros seleccionados para ver más resultados.'
                : 'Comenzá tomando la lista de la clase actual haciendo clic en "Tomar Lista de Clase".'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {registrosFiltrados.map(r => {
              const estaExpandido = expandidoId === r.id;
              const totalPresentes = (r.presentesIds || []).length;
              const totalAusentes = (r.ausentesIds || []).length;
              const totalInscriptos = totalPresentes + totalAusentes;
              const porcentaje = totalInscriptos > 0 ? Math.round((totalPresentes / totalInscriptos) * 100) : 0;
              const tieneWalkins = (r.walkins || []).length > 0;

              return (
                <div key={r.id} className="transition-colors hover:bg-slate-50/70">
                  
                  {/* Fila principal */}
                  <div
                    onClick={() => setExpandidoId(estaExpandido ? null : r.id)}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    {/* Fecha y Horario */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex flex-col items-center justify-center font-bold shrink-0 border border-slate-200/60">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider leading-none">
                          {r.dia ? r.dia.slice(0, 3) : ''}
                        </span>
                        <span className="text-sm font-extrabold leading-tight mt-0.5">
                          {r.fecha ? r.fecha.slice(8, 10) : ''}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {r.hora} hs
                          </span>
                          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                            · {r.fecha}
                          </span>
                          {r.profesor && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded">
                              Profe: {r.profesor}
                            </span>
                          )}
                          {tieneWalkins && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                              +{r.walkins.length} Walk-in
                            </span>
                          )}
                        </div>

                        {r.notas ? (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 italic">
                            "{r.notas}"
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Guardado por {r.guardadoPor || 'admin'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Presentismo y Acciones */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      {/* Barrita y % de asistencia */}
                      <div className="flex items-center gap-2.5">
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-slate-800 block">
                            {totalPresentes} <span className="text-slate-400 font-normal">/ {totalInscriptos}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {totalAusentes} ausente{totalAusentes !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Badge de porcentaje */}
                        <div className={`px-2 py-1 rounded-lg text-xs font-extrabold ${
                          porcentaje >= 80 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : porcentaje >= 50
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {porcentaje}%
                        </div>
                      </div>

                      {/* Botón editar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAbrirTomarPresentes(r.turnoId, r.fecha);
                        }}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                        title="Abrir o editar planilla de asistencia"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Botón eliminar */}
                      <button
                        type="button"
                        onClick={(e) => handleEliminarRegistro(r.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Chevron expandir */}
                      <div className="text-slate-400">
                        {estaExpandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Detalle desplegable de alumnos */}
                  {estaExpandido && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100 space-y-3 animate-fade-in text-xs">
                      
                      {/* Alumnos Presentes */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                          Presentes ({totalPresentes}):
                        </span>
                        {(r.presentesIds || []).length === 0 ? (
                          <span className="text-slate-400 italic">No hubo presentes marcados</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {r.presentesIds.map(id => {
                              const cli = clientesMap.get(id);
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-800 text-[11px] font-medium shadow-2xs"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>{cli?.nombreCompleto || id}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Alumnos Ausentes */}
                      {totalAusentes > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Ausentes ({totalAusentes}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {r.ausentesIds.map(id => {
                              const cli = clientesMap.get(id);
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 text-[11px]"
                                >
                                  <UserX className="w-3 h-3 text-slate-400" />
                                  <span>{cli?.nombreCompleto || id}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Walk-ins Espontáneos */}
                      {tieneWalkins && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                            Alumnos Espontáneos ({r.walkins.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {r.walkins.map(w => (
                              <span
                                key={w.clienteId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-medium"
                              >
                                <span>{w.nombreCompleto}</span>
                                <span className="text-[9px] bg-indigo-200 px-1 rounded">Walk-in</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observaciones completas */}
                      {r.notas && (
                        <div className="pt-1 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                          <strong className="text-slate-800">Observaciones:</strong> {r.notas}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOP SOCIOS CON MAYOR ASISTENCIA (MINIMALISTA) */}
      {metricas.rankingSocios.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Socios con Mayor Asistencia en este Período
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {metricas.rankingSocios.slice(0, 5).map((item, idx) => {
              const cli = clientesMap.get(item.clienteId);
              return (
                <div
                  key={item.clienteId}
                  className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex items-center gap-2 text-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate text-[11px]">
                      {cli?.nombreCompleto || 'Socio'}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold font-mono">
                      {item.totalPresentes} clase{item.totalPresentes !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

