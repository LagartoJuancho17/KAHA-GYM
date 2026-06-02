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
    checkInFlexible, modificarPrecioOCupoTurno, rolActivo, asignarTurnoVariable,
    crearReservaIndividual, cancelarReservaIndividual, asignarProfesorTurno,
    registrarVacaciones, suspenderClaseFija
  } = useGym();

  const [subTab, setSubTab] = useState<'GRILLA' | 'RECUPEROS' | 'TIEMPO_REAL'>('GRILLA');
  const [assignRealtimeClientMap, setAssignRealtimeClientMap] = useState<Record<string, string>>({});
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [realtimeSuccess, setRealtimeSuccess] = useState<string | null>(null);

  // --- CELL SELECTION STATE ---
  const [selectedTurnoId, setSelectedTurnoId] = useState<string | null>(null);
  const [selectedClientToAssignId, setSelectedClientToAssignId] = useState<string>('');
  const [nuevoCupoMaximo, setNuevoCupoMaximo] = useState<string>('');
  const [cellActionError, setCellActionError] = useState('');
  const [cellActionSuccess, setCellActionSuccess] = useState('');
  const [localProfesor, setLocalProfesor] = useState('');

  // --- REAL-TIME WEEK STATES ---
  const [selectedRealtimeSlot, setSelectedRealtimeSlot] = useState<{ id: string; date: string } | null>(null);
  const [realtimeCandidateClient, setRealtimeCandidateClient] = useState('');

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

  // --- FORM VACACIONES STATE ---
  const [vacacionesForm, setVacacionesForm] = useState({
    cliente_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [vacacionesSuccess, setVacacionesSuccess] = useState('');
  const [vacacionesError, setVacacionesError] = useState('');

  // --- CALENDAR & WARNING STATES ---
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [multipleTurnosWarning, setMultipleTurnosWarning] = useState<string[]>([]);

  // Helper to calculate the current week's dates
  const weekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0: Dom, 1: Lun, etc.
    const datesMap: Record<string, string> = {};
    const DAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

    const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() + mondayDiff);

    for (let i = 1; i <= 5; i++) {
      const date = new Date(mondayDate);
      date.setDate(mondayDate.getDate() + (i - 1));
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      datesMap[DAYS[i]] = `${yyyy}-${mm}-${dd}`;
    }
    return datesMap;
  }, []);

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
  const clientesFijos = useMemo(() => clientesActivos, [clientesActivos]);
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
    if (t) {
      setNuevoCupoMaximo(t.cupo_maximo.toString());
      setLocalProfesor(t.profesor || '');
    }
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

  // Save Professor Handler
  const handleSaveProfesor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurnoId) return;
    asignarProfesorTurno(selectedTurnoId, localProfesor);
    setCellActionSuccess('Profesor actualizado con éxito.');
    setTimeout(() => setCellActionSuccess(''), 1500);
  };

  // Save Absence and Recupero
  const handleSaveRecupero = (e: React.FormEvent) => {
    e.preventDefault();
    setRecIndexError('');
    setRecIndexSuccess('');

    const { cliente_id, turno_original_id, fecha_inasistencia, turno_recupero_id, fecha_recupero } = recuperoForm;

    if (!cliente_id || !turno_original_id || !fecha_inasistencia || !turno_recupero_id) {
      setRecIndexError('Por favor complete todos los datos del formulario de inasistencia y recupero.');
      return;
    }

    if (turno_recupero_id !== 'PENDIENTE_DEFINICION' && !fecha_recupero) {
      setRecIndexError('Por favor complete la fecha destino para el recupero.');
      return;
    }

    const clientObj = clientes.find(c => c.id === cliente_id);
    if (!clientObj) return;

    const turnosToRegister = turno_original_id === 'MULTIPLE' ? multipleTurnosWarning : [turno_original_id];
    let successCount = 0;
    let errorMsg = '';

    turnosToRegister.forEach(tfId => {
      const res = agregarRecupero({
        cliente_id,
        cliente_nombre: `${clientObj.nombre} ${clientObj.apellido}`,
        turno_original_id: tfId,
        fecha_inasistencia,
        turno_recupero_id,
        fecha_recupero: turno_recupero_id === 'PENDIENTE_DEFINICION' ? '' : fecha_recupero
      });

      if (res.success) {
        successCount++;
      } else {
        errorMsg = res.message;
      }
    });

    if (successCount > 0) {
      setRecIndexSuccess(`Inasistencia y recupero registrado(s) con éxito (${successCount} cupo(s)).`);
      setRecuperoForm({
        cliente_id: '',
        turno_original_id: '',
        fecha_inasistencia: '',
        turno_recupero_id: '',
        fecha_recupero: ''
      });
      setMultipleTurnosWarning([]);
      setTimeout(() => setRecIndexSuccess(''), 2500);
    } else {
      setRecIndexError(errorMsg || 'Error al guardar el recupero.');
    }
  };

  // Save Vacaciones
  const handleSaveVacaciones = (e: React.FormEvent) => {
    e.preventDefault();
    setVacacionesSuccess('');
    setVacacionesError('');

    const { cliente_id, fecha_inicio, fecha_fin } = vacacionesForm;
    if (!cliente_id || !fecha_inicio || !fecha_fin) {
      setVacacionesError('Por favor complete todos los campos.');
      return;
    }

    const res = registrarVacaciones(cliente_id, fecha_inicio, fecha_fin);
    if (res.success) {
      setVacacionesSuccess(res.message);
      setVacacionesForm({
        cliente_id: '',
        fecha_inicio: '',
        fecha_fin: ''
      });
      setTimeout(() => setVacacionesSuccess(''), 4000);
    } else {
      setVacacionesError(res.message);
    }
  };

  // --- REAL-TIME TAB HANDLERS & HELPERS ---
  const getCellRealtimeData = (turnoId: string, fecha: string) => {
    const turno = turnos.find(t => t.id === turnoId);
    if (!turno) return { fijos: [], fijosActivos: [], suspendidos: [], variables: [], recuperos: [], total: 0, cupo: 0, profesor: '' };

    const fijos = (turno.asignados_ids || []).map(id => clientes.find(c => c.id === id)).filter(Boolean) as Cliente[];
    const suspendidos = fijos.filter(c => (c.clases_suspendidas || []).some(s => s.turno_id === turno.id && s.fecha === fecha));
    const fijosActivos = fijos.filter(c => !suspendidos.some(s => s.id === c.id));
    const vars = clientes.filter(c => c.activo && (c.reservas_individuales || []).some(r => r.turno_id === turno.id && r.fecha === fecha));
    const recs = recuperos.filter(r => r.estado === 'PENDIENTE' && r.turno_recupero_id === turno.id && r.fecha_recupero === fecha);

    return {
      turno,
      fijos,
      suspendidos,
      fijosActivos,
      variables: vars,
      recuperos: recs,
      total: fijosActivos.length + vars.length + recs.length,
      cupo: turno.cupo_maximo,
      profesor: turno.profesor || ''
    };
  };

  const handleAddRealtimeVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRealtimeSlot || !realtimeCandidateClient) return;

    setRealtimeError(null);
    setRealtimeSuccess(null);

    const res = crearReservaIndividual(realtimeCandidateClient, selectedRealtimeSlot.id, selectedRealtimeSlot.date);
    if (res.success) {
      setRealtimeSuccess(res.message);
      setRealtimeCandidateClient('');
      setTimeout(() => setRealtimeSuccess(null), 3000);
    } else {
      setRealtimeError(res.message);
    }
  };

  const handleRemoveRealtimeVariable = (clienteId: string, reservaId: string) => {
    setRealtimeError(null);
    setRealtimeSuccess(null);

    const res = cancelarReservaIndividual(clienteId, reservaId);
    if (res.success) {
      setRealtimeSuccess(res.message);
      setTimeout(() => setRealtimeSuccess(null), 3000);
    } else {
      setRealtimeError(res.message);
    }
  };

  const handleSuspendRealtimeFixed = (clienteId: string, turnoId: string, date: string) => {
    setRealtimeError(null);
    setRealtimeSuccess(null);

    const res = suspenderClaseFija(clienteId, turnoId, date);
    if (res.success) {
      setRealtimeSuccess(res.message);
      setTimeout(() => setRealtimeSuccess(null), 3000);
    } else {
      setRealtimeError(res.message);
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
                                {slotTurno.profesor && (
                                  <div className="mt-1 text-[8.5px] font-sans font-bold text-zinc-550 truncate max-w-full" title={`Profesor: ${slotTurno.profesor}`}>
                                    👤 {slotTurno.profesor}
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

          {/* MODAL FLOTANTE (VENTANITA VOLANDO) PARA GESTIÓN DE TURNO SEMANAL FIJO */}
          {selectedTurno && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs" id="grilla-turno-modal">
              <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden relative animate-scale-up max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-450" />
                      {selectedTurno.dia} — {selectedTurno.hora} hs
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Gestión de Turno Semanal Fijo</p>
                  </div>
                  <button
                    onClick={() => setSelectedTurnoId(null)}
                    className="text-zinc-450 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-6">

                  {cellActionError && (
                    <div className="bg-red-50 text-red-750 p-2.5 rounded-lg font-medium border border-red-200 text-[11px]">
                      {cellActionError}
                    </div>
                  )}

                  {cellActionSuccess && (
                    <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-medium border border-emerald-250 text-[11px]">
                      {cellActionSuccess}
                    </div>
                  )}

                  {/* 1. PROFESOR FIJO */}
                  <form onSubmit={handleSaveProfesor} className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 space-y-2">
                    <label className="font-bold text-[10px] text-zinc-550 uppercase tracking-widest block font-sans">Profesor Fijo / Clase</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej: Prof. Juan"
                        value={localProfesor}
                        onChange={(e) => setLocalProfesor(e.target.value)}
                        className="border border-zinc-300 rounded-lg p-2 flex-1 bg-white outline-hidden text-xs"
                      />
                      <button
                        type="submit"
                        className="bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold px-3 py-2 cursor-pointer transition-colors"
                      >
                        Guardar
                      </button>
                    </div>
                  </form>

                  {/* 2. ALUMNOS FIJOS ASIGNADOS */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-[10px] text-zinc-450 uppercase tracking-widest font-sans border-b border-zinc-100 pb-1.5">Miembros Fijos Asignados ({selectedTurno.asignados_ids.length})</h4>
                    
                    {selectedTurno.asignados_ids.length === 0 ? (
                      <p className="text-zinc-400 italic text-[11px] py-1">Este turno no registra alumnos fijos asignados aún.</p>
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
                                className="text-red-505 hover:text-red-700 bg-red-50 p-1.5 rounded-md border border-red-100 cursor-pointer"
                                title="Remover asignación permanente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* LISTA DE ESPERA */}
                    {selectedTurno.lista_espera_ids.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <ListOrdered className="w-3.5 h-3.5 text-zinc-400" />
                          <h5 className="font-bold text-[10px] text-zinc-450 uppercase tracking-widest font-sans">Lista de Espera ({selectedTurno.lista_espera_ids.length})</h5>
                        </div>
                        <div className="space-y-1.5">
                          {selectedTurno.lista_espera_ids.map((cId, idx) => {
                            const cl = clientes.find(c => c.id === cId);
                            if (!cl) return null;
                            return (
                              <div key={cl.id} className="flex justify-between items-center p-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                                <span className="font-mono text-[10px] bg-amber-100 text-amber-800 px-1 rounded-sm font-bold">P{idx + 1}</span>
                                <span className="font-semibold text-zinc-850 flex-1 ml-2">{cl.nombre} {cl.apellido}</span>
                                <button
                                  onClick={() => removerAsignacionFija(cId, selectedTurno.id)}
                                  className="text-zinc-450 hover:text-zinc-800 cursor-pointer"
                                  title="Retirar de waitlist"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ASIGNAR SOCIO FIJO PERMANENTE */}
                    <form onSubmit={handleAssignFijo} className="pt-2.5 space-y-2">
                      <label className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block font-sans">Reservar Horario Fijo</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedClientToAssignId}
                          onChange={(e) => setSelectedClientToAssignId(e.target.value)}
                          className="flex-1 border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden"
                        >
                          <option value="">-- Elige un socio --</option>
                          {clientesFijos
                            .filter(c => !c.turnos_fijos.includes(selectedTurno.id))
                            .map(cl => {
                              const clPlan = planes.find(p => p.id === cl.plan_id);
                              return (
                                <option key={cl.id} value={cl.id}>
                                  {cl.apellido}, {cl.nombre} ({cl.turnos_fijos.length}/{clPlan?.dias_por_semana || 5} turnos max)
                                </option>
                              );
                            })}
                        </select>
                        <button
                          type="submit"
                          className="bg-black hover:bg-zinc-800 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Asignar
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* 3. CHECK-IN DIARIO ALUMNO FLEXIBLE */}
                  <form onSubmit={handleFlexCheckIn} className="border-t border-zinc-100 pt-4 space-y-3">
                    <div className="space-y-1">
                      <label className="font-bold text-[10px] text-zinc-450 uppercase tracking-widest block font-sans">Asistencia de Alumno (Check-In Diario)</label>
                      <p className="text-[10px] text-zinc-400 leading-normal">Permite registrar una asistencia libre/check-in para el día de hoy si hay vacantes físicas en este turno.</p>
                      <div className="flex gap-2">
                        <select
                          value={flexCheckInClientId}
                          onChange={(e) => setFlexCheckInClientId(e.target.value)}
                          className="flex-1 border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden"
                        >
                          <option value="">-- Elige alumno --</option>
                          {clientesFlexibles.map(cl => (
                            <option key={cl.id} value={cl.id}>
                              {cl.apellido}, {cl.nombre} ({planes.find(p => p.id === cl.plan_id)?.nombre})
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-bold text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-zinc-650" />
                          Check-In
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* 4. CUPO MÁXIMO (Al final del modal) */}
                  <form onSubmit={handleSaveCupo} className="border-t border-zinc-100 pt-4 space-y-2.5">
                    <label className="font-bold text-[10px] text-zinc-450 uppercase tracking-widest block font-sans">Capacidad Máxima del Turno</label>
                    <p className="text-[10px] text-zinc-400 leading-normal">Establece el cupo límite de alumnos que pueden asistir simultáneamente a este horario.</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        min="1"
                        value={nuevoCupoMaximo}
                        onChange={(e) => setNuevoCupoMaximo(e.target.value)}
                        className="border border-zinc-300 rounded-lg p-2 w-20 text-center font-mono font-bold bg-white outline-hidden text-xs"
                      />
                      <button
                        type="submit"
                        className="flex-1 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold py-2 cursor-pointer transition-colors"
                      >
                        Actualizar Cupo
                      </button>
                    </div>
                  </form>

                </div>

                {/* Footer */}
                <div className="bg-zinc-50 px-5 py-4 border-t border-zinc-150 flex justify-end font-sans">
                  <button
                    onClick={() => setSelectedTurnoId(null)}
                    className="px-5 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold font-sans transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'TIEMPO_REAL' && (
        <div className="space-y-6 animate-fade-in font-sans text-xs">
          
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest font-mono">Consola de Control</span>
                <h3 className="text-lg font-bold tracking-tight text-white mt-1">Turnera de Tiempo Real Semanal</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Muestra la ocupación real calculada para cada día de la semana actual. Haz clic en un casillero para gestionar asistencias variables, avisos de faltas y recuperos de ese día específico.
                </p>
              </div>

              {/* LEYENDAS */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-355 font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span> Libre (&lt;70%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span> Sat. (70-90%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span> Lleno (&gt;=90%)
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

          {/* GRILLA SEMANAL TIEMPO REAL */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="overflow-x-auto select-none rounded-lg border border-zinc-200">
              <table className="w-full text-center border-collapse text-xs table-fixed min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-sans font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 border-r border-slate-800 w-16">Hora</th>
                    {DIAS.map(d => {
                      const dateStr = weekDates[d];
                      const displayDate = dateStr ? `${dateStr.split('-')[2]}/${dateStr.split('-')[1]}` : '';
                      return (
                        <th key={d} className="p-3 border-r border-slate-800">
                          <div>{d === 'MIERCOLES' ? 'MIÉRCOLES' : d}</div>
                          <div className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">{displayDate}</div>
                        </th>
                      );
                    })}
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
                          const fechaStr = weekDates[dia];

                          // Si es 15:00 pero no es Martes / Jueves / Viernes, pintar vacío
                          if (hora === '15:00' && dia !== 'MARTES' && dia !== 'JUEVES' && dia !== 'VIERNES') {
                            return (
                              <td key={dia} className="p-2 border-r border-zinc-200 bg-zinc-50/20 text-zinc-400 italic font-medium text-[10px] text-center">
                                —
                              </td>
                            );
                          }

                          const rtData = getCellRealtimeData(idTurno, fechaStr);
                          if (!rtData.turno) {
                            return <td key={dia} className="p-2 border-r border-zinc-200 text-zinc-300">-</td>;
                          }

                          const ratio = rtData.cupo > 0 ? (rtData.total / rtData.cupo) * 100 : 0;

                          let blockColorClass = 'bg-emerald-50 hover:bg-emerald-100/50 text-emerald-800 border-emerald-100 hover:border-emerald-300';
                          if (ratio >= 70 && ratio < 90) {
                            blockColorClass = 'bg-amber-50 hover:bg-amber-100/50 text-amber-800 border-amber-100 hover:border-amber-300';
                          } else if (ratio >= 90) {
                            blockColorClass = 'bg-red-50 hover:bg-red-100/50 text-red-800 border-red-100 hover:border-red-300';
                          }

                          const isSelected = selectedRealtimeSlot?.id === idTurno && selectedRealtimeSlot?.date === fechaStr;

                          return (
                            <td 
                              key={dia} 
                              onClick={() => {
                                setSelectedRealtimeSlot({ id: idTurno, date: fechaStr });
                                setRealtimeError(null);
                                setRealtimeSuccess(null);
                                setRealtimeCandidateClient('');
                              }}
                              className={`p-2.5 border-r border-zinc-200 cursor-pointer transition-all border-2 ${blockColorClass} ${
                                isSelected ? 'ring-2 ring-black border-transparent relative z-10 shadow-lg' : ''
                              }`}
                              title={`Hacer clic para gestionar tiempo real: ${idTurno} (${fechaStr})`}
                            >
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="font-bold text-xs font-mono">{rtData.total} / {rtData.cupo}</span>
                                <div className="text-[9px] font-sans opacity-75 font-semibold">Vacantes: {Math.max(0, rtData.cupo - rtData.total)}</div>
                                
                                <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                                  {rtData.fijosActivos.length > 0 && (
                                    <span className="text-[7.5px] px-1 bg-sky-105 text-sky-800 rounded-sm font-bold" title={`${rtData.fijosActivos.length} fijos activos`}>F:{rtData.fijosActivos.length}</span>
                                  )}
                                  {rtData.variables.length > 0 && (
                                    <span className="text-[7.5px] px-1 bg-violet-105 text-violet-800 rounded-sm font-bold" title={`${rtData.variables.length} variables`}>V:{rtData.variables.length}</span>
                                  )}
                                  {rtData.recuperos.length > 0 && (
                                    <span className="text-[7.5px] px-1 bg-amber-105 text-amber-800 rounded-sm font-bold" title={`${rtData.recuperos.length} recuperos`}>R:{rtData.recuperos.length}</span>
                                  )}
                                </div>

                                {rtData.profesor && (
                                  <div className="mt-1 text-[8.5px] font-sans font-bold text-zinc-550 truncate max-w-full" title={`Profesor: ${rtData.profesor}`}>
                                    👤 {rtData.profesor}
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

          {/* MODAL DETALLES TIEMPO REAL CELL */}
          {selectedRealtimeSlot && (() => {
            const rtData = getCellRealtimeData(selectedRealtimeSlot.id, selectedRealtimeSlot.date);
            const isFull = rtData.total >= rtData.cupo;
            
            // Candidates: active, don't have this as fijo, don't have booking on this date
            const candidateClients = clientes.filter(c => {
              return c.activo && 
                !c.turnos_fijos.includes(selectedRealtimeSlot.id) && 
                !(c.reservas_individuales || []).some(r => r.fecha === selectedRealtimeSlot.date);
            });

            return (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs" id="realtime-turno-modal">
                <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden relative animate-scale-up max-h-[90vh] overflow-y-auto">
                  
                  {/* Header */}
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-450" />
                        Control Tiempo Real: {selectedRealtimeSlot.id.split('-')[0]} — {selectedRealtimeSlot.id.split('-')[1]} hs
                      </h3>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Fecha de la clase: {selectedRealtimeSlot.date}</p>
                    </div>
                    <button
                      onClick={() => setSelectedRealtimeSlot(null)}
                      className="text-zinc-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-5">
                    
                    {/* Status Overview */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                      <div>
                        <div className="text-[10px] text-zinc-450 uppercase tracking-widest font-bold">Estado de Ocupación</div>
                        <div className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">{rtData.total} / {rtData.cupo} Cupos</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-450 uppercase tracking-widest font-bold">Profesor Fijo</div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">👤 {rtData.profesor || 'No asignado'}</div>
                      </div>
                    </div>

                    {realtimeError && (
                      <div className="bg-red-50 text-red-750 p-2.5 rounded-lg font-medium border border-red-200 text-[11px]">
                        {realtimeError}
                      </div>
                    )}

                    {realtimeSuccess && (
                      <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-medium border border-emerald-250 text-[11px]">
                        {realtimeSuccess}
                      </div>
                    )}

                    {/* Fijos Activos */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-[10px] text-sky-800 uppercase tracking-widest font-sans border-b border-sky-50 pb-1 flex justify-between items-center">
                        <span>Miembros Fijos Hoy ({rtData.fijosActivos.length})</span>
                        <span className="text-[9px] text-zinc-400 normal-case font-normal">(con turno fijo permanente)</span>
                      </h4>
                      {rtData.fijosActivos.length === 0 ? (
                        <p className="text-zinc-400 italic text-[11px] py-1">No asisten alumnos fijos a este turno hoy.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {rtData.fijosActivos.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 bg-sky-50/50 border border-sky-100 rounded-lg text-xs">
                              <span className="font-semibold text-sky-950">{c.apellido}, {c.nombre}</span>
                              <button
                                onClick={() => handleSuspendRealtimeFixed(c.id, selectedRealtimeSlot.id, selectedRealtimeSlot.date)}
                                className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1 rounded-md border border-rose-100 cursor-pointer text-[10px] font-bold px-2"
                                title="Avisar inasistencia y liberar cupo por hoy"
                              >
                                Avisar Falta
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fijos Suspendidos */}
                    {rtData.suspendidos.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-[10px] text-rose-750 uppercase tracking-widest font-sans border-b border-rose-50 pb-1">
                          Miembros con Falta Avisada Hoy ({rtData.suspendidos.length})
                        </h4>
                        <div className="space-y-1.5">
                          {rtData.suspendidos.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 bg-rose-50/30 border border-rose-100 rounded-lg text-xs">
                              <span className="font-semibold text-rose-800 line-through">{c.apellido}, {c.nombre}</span>
                              <span className="text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-extrabold uppercase">Ausente</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reservas Variables */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-[10px] text-violet-800 uppercase tracking-widest font-sans border-b border-violet-50 pb-1">
                        Reservas Variables / Individuales ({rtData.variables.length})
                      </h4>
                      {rtData.variables.length === 0 ? (
                        <p className="text-zinc-400 italic text-[11px] py-1">No se registran reservas variables para este día.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {rtData.variables.map(c => {
                            const resObj = (c.reservas_individuales || []).find(r => r.turno_id === selectedRealtimeSlot.id && r.fecha === selectedRealtimeSlot.date);
                            return (
                              <div key={c.id} className="flex justify-between items-center p-2 bg-violet-50/50 border border-violet-100 rounded-lg text-xs">
                                <span className="font-semibold text-violet-950">{c.apellido}, {c.nombre}</span>
                                {resObj && (
                                  <button
                                    onClick={() => handleRemoveRealtimeVariable(c.id, resObj.id)}
                                    className="text-rose-550 hover:text-rose-700 bg-rose-50 p-1.5 rounded-md border border-rose-100 cursor-pointer"
                                    title="Cancelar reserva variable"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recuperos */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-[10px] text-amber-850 uppercase tracking-widest font-sans border-b border-amber-50 pb-1">
                        Recuperos de Clase Programados ({rtData.recuperos.length})
                      </h4>
                      {rtData.recuperos.length === 0 ? (
                        <p className="text-zinc-400 italic text-[11px] py-1">No hay alumnos recuperando clases en este turno hoy.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {rtData.recuperos.map(r => (
                            <div key={r.id} className="p-2 bg-amber-50/50 border border-amber-100 rounded-lg text-xs font-semibold text-amber-950">
                              {r.cliente_nombre} <span className="text-[9px] text-amber-600 font-normal">(Faltó el {r.fecha_inasistencia})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Agendar Variable Form */}
                    <form onSubmit={handleAddRealtimeVariable} className="border-t border-zinc-150 pt-4 space-y-2">
                      <label className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block font-sans">Agendar Alumno Variable (Solo por Hoy)</label>
                      <div className="flex gap-2">
                        <select
                          value={realtimeCandidateClient}
                          onChange={(e) => setRealtimeCandidateClient(e.target.value)}
                          className="flex-1 border border-zinc-250 rounded-lg p-2 text-xs bg-white outline-hidden"
                        >
                          <option value="">-- Elige un socio --</option>
                          {candidateClients.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.apellido}, {c.nombre}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={!realtimeCandidateClient || isFull}
                          className={`font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            !realtimeCandidateClient || isFull
                              ? 'bg-zinc-100 text-zinc-450 border border-zinc-200 cursor-not-allowed'
                              : 'bg-slate-900 border border-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Reservar
                        </button>
                      </div>
                    </form>

                  </div>

                  {/* Footer */}
                  <div className="bg-zinc-50 px-5 py-4 border-t border-zinc-150 flex justify-end font-sans">
                    <button
                      onClick={() => setSelectedRealtimeSlot(null)}
                      className="px-5 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold font-sans transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>

                </div>
              </div>
            );
          })()}

        </div>
      )}

      {subTab === 'RECUPEROS' && (() => {
        const MESES = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        return (
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
                      <th className="p-3">Fecha Límite</th>
                      <th className="p-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
                    {recuperos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-zinc-400 italic font-sans font-normal">
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
                            <td className="p-3 font-mono">{rec.fecha_recupero || 'Pendiente'}</td>
                            <td className="p-3 font-semibold text-zinc-900">{rec.turno_recupero_id === 'PENDIENTE_DEFINICION' ? 'Pendiente' : rec.turno_recupero_id}</td>
                            <td className="p-3 font-mono text-zinc-600">{rec.fecha_limite}</td>
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

            {/* PANEL DERECHO CON FORMULARIOS */}
            <div className="space-y-6">
              
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
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Alumno Ausente</label>
                    <select
                      required
                      value={recuperoForm.cliente_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const c = clientes.find(x => x.id === id);
                        setRecuperoForm(prev => ({ 
                          ...prev, 
                          cliente_id: id,
                          turno_original_id: '',
                          fecha_inasistencia: '',
                          fecha_recupero: '',
                          turno_recupero_id: ''
                        }));
                        setMultipleTurnosWarning([]);
                        setRecIndexError('');
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden focus:border-zinc-500"
                    >
                      <option value="">-- Elige un socio --</option>
                      {clientesFijos.map(cl => (
                        <option key={cl.id} value={cl.id}>{cl.apellido}, {cl.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* CALENDARIO INTERACTIVO */}
                  {recuperoForm.cliente_id && (() => {
                    const clientObj = clientes.find(c => c.id === recuperoForm.cliente_id);
                    if (!clientObj) return null;

                    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
                    
                    const headers = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
                    const dayCells: (number | null)[] = [];
                    for (let i = 0; i < firstDayIndex; i++) {
                      dayCells.push(null);
                    }
                    for (let d = 1; d <= daysInMonth; d++) {
                      dayCells.push(d);
                    }

                    const DAYS_NAMES = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

                    return (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center text-white text-[11px] font-bold">
                          <button 
                            type="button" 
                            onClick={() => {
                              if (calMonth === 0) {
                                setCalMonth(11);
                                setCalYear(prev => prev - 1);
                              } else {
                                setCalMonth(prev => prev - 1);
                              }
                            }} 
                            className="p-1 hover:bg-zinc-800 rounded cursor-pointer"
                          >
                            &lt;
                          </button>
                          <span>{MESES[calMonth]} {calYear}</span>
                          <button 
                            type="button" 
                            onClick={() => {
                              if (calMonth === 11) {
                                setCalMonth(0);
                                setCalYear(prev => prev + 1);
                              } else {
                                setCalMonth(prev => prev + 1);
                              }
                            }} 
                            className="p-1 hover:bg-zinc-800 rounded cursor-pointer"
                          >
                            &gt;
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-zinc-400 font-bold border-b border-zinc-800 pb-1">
                          {headers.map((h, i) => <div key={i}>{h}</div>)}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-[10px]">
                          {dayCells.map((day, idx) => {
                            if (day === null) return <div key={idx}></div>;
                            
                            const mm = String(calMonth + 1).padStart(2, '0');
                            const dd = String(day).padStart(2, '0');
                            const dateStr = `${calYear}-${mm}-${dd}`;
                            const dateObj = new Date(dateStr + 'T00:00:00');
                            const dayName = DAYS_NAMES[dateObj.getDay()];
                            
                            const clientFijosOnDay = clientObj.turnos_fijos.filter(tf => tf.startsWith(dayName));
                            const hasFijo = clientFijosOnDay.length > 0;
                            const isSelected = recuperoForm.fecha_inasistencia === dateStr;

                            let cellClass = 'p-1.5 text-center rounded-sm transition-colors cursor-pointer text-zinc-300 hover:bg-zinc-800 bg-transparent border-0 w-full';
                            if (isSelected) {
                              cellClass = 'p-1.5 text-center rounded-sm bg-amber-500 text-black font-bold border-0 w-full';
                            } else if (hasFijo) {
                              cellClass = 'p-1.5 text-center rounded-sm bg-zinc-805 text-white font-semibold border border-zinc-700 w-full';
                            }

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setRecIndexError('');
                                  setMultipleTurnosWarning([]);
                                  
                                  if (clientFijosOnDay.length === 0) {
                                    setRecIndexError('El socio no tiene turnos fijos asignados este día de la semana.');
                                    setRecuperoForm(prev => ({ ...prev, fecha_inasistencia: dateStr, turno_original_id: '' }));
                                    return;
                                  }
                                  
                                  if (clientFijosOnDay.length === 1) {
                                    setRecuperoForm(prev => ({
                                      ...prev,
                                      fecha_inasistencia: dateStr,
                                      turno_original_id: clientFijosOnDay[0]
                                    }));
                                  } else {
                                    setMultipleTurnosWarning(clientFijosOnDay);
                                    setRecuperoForm(prev => ({
                                      ...prev,
                                      fecha_inasistencia: dateStr,
                                      turno_original_id: 'MULTIPLE'
                                    }));
                                  }
                                }}
                                className={cellClass}
                              >
                                <div>{day}</div>
                                {hasFijo && !isSelected && (
                                  <div className="w-1 h-1 rounded-full bg-amber-400 mx-auto mt-0.5 animate-pulse"></div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* DISPLAY DETECTED ABSENCE DETAILS */}
                  {recuperoForm.fecha_inasistencia && (
                    <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-[11px] space-y-1.5">
                      <div>
                        <span className="text-zinc-400 font-bold">Fecha seleccionada:</span>{' '}
                        <span className="font-mono text-white font-bold">{recuperoForm.fecha_inasistencia}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 font-bold">Horario de clase:</span>{' '}
                        <span className="font-semibold text-amber-400">
                          {recuperoForm.turno_original_id === 'MULTIPLE' 
                            ? `Múltiples turnos (${multipleTurnosWarning.join(', ')})`
                            : recuperoForm.turno_original_id || 'Ninguno seleccionado'}
                        </span>
                      </div>
                      
                      {recuperoForm.turno_original_id === 'MULTIPLE' && (
                        <div className="text-amber-400 font-medium bg-amber-500/10 p-2 rounded border border-amber-500/20 text-[10px] leading-tight">
                          ⚠️ Se registrarán inasistencias y cupones de recupero para ambos horarios.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TARGET RECOVERY SLOT */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Turno Destino Recupero</label>
                    <select
                      required
                      value={recuperoForm.turno_recupero_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRecuperoForm(prev => ({ 
                          ...prev, 
                          turno_recupero_id: val,
                          fecha_recupero: val === 'PENDIENTE_DEFINICION' ? '' : prev.fecha_recupero
                        }));
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden focus:border-zinc-500"
                    >
                      <option value="">-- Escoge slot destino --</option>
                      <option value="PENDIENTE_DEFINICION">No avisa recupero aún (Pendiente)</option>
                      {turnos
                        .filter(t => t.id !== recuperoForm.turno_original_id)
                        .map(t => {
                          const vacantes = t.cupo_maximo - t.asignados_ids.length;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.dia} — {t.hora}hs (Cupo fijo: {t.asignados_ids.length}/{t.cupo_maximo})
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {/* TARGET RECOVERY DATE */}
                  {recuperoForm.turno_recupero_id !== 'PENDIENTE_DEFINICION' && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Fecha Destino Recupero</label>
                      <input
                        type="date"
                        required={recuperoForm.turno_recupero_id !== 'PENDIENTE_DEFINICION'}
                        value={recuperoForm.fecha_recupero}
                        onChange={(e) => setRecuperoForm(prev => ({ ...prev, fecha_recupero: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden font-mono focus:border-zinc-500"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
                  >
                    Agendar Recupero de Clase
                  </button>
                </form>
              </div>

              {/* FORMULARIO REGISTRAR VACACIONES */}
              <div className="bg-zinc-950 text-white p-5 rounded-xl border border-zinc-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <Calendar className="w-5 h-5 text-sky-400" />
                  <h3 className="font-sans font-bold text-sm tracking-tight">Registrar Vacaciones o Viaje</h3>
                </div>

                {vacacionesError && (
                  <div className="bg-red-500/15 text-red-400 p-2.5 rounded-lg font-semibold border border-red-500/10 text-[11px]">
                    {vacacionesError}
                  </div>
                )}

                {vacacionesSuccess && (
                  <div className="bg-sky-500/15 text-sky-400 p-2.5 rounded-lg font-semibold border border-sky-500/10 text-[11px]">
                    {vacacionesSuccess}
                  </div>
                )}

                <p className="text-[10.5px] text-zinc-400 leading-normal">
                  Permite suspender en lote todas las clases fijas del socio dentro del rango de fechas ingresado y generarles cupones de recupero con 30 días de validez.
                </p>

                <form onSubmit={handleSaveVacaciones} className="space-y-4">
                  {/* CLIENT */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Seleccionar Socio</label>
                    <select
                      required
                      value={vacacionesForm.cliente_id}
                      onChange={(e) => setVacacionesForm(prev => ({ ...prev, cliente_id: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden focus:border-zinc-500"
                    >
                      <option value="">-- Elige un socio --</option>
                      {clientesFijos.map(cl => (
                        <option key={cl.id} value={cl.id}>{cl.apellido}, {cl.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* START DATE */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Fecha de Inicio</label>
                    <input
                      type="date"
                      required
                      value={vacacionesForm.fecha_inicio}
                      onChange={(e) => setVacacionesForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden font-mono focus:border-zinc-500"
                    />
                  </div>

                  {/* END DATE */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Fecha de Fin</label>
                    <input
                      type="date"
                      required
                      value={vacacionesForm.fecha_fin}
                      onChange={(e) => setVacacionesForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white text-xs outline-hidden font-mono focus:border-zinc-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-sky-500 text-black hover:bg-sky-400 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-sky-500/10 cursor-pointer"
                  >
                    Registrar Ausencia Prolongada
                  </button>
                </form>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
