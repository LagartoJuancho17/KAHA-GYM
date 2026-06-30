// src/components/Clientes/ClientesTable.tsx
import React, { useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { Calendar, MoreVertical, Eye, Edit2, UserMinus, UserCheck, Trash2, Check } from 'lucide-react';

interface ClientesTableProps {
  clientesFiltrados: Cliente[];
  onSelectCliente: (c: Cliente) => void;
  onManageTurnos: (c: Cliente) => void;
  onStartEdit: (c: Cliente) => void;
  onDeleteClick: (c: Cliente) => void;
  openRowMenuId: string | null;
  setOpenRowMenuId: (id: string | null) => void;
  pagina: number;
  setPagina: React.Dispatch<React.SetStateAction<number>>;
  filasPorPagina: number;
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

export const ClientesTable: React.FC<ClientesTableProps> = ({
  clientesFiltrados,
  onSelectCliente,
  onManageTurnos,
  onStartEdit,
  onDeleteClick,
  openRowMenuId,
  setOpenRowMenuId,
  pagina,
  setPagina,
  filasPorPagina
}) => {
  const { planes, autorizarCliente, bajaLogicaCliente, altaCliente } = useGym();

  const totalPaginas = Math.ceil(clientesFiltrados.length / filasPorPagina) || 1;
  
  const clientesPaginados = useMemo(() => {
    const inicio = (pagina - 1) * filasPorPagina;
    return clientesFiltrados.slice(inicio, inicio + filasPorPagina);
  }, [clientesFiltrados, pagina, filasPorPagina]);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500 font-sans font-medium uppercase tracking-wider border-b border-zinc-200">
              <th className="p-4">Socio</th>
              <th className="p-4">Email / Celular</th>
              <th className="p-4">Días Asignados</th>
              <th className="p-4">Plan sugerido</th>
              <th className="p-4">Deuda</th>
              <th className="p-4">Último Mes Pago</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {clientesPaginados.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-400 font-sans">
                  Ningún socio coincide con los filtros aplicados actualmente.
                </td>
              </tr>
            ) : (
              clientesPaginados.map(c => {
                const plan = planes.find(p => p.id === c.plan_id);
                
                let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                let estadoLabel = 'Al Día';
                
                if (c.autorizado === false) {
                  badgeClass = 'bg-amber-150 text-amber-855 border-amber-250 animate-pulse';
                  estadoLabel = 'Pendiente';
                } else if (!c.activo || c.estado === 'INACTIVO') {
                  badgeClass = 'bg-zinc-100 text-zinc-600 border-zinc-200';
                  estadoLabel = 'Inactivo';
                } else if (c.estado === 'CON_DEUDA') {
                  badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                  estadoLabel = 'Con Deuda';
                } else if (c.estado === 'MOROSO') {
                  badgeClass = 'bg-red-50 text-red-600 border-red-100';
                  estadoLabel = 'Moroso';
                }

                return (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors font-sans border-b border-zinc-150" id={`row-cliente-${c.id}`}>
                    <td className="p-4 cursor-pointer" onClick={() => onSelectCliente(c)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 font-bold uppercase text-[10px] border border-zinc-205">
                          {c.nombre[0]}{c.apellido[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-955 text-xs flex items-center gap-2">
                            {c.apellido}, {c.nombre}
                            <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold border ${badgeClass}`}>
                              {estadoLabel}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">ID: {c.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 cursor-pointer" onClick={() => onSelectCliente(c)}>
                      <div className="text-zinc-650 font-medium">{c.email}</div>
                      <div className="text-zinc-450 text-[10px] flex items-center gap-1.5 mt-0.5">
                        <span>{c.telefono || 'Sin celular'}</span>
                        {c.telefono && (
                          <a
                            href={getWhatsAppLink(c.telefono)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center"
                            title="Enviar mensaje de WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm5.835-4.117c1.661.988 3.513 1.507 5.409 1.508 5.761 0 10.448-4.679 10.45-10.439.002-2.79-1.082-5.412-3.053-7.382C16.71 1.597 14.092.513 11.993.513c-5.759 0-10.443 4.69-10.447 10.45-.001 1.88.49 3.73 1.42 5.362L1.856 22.28l6.183-1.621c-1.552-1.012-1.769-1.096-2.147-1.397zM17.17 14.398c-.284-.144-1.685-.83-1.947-.925-.263-.096-.454-.144-.645.144-.191.288-.741.925-.907 1.117-.167.19-.334.215-.618.072-.284-.144-1.202-.442-2.29-1.41-1.077-.96-1.804-2.148-2.015-2.51-.21-.362-.023-.558.158-.737.163-.162.363-.424.544-.637.182-.213.243-.362.364-.604.122-.241.06-.454-.03-.645-.09-.192-.646-1.56-.885-2.138-.233-.56-.47-.482-.645-.491-.167-.008-.358-.01-.55-.01s-.502.072-.765.362c-.263.288-1.004.978-1.004 2.384 0 1.406 1.028 2.763 1.171 2.955.143.192 2.023 3.084 4.9 4.323.684.295 1.218.47 1.635.6.688.219 1.314.188 1.81.114.551-.082 1.685-.688 1.925-1.353.24-.665.24-1.233.167-1.353-.072-.119-.263-.191-.547-.334z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => onManageTurnos(c)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/65 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Click para gestionar turnos fijos asignados"
                      >
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {c.turnos_fijos.length} / {plan?.dias_por_semana || 5}
                        </span>
                      </button>
                    </td>
                    <td className="p-4 cursor-pointer" onClick={() => onSelectCliente(c)}>
                      <span className="font-semibold text-zinc-800">{plan ? plan.nombre : 'Plan Genérico'}</span>
                    </td>
                    <td className="p-4 cursor-pointer" onClick={() => onSelectCliente(c)}>
                      <span className={`font-mono font-bold ${c.deuda_acumulada > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                        ${c.deuda_acumulada.toLocaleString('es-AR')}
                      </span>
                    </td>
                    <td className="p-4 cursor-pointer font-mono text-zinc-650" onClick={() => onSelectCliente(c)}>{c.ultimo_mes_pagado || 'Sin pagos'}</td>
                    <td className="p-4 relative">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenRowMenuId(openRowMenuId === c.id ? null : c.id);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 rounded-md border border-zinc-200/50 transition-colors cursor-pointer"
                          title="Más opciones"
                          id={`btn-menu-${c.id}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openRowMenuId === c.id && (
                          <div className="absolute right-4 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-40 animate-fade-in font-sans text-xs">
                            {/* AUTORIZAR ACCESO (solo si está pendiente) */}
                            {c.autorizado === false && (
                              <button
                                onClick={() => {
                                  setOpenRowMenuId(null);
                                  autorizarCliente(c.id);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2 transition-colors cursor-pointer border-b border-zinc-100"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Autorizar Acceso
                              </button>
                            )}

                            {/* VER DETALLE */}
                            <button
                              onClick={() => {
                                setOpenRowMenuId(null);
                                onSelectCliente(c);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-zinc-400" />
                              Ver Ficha Completa
                            </button>

                            {/* EDITAR */}
                            <button
                              onClick={() => {
                                setOpenRowMenuId(null);
                                onStartEdit(c);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                              Modificar Socio
                            </button>

                            {/* DAR DE BAJA / ALTA LOGICA */}
                            {c.activo ? (
                              <button
                                onClick={() => {
                                  setOpenRowMenuId(null);
                                  bajaLogicaCliente(c.id);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-amber-700 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <UserMinus className="w-3.5 h-3.5 text-amber-500" />
                                Dar de Baja
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setOpenRowMenuId(null);
                                  altaCliente(c.id);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-emerald-700 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                Dar de Alta
                              </button>
                            )}

                            {/* ELIMINAR PERMANENTE */}
                            <button
                              onClick={() => {
                                setOpenRowMenuId(null);
                                onDeleteClick(c);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 hover:text-red-700 font-medium flex items-center gap-2 transition-colors cursor-pointer border-t border-zinc-100"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              Eliminar Permanente
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

      {/* PAGINACIÓN CONTROLLER */}
      <div className="bg-zinc-50 px-4 py-3 border-t border-zinc-200 flex items-center justify-between text-xs font-sans text-zinc-500">
        <div>
          Mostrando <span className="font-semibold text-zinc-900">{clientesFiltrados.length === 0 ? 0 : (pagina - 1) * filasPorPagina + 1}</span> a{' '}
          <span className="font-semibold text-zinc-900">{Math.min(clientesFiltrados.length, pagina * filasPorPagina)}</span> de{' '}
          <span className="font-semibold text-zinc-900">{clientesFiltrados.length}</span> alumnos
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPagina(prev => Math.max(1, prev - 1))}
            disabled={pagina === 1}
            className="px-3 py-1.5 border border-zinc-200 rounded-md bg-white hover:bg-zinc-50 disabled:opacity-40 select-none text-zinc-700 text-xs font-medium cursor-pointer"
            id="pagination-prev"
          >
            Anterior
          </button>
          <button
            onClick={() => setPagina(prev => Math.min(totalPaginas, prev + 1))}
            disabled={pagina === totalPaginas}
            className="px-3 py-1.5 border border-zinc-200 rounded-md bg-white hover:bg-zinc-50 disabled:opacity-40 select-none text-zinc-700 text-xs font-medium cursor-pointer"
            id="pagination-next"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};
