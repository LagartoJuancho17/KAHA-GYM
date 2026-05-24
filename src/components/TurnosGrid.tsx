// src/components/TurnosGrid.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../GymContext';
import { Turno, Cliente, RecuperoTurno } from '../types';
import { 
  Users, AlertCircle, Plus, Trash2, Calendar, Check, Clock, 
  ArrowRight, ShieldCheck, ListOrdered, Sparkles, RefreshCw, AlertTriangle, X
} from 'lucide-react';

export const TurnosGrid: React.FC = () => {
  const { 
    turnos, clientes, planes, recuperos, agregarRecupero, 
    actualizarEstadoRecupero, asignarClienteFijo, removerAsignacionFija, 
    checkInFlexible, modificarPrecioOCupoTurno, rolActivo, asignarTurnoVariable 
  } = useGym();

  const [subTab, setSubTab] = useState<'GRILLA' | 'RECUPEROS' | 'TIEMPO_REAL'>('GRILLA');
  const [activeDayRealtime, setActiveDayRealtime] = useState<'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES'>('LUNES');
  const [assignRealtimeClientMap, setAssignRealtimeClientMap] = useState<Record<string, string>>({});
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [realtimeSuccess, setRealtimeSuccess] = useState<string | null>(null);

  // --- CELL SELECTION STATE ---
  const [selectedTurnoId, setSelectedTurnoId] = useState<string | null>(null);
  const [selectedClientToAssignId, setSelectedClientToAssignId] = useState<string>('');
  const [nuevoCupoMaximo, setNuevoCupoMaximo] = useState<string>('');
  const [cellActionError, setCellActionError] = useState('');
  const [cellActionSuccess, setCellActionSuccess] = useState('');

  // --- CHECKIN FLEXIBLE LOGIC STATE ---
  const [flexCheckInClientId, setFlexCheckInClientId] = useState('');

  // --- FORM RECUPEROS STATE ---
  const [recuperoForm, setRecuperoForm] = useState({
    cliente_id: '',
    turno_original_id: '',
    fecha_inasistencia: '',
    turno_recupero_id: '',
    fecha_recupero: ''
  });
  const [recIndexError, setRecIndexError] = useState('');
  const [recIndexSuccess, setRecIndexSuccess] = useState('');

  // List of Weekdays
  const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const;

  // Predefined hours rows
  const HORAS = [
    '07:30', '08:30', '09:30', '10:30', '11:00', '12:00', 
    '15:00', // Only rendered for Mar/Jue/Vie, for remaining days is empty space to align perfectly
    '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  // Active Fijo / Flexible clients helpers
  const clientesActivos = useMemo(() => clientes.filter(c => c.activo), [clientes]);
  const clientesFijos = useMemo(() => clientesActivos.filter(c => c.tipo === 'FIJO'), [clientesActivos]);
  const clientesFlexibles = useMemo(() => clientesActivos, [clientesActivos]);

  // Retrieve current selected turno object
  const selectedTurno = useMemo(() => {
    return turnos.find(t => t.id === selectedTurnoId) || null;
  }, [turnos, selectedTurnoId]);

  // Trigger Open cell
  const handleSelectCell = (turnoId: string) => {
    setSelectedTurnoId(turnoId);
    setCellActionError('');
    setCellActionSuccess('');
    setSelectedClientToAssignId('');
    setFlexCheckInClientId('');
    const t = turnos.find(x => x.id === turnoId);
    if (t) setNuevoCupoMaximo(t.cupo_maximo.toString());
  };

  // Assign Fijo handler
  const handleAssignFijo = (e: React.FormEvent) => {
    e.preventDefault();
    setCellActionError('');
    setCellActionSuccess('');

    if (!selectedTurnoId || !selectedClientToAssignId) {
      setCellActionError('Selecciona un alumno para asignarlo.');
      return;
    }

    const res = asignarClienteFijo(selectedClientToAssignId, selectedTurnoId);
    if (res.success) {
      setCellActionSuccess(res.message);
      setSelectedClientToAssignId('');
      setTimeout(() => setCellActionSuccess(''), 2000);
    } else {
      setCellActionError(res.message);
    }
  };

  // CheckIn Flexible helper
  const handleFlexCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    setCellActionError('');
    setCellActionSuccess('');

    if (!selectedTurnoId || !flexCheckInClientId) return;

    const res = checkInFlexible(flexCheckInClientId, selectedTurnoId);
    if (res.success) {
      setCellActionSuccess(res.message);
      setFlexCheckInClientId('');
      setTimeout(() => setCellActionSuccess(''), 2500);
    } else {
      setCellActionError(res.message);
    }
  };

  // Change Capacity Handler
  const handleSaveCupo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurnoId) return;

    const parsedCupo = parseInt(nuevoCupoMaximo);
    if (isNaN(parsedCupo) || parsedCupo <= 0) {
      setCellActionError('El cupo de asistencia debe ser una cantidad numérica mayor a 0.');
      return;
    }

    modificarPrecioOCupoTurno(selectedTurnoId, parsedCupo);
    setCellActionSuccess(`Capacidad máxima actualizada a ${parsedCupo} cupos.`);
    setTimeout(() => setCellActionSuccess(''), 1500);
  };

  // Save Absence and Recupero
  const handleSaveRecupero = (e: React.FormEvent) => {
    e.preventDefault();
    setRecIndexError('');
    setRecIndexSuccess('');

    const { cliente_id, turno_original_id, fecha_inasistencia, turno_recupero_id, fecha_recupero } = recuperoForm;

    if (!cliente_id || !turno_original_id || !fecha_inasistencia || !turno_recupero_id || !fecha_recupero) {
      setRecIndexError('Por favor complete todos los datos del formulario de inasistencia y recupero.');
      return;
    }

    const clientObj = clientes.find(c => c.id === cliente_id);
    if (!clientObj) return;

    const res = agregarRecupero({
      cliente_id,
      cliente_nombre: `${clientObj.nombre} ${clientObj.apellido}`,
      turno_original_id,
      fecha_inasistencia,
      turno_recupero_id,
      fecha_recupero
    });

    if (res.success) {
      setRecIndexSuccess(res.message);
      setRecuperoForm({
        cliente_id: '',
        turno_original_id: '',
        fecha_inasistencia: '',
        turno_recupero_id: '',
        fecha_recupero: ''
      });
      setTimeout(() => setRecIndexSuccess(''), 2500);
    } else {
      setRecIndexError(res.message);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" id="turnos-schedulers-tab-panel">
      
      {/* SECCIÓN CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Sistema de Horarios</h2>
          <p className="text-zinc-500 font-sans text-sm">Organiza turnos de asistencia, lista de espera dinámica y recuperos de inasistencias</p>
        </div>

        {/* SUB TOOGLE */}
        <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 flex-wrap gap-1">
          <button
            onClick={() => setSubTab('GRILLA')}
            className={`px-3 py-1.5 rounded-md transition-all font-medium text-xs cursor-pointer ${
              subTab === 'GRILLA'
                ? 'bg-white text-zinc-950 shadow-sm font-semibold'
                : 'text-zinc-500 hover:text-zinc-950'
            }`}
            id="subtab-grilla-trigger"
          >
            Matriz Fija Semanal
          </button>
          <button
            onClick={() => setSubTab('TIEMPO_REAL')}
            className={`px-3 py-1.5 rounded-md transition-all font-medium text-xs cursor-pointer ${
              subTab === 'TIEMPO_REAL'
                ? 'bg-white text-zinc-900 shadow-sm font-bold'
                : 'text-zinc-500 hover:text-zinc-950'
            }`}
            id="subtab-tiemporeal-trigger"
          >
            Turnera de Tiempo Real
          </button>
          <button
            onClick={() => setSubTab('RECUPEROS')}
            className={`px-3 py-1.5 rounded-md transition-all font-medium text-xs cursor-pointer ${
              subTab === 'RECUPEROS'
                ? 'bg-white text-zinc-950 shadow-sm font-semibold'
                : 'text-zinc-500 hover:text-zinc-950'
            }`}
            id="subtab-recuperos-trigger"
          >
            Gestión de Recuperos
          </button>
        </div>
      </div>

      {subTab === 'GRILLA' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* MATRIX GRILLA DE TURNOS */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs xl:col-span-3 space-y-4">
            
            {/* INSTRUCCION LEYENDA */}
            <div className="flex justify-between items-center bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs text-zinc-600 font-sans">
              <span className="font-semibold text-zinc-800">Haz clic en cualquier celda para administrar el turno semanal: fijos, flexibles, lista de espera o cupo máximo.</span>
              
              {/* LEYENDAS COLORES */}
              <div className="hidden sm:flex items-center gap-4 font-bold text-[9px] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Libre (&lt;70%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Saturación (70-90%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span>Lleno (&gt;=90%)</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto select-none rounded-lg border border-zinc-200">
              <table className="w-full text-center border-collapse text-xs table-fixed min-w-[700px]">
                <thead>
                  <tr className="bg-zinc-900 text-white font-sans font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 border-r border-zinc-800 w-16">Hora</th>
                    {DIAS.map(d => (
                      <th key={d} className="p-3 border-r border-zinc-800">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {HORAS.map(hora => {
                    return (
                      <tr key={hora} className="hover:bg-zinc-50/50 transition-colors font-sans">
                        {/* HORA LABEL */}
                        <td className="p-3 bg-zinc-50 font-bold border-r border-zinc-200 text-zinc-700 font-mono text-center">
                          {hora}
                        </td>

                        {/* CELDA DÍAS */}
                        {DIAS.map(dia => {
                          const idTurno = `${dia}-${hora}`;
                          const slotTurno = turnos.find(t => t.id === idTurno);

                          // Si es 15:00 pero no es Martes / Jueves / Viernes, pintar vacío
                          if (hora === '15:00' && dia !== 'MARTES' && dia !== 'JUEVES' && dia !== 'VIERNES') {
                            return (
                              <td key={dia} className="p-2 border-r border-zinc-200 bg-zinc-50/20 text-zinc-400 italic font-medium text-[10px] text-center">
                                —
                              </td>
                            );
                          }

                          if (!slotTurno) {
                            return <td key={dia} className="p-2 border-r border-zinc-200 text-zinc-300">-</td>;
                          }

                          const fijosCount = slotTurno.asignados_ids.length;
                          const ratio = slotTurno.cupo_maximo > 0 ? (fijosCount / slotTurno.cupo_maximo) * 100 : 0;

                          // Color logic required:
                          // verde < 70%, amarillo 70-90%, rojo >= 90%
                          let blockColorClass = 'bg-emerald-50 hover:bg-emerald-100/50 text-emerald-800 border-emerald-100 hover:border-emerald-300';
                          let pillColorClass = 'bg-emerald-500 text-white';

                          if (ratio >= 70 && ratio < 90) {
                            blockColorClass = 'bg-amber-50 hover:bg-amber-100/50 text-amber-800 border-amber-100 hover:border-amber-300';
                            pillColorClass = 'bg-amber-500 text-black';
                          } else if (ratio >= 90) {
                            blockColorClass = 'bg-red-50 hover:bg-red-100/50 text-red-800 border-red-100 hover:border-red-300';
                            pillColorClass = 'bg-red-500 text-white';
                          }

                          const isSelected = selectedTurnoId === idTurno;

                          return (
                            <td 
                              key={dia} 
                              onClick={() => handleSelectCell(idTurno)}
                              className={`p-2.5 border-r border-zinc-200 cursor-pointer transition-all border-2 ${blockColorClass} ${
                                isSelected ? 'ring-2 ring-black border-transparent relative z-10 shadow-lg' : ''
                              }`}
                              title={`Hacer clic para gestionar el turno ${idTurno}`}
                            >
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="font-bold text-xs font-mono">{fijosCount} / {slotTurno.cupo_maximo}</span>
                                <div className="text-[9px] font-sans opacity-75 font-semibold">Vacantes: {slotTurno.cupo_maximo - fijosCount}</div>
                                {slotTurno.lista_espera_ids.length > 0 && (
                                  <div className="mt-1 bg-zinc-900 text-lime-400 font-bold px-1 rounded-sm text-[8px] font-sans">
                                    W: {slotTurno.lista_espera_ids.length}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL DE CONTROL DERECHO (SELECTION ACTIONS) */}
          <div className="space-y-6">
            
            {selectedTurno ? (
              <div className="bg-white border-2 border-zinc-950 p-5 rounded-xl shadow-lg space-y-6 animate-fade-in font-sans text-xs">
                
                {/* Cabecera del Turno Seleccionado */}
                <div className="border-b border-zinc-100 pb-3 flex justify-between items-start">
                  <div>
                    <h3 className="text-zinc-950 font-bold text-sm tracking-tight flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-zinc-900" />
                      {selectedTurno.dia}
                    </h3>
                    <p className="text-zinc-500 font-medium text-[11px] mt-0.5">Turno asignado de las <strong>{selectedTurno.hora}hs</strong></p>
                  </div>
                  <button 
                    onClick={() => setSelectedTurnoId(null)}
                    className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-950"
                  >
                    <Trash2 className="w-4 h-4" title="Quitar Selección" />
                  </button>
                </div>

                {cellActionError && (
                  <div className="bg-red-50 text-red-700 p-2.5 rounded-lg font-medium border border-red-200 text-[11px]">
                    {cellActionError}
                  </div>
                )}

                {cellActionSuccess && (
                  <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-medium border border-emerald-250 text-[11px]">
                    {cellActionSuccess}
                  </div>
                )}

                {/* EDIT CUPO MAXIMO (strictly editable without losing assignments) */}
                <form onSubmit={handleSaveCupo} className="bg-zinc-50 p-3 rounded-lg border border-zinc-200/60 space-y-2">
                  <label className="font-bold text-[10px] text-zinc-600 uppercase tracking-wider block">Capacidad de Cupo Máximo</label>
                  <p className="text-[10px] text-zinc-400 leading-normal">Puedes aumentar o reducir el cupo del horario sin comprometer los socios que ya están asignados.</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min="1"
                      value={nuevoCupoMaximo}
                      onChange={(e) => setNuevoCupoMaximo(e.target.value)}
                      className="border border-zinc-300 rounded-lg p-1.5 w-20 text-center font-mono font-bold bg-white outline-hidden text-xs"
                    />
                    <button
                      type="submit"
                      className="flex-1 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold py-1.5"
                    >
                      Actualizar Cupo
                    </button>
                  </div>
                </form>

                {/* LISTADO DE SOCIOS FIJOS REGISTRADOS */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest font-sans">Miembros Fijos Asignados ({selectedTurno.asignados_ids.length})</h4>
                  {selectedTurno.asignados_ids.length === 0 ? (
                    <p className="text-zinc-400 italic text-[11px]">Este turno no registra alumnos fijos asignados aún.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {selectedTurno.asignados_ids.map(cId => {
                        const cl = clientes.find(c => c.id === cId);
                        if (!cl) return null;
                        return (
                          <div key={cl.id} className="flex justify-between items-center p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                            <span className="font-semibold text-zinc-900">{cl.apellido}, {cl.nombre}</span>
                            <button
                              onClick={() => removerAsignacionFija(cId, selectedTurno.id)}
                              className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded-sm border border-red-100"
                              title="Remover asignación permanente"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* LISTA DE ESPERA */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-zinc-400" />
                    <h4 className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest font-sans">Lista de Espera ({selectedTurno.lista_espera_ids.length})</h4>
                  </div>
                  {selectedTurno.lista_espera_ids.length === 0 ? (
                    <p className="text-zinc-400 italic text-[11px]">No hay nadie en lista de espera.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedTurno.lista_espera_ids.map((cId, idx) => {
                        const cl = clientes.find(c => c.id === cId);
                        if (!cl) return null;
                        return (
                          <div key={cl.id} className="flex justify-between items-center p-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                            <span className="font-mono text-[10px] bg-amber-100 text-amber-800 px-1 rounded-sm font-bold">P{idx + 1}</span>
                            <span className="font-semibold text-zinc-800 flex-1 ml-2">{cl.nombre} {cl.apellido}</span>
                            <button
                              onClick={() => removerAsignacionFija(cId, selectedTurno.id)}
                              className="text-zinc-400 hover:text-zinc-800"
                              title="Retirar de waitlist"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* AGREGAR NUEVO SOCIO FIJO HASTA LIMITE CUPO */}
                <form onSubmit={handleAssignFijo} className="border-t border-zinc-100 pt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest block font-sans">Asignar Socio Fijo Permanente</label>
                    <select
                      value={selectedClientToAssignId}
                      onChange={(e) => setSelectedClientToAssignId(e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden"
                    >
                      <option value="">-- Elige un socio fijo --</option>
                      {clientesFijos
                        // Filtrar los que ya están en este turno o tienen cubiertos días de plan
                        .filter(c => !c.turnos_fijos.includes(selectedTurno.id))
                        .map(cl => {
                          const clPlan = planes.find(p => p.id === cl.plan_id);
                          return (
                            <option key={cl.id} value={cl.id}>
                              {cl.apellido}, {cl.nombre} ({cl.turnos_fijos.length}/{clPlan?.dias_por_semana} días max)
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Asignar Horario Fijo
                  </button>
                </form>

                {/* SIMULACIÓN ASISTENCIA FOCALIZADA CLIENTE FLEXIBLE */}
                <form onSubmit={handleFlexCheckIn} className="border-t border-zinc-100 pt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest block font-sans">Asistencia de Alumno Flexible (Check-In)</label>
                    <p className="text-[10px] text-zinc-400 leading-normal">Los alumnos flexibles asisten temporalmente si el turno seleccionado tiene cupo el día de la cursada.</p>
                    <select
                      value={flexCheckInClientId}
                      onChange={(e) => setFlexCheckInClientId(e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden"
                    >
                      <option value="">-- Elige alumno flexible --</option>
                      {clientesFlexibles.map(cl => (
                        <option key={cl.id} value={cl.id}>
                          {cl.apellido}, {cl.nombre} (Abono {planes.find(p => p.id === cl.plan_id)?.nombre})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
                    Registrar Check-In Diario
                  </button>
                </form>

              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-250 p-6 rounded-xl text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                <Calendar className="w-10 h-10 text-zinc-400 mb-3" />
                <h3 className="font-sans font-bold text-zinc-700 text-sm">Sin Selección Activa</h3>
                <p className="text-zinc-500 text-xs mt-1 leading-relaxed">Haz clic sobre cualquier horario en la grilla para ver socios asignados, dar altas, modificar cupos o procesar asistencias.</p>
              </div>
            )}

          </div>

        </div>
      )}

      {subTab === 'TIEMPO_REAL' && (
        <div className="space-y-6 animate-fade-in font-sans text-xs">
          
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest font-mono">Consola de Control</span>
                <h3 className="text-lg font-bold tracking-tight text-white mt-1">Turnera de Tiempo Real (Día por Día)</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Permite observar la combinación de <strong>socios fijos</strong> contratados y de <strong>socios variables</strong> que reservan en tiempo real, con control total para liberar o reasignar cupos.
                </p>
              </div>

              {/* LEYENDAS */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-350 font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-sky-500 rounded-xs inline-block"></span> Fijos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-violet-500 rounded-xs inline-block"></span> Variables
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs inline-block"></span> Cupo Completo
                </span>
              </div>
            </div>
          </div>

          {realtimeError && (
            <div className="bg-rose-50 border border-rose-250 text-rose-800 px-4 py-3 rounded-xl font-semibold text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{realtimeError}</span>
            </div>
          )}

          {realtimeSuccess && (
            <div className="bg-emerald-50 border border-emerald-250 text-emerald-850 px-4 py-3 rounded-xl font-semibold text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{realtimeSuccess}</span>
            </div>
          )}

          {/* BARRA SEGMENTADA DE DIA */}
          <div className="grid grid-cols-5 bg-zinc-100 p-1 rounded-xl border border-zinc-200 gap-1 max-w-xl">
            {(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const).map(dia => {
              const isActive = activeDayRealtime === dia;
              return (
                <button
                  key={dia}
                  onClick={() => {
                    setActiveDayRealtime(dia);
                    setRealtimeError(null);
                    setRealtimeSuccess(null);
                  }}
                  className={`py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-zinc-900 text-white shadow-xs' 
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
                  }`}
                >
                  {dia === 'MIERCOLES' ? 'MIÉRCOLES' : dia}
                </button>
              );
            })}
          </div>

          {/* GRID OF Realtime Slots for this day */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="realtime-slots-container">
            {turnos.filter(t => t.dia === activeDayRealtime).length === 0 ? (
              <div className="md:col-span-2 text-center py-12 bg-white border border-zinc-200 rounded-xl italic text-slate-400">
                No hay horarios de gimnasio cargados para este día.
              </div>
            ) : (
              turnos
                .filter(t => t.dia === activeDayRealtime)
                .map(turno => {
                  const fijos = (turno.asignados_ids || []).map(id => clientes.find(c => c.id === id)).filter(Boolean) as Cliente[];
                  const variables = clientes.filter(c => c.activo && c.turno_variable === turno.id);
                  const totalOccupied = fijos.length + variables.length;
                  const isFull = totalOccupied >= turno.cupo_maximo;

                  // Candidates: active, don't have this turno as fijo context, don't have this turno as variable already
                  const candidateClients = clientes.filter(c => {
                    return c.activo && 
                      !c.turnos_fijos.includes(turno.id) && 
                      c.turno_variable !== turno.id;
                  });

                  const selectedCandId = assignRealtimeClientMap[turno.id] || '';

                  const handleAssignFromRealtime = (e: React.FormEvent) => {
                    e.preventDefault();
                    if (!selectedCandId) return;

                    setRealtimeError(null);
                    setRealtimeSuccess(null);

                    const res = asignarTurnoVariable(selectedCandId, turno.id);
                    if (res.success) {
                      setRealtimeSuccess(res.message);
                      setAssignRealtimeClientMap(prev => ({ ...prev, [turno.id]: '' }));
                      setTimeout(() => setRealtimeSuccess(null), 3500);
                    } else {
                      setRealtimeError(res.message);
                    }
                  };

                  const handleReleaseFromRealtime = (clienteId: string) => {
                    setRealtimeError(null);
                    setRealtimeSuccess(null);

                    const res = asignarTurnoVariable(clienteId, null);
                    if (res.success) {
                      setRealtimeSuccess(res.message);
                      setTimeout(() => setRealtimeSuccess(null), 3000);
                    } else {
                      setRealtimeError(res.message);
                    }
                  };

                  return (
                    <div 
                      key={turno.id} 
                      className={`bg-white border rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between transition-all ${
                        isFull ? 'border-rose-200 hover:border-rose-300' : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${isFull ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            <Clock className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-zinc-900">{turno.hora} hs</p>
                            <p className="text-[10px] text-zinc-400 font-mono">Cupo total: {turno.cupo_maximo}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            isFull ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-zinc-100 text-zinc-800'
                          }`}>
                            Ocupación: {totalOccupied} / {turno.cupo_maximo}
                          </span>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            Disponibles: {Math.max(0, turno.cupo_maximo - totalOccupied)}
                          </p>
                        </div>
                      </div>

                      {/* MEMBRESÍAS FIJAS O VARIABLES */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                        {/* FIJOS */}
                        <div className="bg-sky-50/30 border border-sky-100 p-2.5 rounded-lg space-y-2">
                          <span className="text-[10px] font-bold text-sky-850 uppercase tracking-wide block">Fijos en este Horario ({fijos.length})</span>
                          {fijos.length === 0 ? (
                            <span className="text-[10px] italic text-slate-400 block pb-1">Ninguno</span>
                          ) : (
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                              {fijos.map(f => (
                                <div key={f.id} className="bg-sky-50/80 border border-sky-100 text-sky-950 font-bold px-2 py-1 rounded text-[10px] flex justify-between items-center">
                                  <span className="truncate">{f.apellido}, {f.nombre}</span>
                                  <span className="text-[8px] bg-sky-200/60 text-sky-800 px-1 py-0.2 rounded font-extrabold uppercase">Fijo</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* VARIABLES HOY */}
                        <div className="bg-violet-50/30 border border-violet-100 p-2.5 rounded-lg space-y-2">
                          <span className="text-[10px] font-bold text-violet-850 uppercase tracking-wide block">Reservas Variables ({variables.length})</span>
                          {variables.length === 0 ? (
                            <span className="text-[10px] italic text-slate-400 block pb-1">Ninguno</span>
                          ) : (
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                              {variables.map(v => (
                                <div key={v.id} className="bg-violet-50 border border-violet-100 text-violet-950 font-bold px-2 py-1 rounded text-[10px] flex justify-between items-center">
                                  <span className="truncate">{v.apellido}, {v.nombre}</span>
                                  <button
                                    onClick={() => handleReleaseFromRealtime(v.id)}
                                    className="text-rose-500 hover:text-rose-700 p-0.5 hover:bg-rose-50 rounded cursor-pointer"
                                    title="Remover reserva variable"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ADJUDICACIÓN DE VARIABLE MANUAL */}
                      <form onSubmit={handleAssignFromRealtime} className="border-t border-zinc-100 pt-3 flex gap-2 items-center">
                        <select
                          value={selectedCandId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAssignRealtimeClientMap(prev => ({ ...prev, [turno.id]: val }));
                          }}
                          className="flex-1 bg-white border border-zinc-250 rounded-lg p-1 text-[10px] outline-none max-w-[170px]"
                        >
                          <option value="">+ Agendar Variable...</option>
                          {candidateClients.map(cand => {
                            const gotVar = !!cand.turno_variable;
                            return (
                              <option key={cand.id} value={cand.id}>
                                {cand.apellido}, {cand.nombre} {gotVar ? `(Ya tiene: ${cand.turno_variable.split('-')[1]})` : ''}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="submit"
                          disabled={!selectedCandId || isFull}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            !selectedCandId || isFull
                              ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
                              : 'bg-zinc-900 border border-zinc-900 text-white hover:bg-zinc-800'
                          }`}
                        >
                          Asignar
                        </button>
                      </form>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {subTab === 'RECUPEROS' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start animate-fade-in text-xs font-sans">
          
          {/* TABLA HISTORIAL DE RECUPEROS */}
          <div className="bg-white border border-zinc-200 p-5 rounded-xl xl:col-span-2 space-y-4 shadow-xs">
            <h3 className="font-sans font-bold text-sm text-zinc-900 uppercase tracking-wide border-b border-zinc-150 pb-2">Planilla de Ausencias y Recuperos Programados</h3>

            <div className="overflow-x-auto border border-zinc-200 rounded-lg">
              <table className="w-full text-left font-sans text-xs">
                <thead className="bg-[#fcfcfc] text-zinc-500 font-semibold uppercase tracking-wider text-[9px] border-b border-zinc-200">
                  <tr>
                    <th className="p-3">Socio</th>
                    <th className="p-3">Fecha Falto</th>
                    <th className="p-3">Turno Ausente</th>
                    <th className="p-3">Fecha Recupero</th>
                    <th className="p-3">Turno Recupero</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
                  {recuperos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-400 italic font-sans font-normal">
                        No se han agendado recuperos de clases o gimnasia para los miembros.
                      </td>
                    </tr>
                  ) : (
                    recuperos.map(rec => {
                      let tagClass = 'bg-amber-50 text-amber-700 border-amber-100';
                      if (rec.estado === 'COMPLETADO') {
                        tagClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                      } else if (rec.estado === 'EXPIRADO') {
                        tagClass = 'bg-zinc-100 text-zinc-500 border-zinc-200';
                      }

                      return (
                        <tr key={rec.id} className="hover:bg-zinc-50">
                          <td className="p-3 font-semibold text-zinc-950">{rec.cliente_nombre}</td>
                          <td className="p-3 font-mono">{rec.fecha_inasistencia}</td>
                          <td className="p-3 font-semibold text-zinc-650">{rec.turno_original_id}</td>
                          <td className="p-3 font-mono">{rec.fecha_recupero}</td>
                          <td className="p-3 font-semibold text-zinc-900">{rec.turno_recupero_id}</td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-sm font-bold border ${tagClass}`}>
                                {rec.estado}
                              </span>
                              {rec.estado === 'PENDIENTE' && (
                                <div className="flex gap-1 mt-1">
                                  <button
                                    onClick={() => actualizarEstadoRecupero(rec.id, 'COMPLETADO')}
                                    className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 text-[9px] font-sans font-bold"
                                  >
                                    Listo
                                  </button>
                                  <button
                                    onClick={() => actualizarEstadoRecupero(rec.id, 'EXPIRADO')}
                                    className="p-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded border border-zinc-300 text-[9px] font-sans font-semibold"
                                  >
                                    Venció
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FORMULARIO AGENDAR NUEVO RECUPERO */}
          <div className="bg-zinc-950 text-white p-5 rounded-xl border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-sans font-bold text-sm tracking-tight">Agendar Recuperación de Clase</h3>
            </div>

            {recIndexError && (
              <div className="bg-red-500/15 text-red-400 p-2.5 rounded-lg font-semibold border border-red-500/10 text-[11px]">
                {recIndexError}
              </div>
            )}

            {recIndexSuccess && (
              <div className="bg-emerald-500/15 text-emerald-400 p-2.5 rounded-lg font-semibold border border-emerald-500/10 text-[11px]">
                {recIndexSuccess}
              </div>
            )}

            <form onSubmit={handleSaveRecupero} className="space-y-4">
              {/* CHOOSE CLIENT */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Alumno Fijo Ausente</label>
                <select
                  required
                  value={recuperoForm.cliente_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const c = clientes.find(x => x.id === id);
                    setRecuperoForm(prev => ({ 
                      ...prev, 
                      cliente_id: id,
                      // Autoselect original turno if they only have one
                      turno_original_id: c && c.turnos_fijos.length === 1 ? c.turnos_fijos[0] : ''
                    }));
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden focus:border-zinc-500"
                >
                  <option value="">-- Elige un socio fijo --</option>
                  {clientesFijos.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.apellido}, {cl.nombre}</option>
                  ))}
                </select>
              </div>

              {/* CHOOSE TURNO CORRESPONDING */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Horario Ausencia</label>
                <select
                  required
                  value={recuperoForm.turno_original_id}
                  onChange={(e) => setRecuperoForm(prev => ({ ...prev, turno_original_id: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden focus:border-zinc-500"
                >
                  <option value="">-- Elige horario --</option>
                  {(() => {
                    const cObj = clientes.find(x => x.id === recuperoForm.cliente_id);
                    if (!cObj) return null;
                    return cObj.turnos_fijos.map(tFid => (
                      <option key={tFid} value={tFid}>{tFid}</option>
                    ));
                  })()}
                </select>
              </div>

              {/* DATE ABSENCE */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Fecha de Inasistencia</label>
                <input
                  type="date"
                  required
                  value={recuperoForm.fecha_inasistencia}
                  onChange={(e) => setRecuperoForm(prev => ({ ...prev, fecha_inasistencia: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden font-mono focus:border-zinc-500"
                />
              </div>

              {/* TARGET RECOVERY SLOT */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Horario Destino Recupero</label>
                <select
                  required
                  value={recuperoForm.turno_recupero_id}
                  onChange={(e) => setRecuperoForm(prev => ({ ...prev, turno_recupero_id: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden focus:border-zinc-500"
                >
                  <option value="">-- Escoge slot destino --</option>
                  {turnos
                    // Filter slots with vacant seats
                    .filter(t => t.id !== recuperoForm.turno_original_id && t.asignados_ids.length < t.cupo_maximo)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.dia} — {t.hora}hs ({t.asignados_ids.length}/{t.cupo_maximo} cupos)
                      </option>
                    ))}
                </select>
              </div>

              {/* TARGET RECOVERY DATE */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Fecha Destino Recupero</label>
                <input
                  type="date"
                  required
                  value={recuperoForm.fecha_recupero}
                  onChange={(e) => setRecuperoForm(prev => ({ ...prev, fecha_recupero: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden font-mono focus:border-zinc-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-amber-500/10"
              >
                Agendar Recupero de Clase
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
};
