import React from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { Edit2, X, Trash2, Calendar, Clock, Users, BookOpen, CheckCircle } from 'lucide-react';

interface ClienteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string | null;
  onStartEdit: (cl: Cliente) => void;
  onDeleteClick: (cl: Cliente) => void;
}

const getWhatsAppLink = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return '';
  let formattedPhone = cleanPhone;
  if (!formattedPhone.startsWith('54')) {
    if (formattedPhone.startsWith('9')) {
      formattedPhone = '54' + formattedPhone;
    } else if (formattedPhone.startsWith('15')) {
      formattedPhone = '549' + formattedPhone.substring(2);
    } else {
      formattedPhone = '549' + formattedPhone;
    }
  }
  return `https://wa.me/${formattedPhone}`;
};

const DIA_LABEL: Record<string, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie'
};

const DIA_COLOR: Record<string, string> = {
  LUNES:    'bg-indigo-50 border-indigo-200 text-indigo-800',
  MARTES:   'bg-violet-50 border-violet-200 text-violet-800',
  MIERCOLES:'bg-sky-50 border-sky-200 text-sky-800',
  JUEVES:   'bg-amber-50 border-amber-200 text-amber-800',
  VIERNES:  'bg-rose-50 border-rose-200 text-rose-800',
};

export const ClienteProfileModal: React.FC<ClienteProfileModalProps> = ({
  isOpen,
  onClose,
  clienteId,
  onStartEdit,
  onDeleteClick
}) => {
  const { clientes, planes, pagos, turnos } = useGym();

  if (!isOpen || !clienteId) return null;

  const selectedCliente = clientes.find(c => c.id === clienteId);
  if (!selectedCliente) return null;

  const plan = planes.find(p => p.id === selectedCliente.plan_id);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="profile-detailed-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden relative animate-scale-in">
        
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lime-400 font-bold uppercase text-lg">
              {selectedCliente.nombre[0]}{selectedCliente.apellido[0]}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">{selectedCliente.nombre} {selectedCliente.apellido}</h3>
              <p className="text-zinc-400 text-xs">Socio registrado el {new Date(selectedCliente.creado_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onStartEdit(selectedCliente);
                onClose();
              }}
              className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-zinc-700"
              id="btn-edit-profile-shortcut"
              title="Editar ficha"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              id="btn-close-profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Información Personal */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
              <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Código / ID de Socio</span>
              <span className="font-mono font-bold text-zinc-900 block">{selectedCliente.codigo_socio || selectedCliente.id}</span>
            </div>
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
              <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Correo Electrónico</span>
              <span className="font-semibold text-zinc-900 block">{selectedCliente.email}</span>
            </div>
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Celular</span>
                <span className="font-semibold text-zinc-900 block">{selectedCliente.telefono || 'Sin registrar'}</span>
              </div>
              {selectedCliente.telefono && (
                <a
                  href={getWhatsAppLink(selectedCliente.telefono)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center justify-center border border-emerald-200"
                  title="Enviar mensaje de WhatsApp"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm5.835-4.117c1.661.988 3.513 1.507 5.409 1.508 5.761 0 10.448-4.679 10.45-10.439.002-2.79-1.082-5.412-3.053-7.382C16.71 1.597 14.092.513 11.993.513c-5.759 0-10.443 4.69-10.447 10.45-.001 1.88.49 3.73 1.42 5.362L1.856 22.28l6.183-1.621c-1.552-1.012-1.769-1.096-2.147-1.397zM17.17 14.398c-.284-.144-1.685-.83-1.947-.925-.263-.096-.454-.144-.645.144-.191.288-.741.925-.907 1.117-.167.19-.334.215-.618.072-.284-.144-1.202-.442-2.29-1.41-1.077-.96-1.804-2.148-2.015-2.51-.21-.362-.023-.558.158-.737.163-.162.363-.424.544-.637.182-.213.243-.362.364-.604.122-.241.06-.454-.03-.645-.09-.192-.646-1.56-.885-2.138-.233-.56-.47-.482-.645-.491-.167-.008-.358-.01-.55-.01s-.502.072-.765.362c-.263.288-1.004.978-1.004 2.384 0 1.406 1.028 2.763 1.171 2.955.143.192 2.023 3.084 4.9 4.323.684.295 1.218.47 1.635.6.688.219 1.314.188 1.81.114.551-.082 1.685-.688 1.925-1.353.24-.665.24-1.233.167-1.353-.072-.119-.263-.191-.547-.334z"/>
                  </svg>
                </a>
              )}
            </div>
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
              <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Tipo de Membresía</span>
              <span className="font-bold text-zinc-900 block">{selectedCliente.tipo}</span>
            </div>
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
              <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Deuda Acumulada</span>
              <span className={`font-mono font-bold block ${selectedCliente.deuda_acumulada > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ${selectedCliente.deuda_acumulada.toLocaleString('es-AR')}
              </span>
            </div>
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100 col-span-2">
              <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Exención / Excepción de Cobro</span>
              <span className="font-bold text-zinc-900 block mt-1">
                {selectedCliente.exencion_cobro === 'NINGUNA' || !selectedCliente.exencion_cobro ? (
                  <span className="text-zinc-500 font-sans text-xs">Ninguna (Estándar)</span>
                ) : selectedCliente.exencion_cobro === 'SUSPENDIDO' ? (
                  <span className="text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 uppercase text-[9px] font-bold">Suspensión momentánea</span>
                ) : selectedCliente.exencion_cobro === 'POSTERGADO' ? (
                  <span className="text-cyan-600 bg-cyan-50 px-2.5 py-0.5 rounded border border-cyan-200 uppercase text-[9px] font-bold">Postergación autorizada</span>
                ) : (
                  <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 uppercase text-[9px] font-bold">Perdonado / Exento</span>
                )}
              </span>
            </div>
          </div>

          {/* Plan contratado */}
          <div className="border border-zinc-200 p-4 rounded-xl">
            <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider mb-2 font-sans border-b border-zinc-100 pb-2">Plan Contratado</h4>
            <div className="flex justify-between items-center text-xs">
              <div>
                <span className="font-semibold text-zinc-950 block">{plan?.nombre || 'Ninguno'}</span>
                <span className="text-zinc-400 font-sans text-[11px]">{plan?.dias_por_semana || 0} sesiones fijas permitidas por semana</span>
              </div>
              <span className="text-sm font-mono font-bold text-zinc-900">${plan?.precio.toLocaleString('es-AR') || 0} ARS/Mes</span>
            </div>
          </div>

          {/* Turnos asignados fijos */}
          <div className="border border-zinc-200 p-4 rounded-xl">
            <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider mb-3 font-sans border-b border-zinc-100 pb-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Turnos Fijos Asignados
              <span className="ml-auto bg-zinc-100 text-zinc-600 font-mono px-2 py-0.5 rounded-full text-[9px] font-bold">
                {selectedCliente.tipo === 'FIJO' ? `${selectedCliente.turnos_fijos.length} turno${selectedCliente.turnos_fijos.length !== 1 ? 's' : ''}` : 'N/A'}
              </span>
            </h4>
            {selectedCliente.tipo === 'FLEXIBLE' ? (
              <p className="text-zinc-400 italic text-xs">Los socios FLEXIBLE no tienen turnos fijos. Asisten según cupos libres diarios.</p>
            ) : selectedCliente.turnos_fijos.length === 0 ? (
              <p className="text-zinc-400 italic text-xs">Sin turnos fijos asignados. Podés reservarlos desde el panel de Turnos.</p>
            ) : (
              <div className="space-y-2">
                {selectedCliente.turnos_fijos.map(tId => {
                  const turno = turnos.find(t => t.id === tId);
                  if (!turno) {
                    return (
                      <div key={tId} className="bg-zinc-50 border border-zinc-200 py-2 px-3 rounded-lg text-xs text-zinc-500 font-mono">
                        {tId} <span className="text-zinc-300">(sin datos)</span>
                      </div>
                    );
                  }
                  const ocupacion = Math.round((turno.asignados_ids.length / turno.cupo_maximo) * 100);
                  const colorClass = DIA_COLOR[turno.dia] || 'bg-zinc-50 border-zinc-200 text-zinc-800';
                  return (
                    <div key={tId} className={`border rounded-xl p-3 ${colorClass}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{DIA_LABEL[turno.dia] || turno.dia}</span>
                          <span className="font-mono font-bold text-sm flex items-center gap-1">
                            <Clock className="w-3 h-3 opacity-60" />
                            {turno.hora}hs
                          </span>
                          {turno.profesor && (
                            <span className="text-[10px] bg-white/70 px-2 py-0.5 rounded-full border border-current/20 font-medium">
                              👤 {turno.profesor}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 justify-end text-[10px] font-semibold">
                            <Users className="w-3 h-3 opacity-60" />
                            <span>{turno.asignados_ids.length}/{turno.cupo_maximo}</span>
                          </div>
                          <div className="w-16 bg-black/10 rounded-full h-1 mt-1">
                            <div
                              className="h-1 rounded-full bg-current"
                              style={{ width: `${Math.min(ocupacion, 100)}%`, opacity: 0.5 }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Turno Variable Reservado */}
          <div className="border border-zinc-200 p-4 rounded-xl">
            <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider mb-3 font-sans border-b border-zinc-100 pb-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              Turno Variable Reservado (Tiempo Real)
            </h4>
            {selectedCliente.turno_variable ? (() => {
              const tv = turnos.find(t => t.id === selectedCliente.turno_variable);
              return (
                <div className="bg-emerald-50 border border-emerald-200 py-3 px-4 rounded-xl">
                  <div className="flex items-center justify-between gap-3 text-emerald-900">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
                      <div>
                        <span className="font-bold text-xs block">
                          {tv ? `${tv.dia} — ${tv.hora}hs` : selectedCliente.turno_variable}
                        </span>
                        {tv?.profesor && (
                          <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                            👤 Profe: {tv.profesor}
                          </span>
                        )}
                      </div>
                    </div>
                    {tv && (
                      <div className="text-right text-[10px] text-emerald-700 font-semibold">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {tv.asignados_ids.length}/{tv.cupo_maximo} fijos
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <p className="text-zinc-400 italic text-xs">Sin reserva de turno variable activa actualmente.</p>
            )}
          </div>

          {/* Reservas Individuales */}
          {(selectedCliente.reservas_individuales && selectedCliente.reservas_individuales.length > 0) && (
            <div className="border border-zinc-200 p-4 rounded-xl">
              <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider mb-3 font-sans border-b border-zinc-100 pb-2 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                Reservas de Fechas Individuales
                <span className="ml-auto bg-sky-50 text-sky-600 font-mono px-2 py-0.5 rounded-full text-[9px] font-bold border border-sky-100">
                  {selectedCliente.reservas_individuales.length} reserva{selectedCliente.reservas_individuales.length !== 1 ? 's' : ''}
                </span>
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {[...selectedCliente.reservas_individuales]
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map(res => {
                    const turno = turnos.find(t => t.id === res.turno_id);
                    const fechaObj = new Date(res.fecha + 'T12:00:00');
                    const esPasado = fechaObj < new Date();
                    return (
                      <div key={res.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${esPasado ? 'bg-zinc-50 border-zinc-100 text-zinc-500' : 'bg-sky-50 border-sky-100 text-sky-900'}`}>
                        <div className="flex items-center gap-2">
                          {esPasado
                            ? <CheckCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            : <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                          }
                          <span className="font-semibold">
                            {fechaObj.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          {turno && <span className="font-mono text-[10px] opacity-70">{turno.hora}hs</span>}
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${esPasado ? 'bg-zinc-200 text-zinc-500' : 'bg-sky-200 text-sky-700'}`}>
                          {esPasado ? 'Realizada' : 'Próxima'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Historial de Pagos */}
          <div className="border border-zinc-200 p-4 rounded-xl">
            <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider mb-2 font-sans border-b border-zinc-100 pb-2">Historial de Pagos Registrados</h4>
            {(() => {
              const clientePagos = pagos.filter(p => p.cliente_id === selectedCliente.id);
              if (clientePagos.length === 0) {
                return <p className="text-zinc-400 italic text-xs">No se registran antecedentes de cobros para este alumno.</p>;
              }
              return (
                <div className="space-y-2 max-h-40 overflow-y-auto text-xs font-sans">
                  {clientePagos.map(pay => (
                    <div key={pay.id} className="flex justify-between items-center p-2 hover:bg-zinc-50 rounded-lg border border-zinc-100">
                      <div>
                        <span className="font-semibold text-zinc-900 block">Mes correspondiente: {pay.mes_correspondiente}</span>
                        <span className="text-zinc-400 text-[10px]">Medio: {pay.medio_pago} | {new Date(pay.fecha_pago).toLocaleDateString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-600 block">${pay.monto.toLocaleString('es-AR')}</span>
                        <span className="text-[9px] text-zinc-400 font-mono block">Ref: {pay.hash_transaccion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-100 flex gap-3 justify-end bg-zinc-50 -mx-6 -mb-6 p-6">
            <button
              onClick={() => {
                onDeleteClick(selectedCliente);
                onClose();
              }}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-colors cursor-pointer"
              id="btn-delete-profile-modal"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span>Eliminar Permanente</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold font-sans transition-colors cursor-pointer"
              id="btn-close-profile-modal-footer"
            >
              Cerrar Perfil
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
