// src/components/Turnos/TurnosHistorialModal.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { AuditLog } from '../../types';
import { 
  X, Search, Filter, History, Calendar, Clock, User, 
  CheckCircle2, AlertCircle, Sparkles, UserMinus, UserCheck, ShieldAlert
} from 'lucide-react';

interface TurnosHistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  filtroTurnoIdInicial?: string;
  filtroFechaInicial?: string;
}

type CategoriaLog = 'TODOS' | 'ASIGNACIONES' | 'BAJAS' | 'WAITLIST' | 'RECUPEROS' | 'PROFESORES_CUPOS';

const ACCIONES_TURNOS = [
  'TURNO_ASIGNACION_FIJA',
  'TURNO_ASIGNACION_REMOCION',
  'TURNO_LISTA_ESPERA_AGREGADO',
  'LISTA_ESPERA_RESERVA_AGREGADO',
  'LISTA_ESPERA_RESERVA_REMOVIDO',
  'LISTA_ESPERA_PROMOCION_AUTO',
  'RESERVA_INDIVIDUAL_CREADA',
  'RESERVA_INDIVIDUAL_CANCELADA',
  'CLASE_FIJA_SUSPENDIDA',
  'CLASE_FIJA_RESTABLECIDA',
  'ASISTENCIA_FLEXIBLE_REGISTRADA',
  'RECUPERO_TURNO_PROGRAMADO',
  'RECUPERO_TURNO_ESTADO_CAMBIADO',
  'RECUPERO_PENDIENTE_PROGRAMADO',
  'CUPO_TURNO_EDITADO',
  'PROFESOR_TURNO_ASIGNADO',
  'CLIENTE_REGISTRO_VACACIONES'
];

export const TurnosHistorialModal: React.FC<TurnosHistorialModalProps> = ({
  isOpen,
  onClose,
  filtroTurnoIdInicial,
  filtroFechaInicial
}) => {
  const { auditLogs, clientes } = useGym();

  const [searchTerm, setSearchTerm] = useState(filtroTurnoIdInicial || '');
  const [categoria, setCategoria] = useState<CategoriaLog>('TODOS');
  const [filtroFecha, setFiltroFecha] = useState(filtroFechaInicial || '');

  if (!isOpen) return null;

  // Filtrar logs pertenecientes a turnos
  const logsTurnos = useMemo(() => {
    return auditLogs.filter(log => {
      // 1. Debe ser una acción de turnos o tener turno en sus detalles
      const esAccionTurno = ACCIONES_TURNOS.includes(log.accion) || 
        (log.detalles && (log.detalles.turno || log.detalles.turno_id || log.detalles.fecha_recupero));
      if (!esAccionTurno) return false;

      // 2. Filtro por categoría
      if (categoria === 'ASIGNACIONES') {
        if (!['TURNO_ASIGNACION_FIJA', 'RESERVA_INDIVIDUAL_CREADA'].includes(log.accion)) return false;
      } else if (categoria === 'BAJAS') {
        if (!['TURNO_ASIGNACION_REMOCION', 'RESERVA_INDIVIDUAL_CANCELADA', 'CLASE_FIJA_SUSPENDIDA'].includes(log.accion)) return false;
      } else if (categoria === 'WAITLIST') {
        if (!['TURNO_LISTA_ESPERA_AGREGADO', 'LISTA_ESPERA_RESERVA_AGREGADO', 'LISTA_ESPERA_RESERVA_REMOVIDO', 'LISTA_ESPERA_PROMOCION_AUTO'].includes(log.accion)) return false;
      } else if (categoria === 'RECUPEROS') {
        if (!['RECUPERO_TURNO_PROGRAMADO', 'RECUPERO_TURNO_ESTADO_CAMBIADO', 'RECUPERO_PENDIENTE_PROGRAMADO', 'ASISTENCIA_FLEXIBLE_REGISTRADA', 'CLASE_FIJA_RESTABLECIDA', 'CLIENTE_REGISTRO_VACACIONES'].includes(log.accion)) return false;
      } else if (categoria === 'PROFESORES_CUPOS') {
        if (!['PROFESOR_TURNO_ASIGNADO', 'CUPO_TURNO_EDITADO'].includes(log.accion)) return false;
      }

      // 3. Filtro por fecha de creación o fecha indicada
      if (filtroFecha) {
        const fechaLog = log.creado_at.slice(0, 10);
        const fechaDetalle = log.detalles?.fecha || log.detalles?.fecha_recupero || log.detalles?.fecha_inasistencia;
        if (fechaLog !== filtroFecha && fechaDetalle !== filtroFecha) return false;
      }

      // 4. Búsqueda por texto (nombre socio, turno, usuario)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const detallesStr = JSON.stringify(log.detalles || {}).toLowerCase();
        const userEmail = (log.usuario_email || '').toLowerCase();
        const accion = log.accion.toLowerCase();
        if (!detallesStr.includes(term) && !userEmail.includes(term) && !accion.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, categoria, filtroFecha, searchTerm]);

  // Helper para badge y descripción amigable
  const getLogPresentation = (log: AuditLog) => {
    switch (log.accion) {
      case 'TURNO_ASIGNACION_FIJA':
        return {
          titulo: 'Asignación de Turno Fijo',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
          resumen: `Socio: ${log.detalles?.cliente || 'Socio'} -> Turno: ${log.detalles?.turno || log.detalles?.turno_id || ''}`
        };
      case 'TURNO_ASIGNACION_REMOCION':
        return {
          titulo: 'Baja de Turno Fijo',
          color: 'bg-red-50 text-red-800 border-red-200',
          icon: <UserMinus className="w-4 h-4 text-red-600" />,
          resumen: `Baja de turno: ${log.detalles?.turno_id || ''} (ID: ${log.detalles?.cliente_id || ''}). ${log.detalles?.promocion_automatica ? `Promoción: ${log.detalles.promocion_automatica}` : ''}`
        };
      case 'LISTA_ESPERA_PROMOCION_AUTO':
        return {
          titulo: '🎉 Promoción Automática de Lista de Espera',
          color: 'bg-lime-50 text-lime-900 border-lime-300',
          icon: <Sparkles className="w-4 h-4 text-lime-600" />,
          resumen: `¡Lugar liberado asignado a ${log.detalles?.cliente || 'Socio'}! Turno: ${log.detalles?.turno_id || ''} ${log.detalles?.fecha ? `(${log.detalles.fecha})` : ''}`
        };
      case 'TURNO_LISTA_ESPERA_AGREGADO':
      case 'LISTA_ESPERA_RESERVA_AGREGADO':
        return {
          titulo: 'Ingreso a Lista de Espera',
          color: 'bg-amber-50 text-amber-900 border-amber-200',
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          resumen: `Anotado en waitlist: ${log.detalles?.cliente || 'Socio'} -> Turno: ${log.detalles?.turno || log.detalles?.turno_id || ''} ${log.detalles?.fecha ? `(${log.detalles.fecha})` : ''}`
        };
      case 'RESERVA_INDIVIDUAL_CREADA':
        return {
          titulo: 'Reserva Tiempo Real',
          color: 'bg-sky-50 text-sky-900 border-sky-200',
          icon: <Calendar className="w-4 h-4 text-sky-600" />,
          resumen: `Reserva puntual: ${log.detalles?.cliente || 'Socio'} -> ${log.detalles?.turno_id || ''} (${log.detalles?.fecha || ''})`
        };
      case 'RESERVA_INDIVIDUAL_CANCELADA':
        return {
          titulo: 'Cancelación de Reserva',
          color: 'bg-rose-50 text-rose-900 border-rose-200',
          icon: <X className="w-4 h-4 text-rose-600" />,
          resumen: `Canceló reserva: ${log.detalles?.cliente || 'Socio'} -> ${log.detalles?.turno_id || ''} (${log.detalles?.fecha || ''}). ${log.detalles?.reintegrado ? 'Cupo reintegrado.' : 'Sin reintegro (menos de 3hs).'}`
        };
      case 'CLASE_FIJA_SUSPENDIDA':
        return {
          titulo: 'Aviso de Inasistencia / Clase Suspendida',
          color: 'bg-orange-50 text-orange-900 border-orange-200',
          icon: <AlertCircle className="w-4 h-4 text-orange-600" />,
          resumen: `Avisó que no viene: ${log.detalles?.cliente || 'Socio'} -> ${log.detalles?.turno_id || ''} (${log.detalles?.fecha || ''}). Lugar liberado para la comunidad.`
        };
      case 'CLASE_FIJA_RESTABLECIDA':
        return {
          titulo: 'Clase Fija Restablecida',
          color: 'bg-indigo-50 text-indigo-900 border-indigo-200',
          icon: <CheckCircle2 className="w-4 h-4 text-indigo-600" />,
          resumen: `Restableció asistencia: ${log.detalles?.cliente || 'Socio'} -> ${log.detalles?.turno_id || ''} (${log.detalles?.fecha || ''})`
        };
      case 'RECUPERO_TURNO_PROGRAMADO':
      case 'RECUPERO_PENDIENTE_PROGRAMADO':
        return {
          titulo: 'Recupero de Clase Programado',
          color: 'bg-purple-50 text-purple-900 border-purple-200',
          icon: <Calendar className="w-4 h-4 text-purple-600" />,
          resumen: `Recupero agendado: ${log.detalles?.cliente || 'Socio'} para ${log.detalles?.para_fecha || log.detalles?.fecha_recupero || 'Pendiente'}`
        };
      case 'PROFESOR_TURNO_ASIGNADO':
        return {
          titulo: 'Profesor Asignado a Turno',
          color: 'bg-cyan-50 text-cyan-900 border-cyan-200',
          icon: <User className="w-4 h-4 text-cyan-600" />,
          resumen: `Turno ${log.detalles?.turno_id || ''} asignado al profe: ${log.detalles?.profesor || 'Sin asignar'}`
        };
      case 'CUPO_TURNO_EDITADO':
        return {
          titulo: 'Modificación de Cupo',
          color: 'bg-zinc-100 text-zinc-900 border-zinc-300',
          icon: <Filter className="w-4 h-4 text-zinc-600" />,
          resumen: `Turno ${log.detalles?.turno_id || ''} -> Nuevo cupo máximo: ${log.detalles?.nuevo_cupo}`
        };
      default:
        return {
          titulo: log.accion.replace(/_/g, ' '),
          color: 'bg-zinc-50 text-zinc-800 border-zinc-200',
          icon: <History className="w-4 h-4 text-zinc-500" />,
          resumen: JSON.stringify(log.detalles || {})
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs font-sans text-xs animate-fade-in" id="modal-historial-turnos">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* HEADER */}
        <div className="bg-zinc-900 text-white p-5 sm:p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-800 rounded-xl border border-zinc-700 text-lime-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Historial de Movimientos de Turnos
                <span className="bg-lime-400 text-zinc-950 font-mono text-[10px] font-black px-2 py-0.5 rounded-full">
                  {logsTurnos.length}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Auditoría completa de altas, bajas, lista de espera, recuperos y asistencias en Matriz Fija y Turnera.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FILTROS */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Buscador de texto */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por socio, turno (ej: LUNES 18:00), operador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-xl text-xs outline-hidden focus:border-zinc-500 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 border-none bg-transparent cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por fecha */}
            <div>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full py-2 px-3 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-medium outline-hidden"
              />
            </div>
          </div>

          {/* Categorías pill */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {(['TODOS', 'ASIGNACIONES', 'BAJAS', 'WAITLIST', 'RECUPEROS', 'PROFESORES_CUPOS'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat)}
                className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  categoria === cat
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                {cat === 'TODOS' && 'Todos'}
                {cat === 'ASIGNACIONES' && '🟢 Asignaciones Fijas'}
                {cat === 'BAJAS' && '🔴 Bajas / Cancelaciones'}
                {cat === 'WAITLIST' && '🟡 Lista de Espera & Promociones'}
                {cat === 'RECUPEROS' && '🟣 Recuperos & Inasistencias'}
                {cat === 'PROFESORES_CUPOS' && '🔵 Profes / Cupos'}
              </button>
            ))}
          </div>
        </div>

        {/* LISTADO DE MOVIMIENTOS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {logsTurnos.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 space-y-2">
              <History className="w-8 h-8 mx-auto opacity-30" />
              <p className="font-semibold text-sm">No se encontraron movimientos registrados con estos filtros.</p>
              <p className="text-[11px]">Probá limpiando la búsqueda o seleccionando otra categoría.</p>
            </div>
          ) : (
            logsTurnos.map(log => {
              const pres = getLogPresentation(log);
              const fechaObj = new Date(log.creado_at);
              const fechaFmt = fechaObj.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              const horaFmt = fechaObj.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={log.id} 
                  className="bg-white border border-zinc-200/90 rounded-xl p-3.5 hover:shadow-xs transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-zinc-100 shrink-0 mt-0.5">
                      {pres.icon}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pres.color}`}>
                          {pres.titulo}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {log.usuario_email || 'sistema'}
                        </span>
                      </div>
                      <p className="text-zinc-800 font-semibold text-xs leading-relaxed break-words">
                        {pres.resumen}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono text-[10px] text-zinc-400 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                    <span className="font-bold text-zinc-600">{fechaFmt}</span>
                    <span>{horaFmt} hs</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono">
            Total en vista: <strong className="text-zinc-900">{logsTurnos.length}</strong> registro(s)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border-none"
          >
            Cerrar Historial
          </button>
        </div>

      </div>
    </div>
  );
};
