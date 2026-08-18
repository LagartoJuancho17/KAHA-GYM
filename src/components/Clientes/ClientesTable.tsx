// src/components/Clientes/ClientesTable.tsx
import React, { useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { Calendar, MoreVertical, Eye, Edit2, Trash2, Check, CalendarX, CreditCard, User } from 'lucide-react';

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
  onStartAuthorization?: (clientId: string) => void;
  onOpenBajaClases?: (c: Cliente) => void;
  onAssignPlan?: (c: Cliente) => void;
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

// Estado (badge) unificado para tabla y cards
const getEstadoBadge = (c: Cliente): { badgeClass: string; estadoLabel: string } => {
  if (c.autorizado === false) {
    return { badgeClass: 'bg-amber-100 text-amber-900 border-amber-200 animate-pulse', estadoLabel: 'Pendiente' };
  }
  if (c.estado === 'MOROSO' || (!c.activo && c.deuda_acumulada > 0)) {
    return { badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 font-bold', estadoLabel: 'Moroso (Baja)' };
  }
  if (!c.activo || c.estado === 'INACTIVO') {
    return { badgeClass: 'bg-zinc-100 text-zinc-600 border-zinc-200', estadoLabel: 'Inactivo' };
  }
  if (c.estado === 'CON_DEUDA') {
    return { badgeClass: 'bg-amber-50 text-amber-700 border-amber-100', estadoLabel: 'Con Deuda' };
  }
  return { badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100', estadoLabel: 'Al Día' };
};

const WhatsAppIcon: React.FC<{ phone: string }> = ({ phone }) => (
  <a
    href={getWhatsAppLink(phone)}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center"
    title="Enviar mensaje de WhatsApp"
  >
    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm5.835-4.117c1.661.988 3.513 1.507 5.409 1.508 5.761 0 10.448-4.679 10.45-10.439.002-2.79-1.082-5.412-3.053-7.382C16.71 1.597 14.092.513 11.993.513c-5.759 0-10.443 4.69-10.447 10.45-.001 1.88.49 3.73 1.42 5.362L1.856 22.28l6.183-1.621c-1.552-1.012-1.769-1.096-2.147-1.397zM17.17 14.398c-.284-.144-1.685-.83-1.947-.925-.263-.096-.454-.144-.645.144-.191.288-.741.925-.907 1.117-.167.19-.334.215-.618.072-.284-.144-1.202-.442-2.29-1.41-1.077-.96-1.804-2.148-2.015-2.51-.21-.362-.023-.558.158-.737.163-.162.363-.424.544-.637.182-.213.243-.362.364-.604.122-.241.06-.454-.03-.645-.09-.192-.646-1.56-.885-2.138-.233-.56-.47-.482-.645-.491-.167-.008-.358-.01-.55-.01s-.502.072-.765.362c-.263.288-1.004.978-1.004 2.384 0 1.406 1.028 2.763 1.171 2.955.143.192 2.023 3.084 4.9 4.323.684.295 1.218.47 1.635.6.688.219 1.314.188 1.81.114.551-.082 1.685-.688 1.925-1.353.24-.665.24-1.233.167-1.353-.072-.119-.263-.191-.547-.334z" />
    </svg>
  </a>
);

// Menú de acciones (compartido por tabla y cards)
interface SocioActionsMenuProps {
  c: Cliente;
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  onSelectCliente: (c: Cliente) => void;
  onManageTurnos: (c: Cliente) => void;
  onStartEdit: (c: Cliente) => void;
  onDeleteClick: (c: Cliente) => void;
  onStartAuthorization?: (clientId: string) => void;
  onOpenBajaClases?: (c: Cliente) => void;
  onAssignPlan?: (c: Cliente) => void;
}

const SocioActionsMenu: React.FC<SocioActionsMenuProps> = ({
  c, isOpen, toggle, close,
  onSelectCliente, onManageTurnos, onStartEdit, onDeleteClick,
  onStartAuthorization, onOpenBajaClases, onAssignPlan
}) => {
  const { autorizarCliente } = useGym();
  return (
    <div className="relative shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className="p-1.5 text-zinc-500 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 rounded-md border border-zinc-200/50 transition-colors cursor-pointer"
        title="Más opciones"
        id={`btn-menu-${c.id}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* backdrop para cerrar al tocar afuera */}
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); close(); }} />
          <div className="absolute right-0 mt-2 w-52 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-50 animate-fade-in font-sans text-xs">
            {c.autorizado === false && (
              <button
                onClick={() => { close(); onStartAuthorization ? onStartAuthorization(c.id) : autorizarCliente(c.id); }}
                className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2 transition-colors cursor-pointer border-b border-zinc-100"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Autorizar Acceso
              </button>
            )}
            <button
              onClick={() => { close(); onSelectCliente(c); }}
              className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              Ver Ficha Completa
            </button>
            <button
              onClick={() => { close(); onStartEdit(c); }}
              className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
              Modificar Socio
            </button>
            <button
              onClick={() => { close(); onAssignPlan && onAssignPlan(c); }}
              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-indigo-800 font-semibold flex items-center gap-2 transition-colors cursor-pointer border-t border-zinc-100"
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              Asignar / Cambiar Plan
            </button>
            <button
              onClick={() => { close(); onManageTurnos(c); }}
              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-2 transition-colors cursor-pointer border-t border-zinc-100"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Asignar Turnos
            </button>
            <button
              onClick={() => { close(); onOpenBajaClases && onOpenBajaClases(c); }}
              className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-700 font-medium flex items-center gap-2 transition-colors cursor-pointer border-t border-zinc-100"
            >
              <CalendarX className="w-3.5 h-3.5 text-rose-500" />
              Ausencia / Vacaciones / Viaje
            </button>
            <button
              onClick={() => { close(); onDeleteClick(c); }}
              className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 hover:text-red-700 font-medium flex items-center gap-2 transition-colors cursor-pointer border-t border-zinc-100"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              Eliminar Permanente
            </button>
          </div>
        </>
      )}
    </div>
  );
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
  filasPorPagina,
  onStartAuthorization,
  onOpenBajaClases,
  onAssignPlan
}) => {
  const { planes, turnos } = useGym();

  const totalPaginas = Math.ceil(clientesFiltrados.length / filasPorPagina) || 1;

  React.useEffect(() => {
    if (pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [pagina, totalPaginas, setPagina]);

  const clientesPaginados = useMemo(() => {
    const inicio = (pagina - 1) * filasPorPagina;
    return clientesFiltrados.slice(inicio, inicio + filasPorPagina);
  }, [clientesFiltrados, pagina, filasPorPagina]);

  // Datos derivados de cada socio (compartidos entre card y fila)
  const getSocioData = (c: Cliente) => {
    const plan = planes.find(p => p.id === c.plan_id);
    const maxDias = c.dias_personalizados ?? plan?.dias_por_semana ?? 5;
    const precio = c.precio_personalizado ?? plan?.precio ?? 0;
    const esPersonalizado = c.precio_personalizado != null || c.dias_personalizados != null;
    const turnosChips = (c.turnos_fijos || [])
      .map(tfId => turnos.find(t => t.id === tfId))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
    const profes = Array.from(new Set(
      turnosChips.map(t => t.profesor).filter((p): p is string => Boolean(p && p.trim()))
    ));
    return { plan, maxDias, precio, esPersonalizado, turnosChips, profes };
  };

  const menuProps = (c: Cliente) => ({
    c,
    isOpen: openRowMenuId === c.id,
    toggle: () => setOpenRowMenuId(openRowMenuId === c.id ? null : c.id),
    close: () => setOpenRowMenuId(null),
    onSelectCliente, onManageTurnos, onStartEdit, onDeleteClick,
    onStartAuthorization, onOpenBajaClases, onAssignPlan
  });

  return (
    <div className="space-y-3">

      {/* ===== VISTA CARDS (mobile / tablet) ===== */}
      <div className="lg:hidden space-y-3">
        {clientesPaginados.length === 0 ? (
          <div className="bg-white border border-dashed border-zinc-200 rounded-2xl p-8 text-center text-zinc-400 font-sans text-xs">
            Ningún socio coincide con los filtros aplicados actualmente.
          </div>
        ) : (
          clientesPaginados.map(c => {
            const { plan, maxDias, precio, esPersonalizado, turnosChips, profes } = getSocioData(c);
            const { badgeClass, estadoLabel } = getEstadoBadge(c);
            return (
              <div
                key={c.id}
                id={`row-cliente-${c.id}`}
                className="bg-white border border-zinc-200 rounded-2xl shadow-xs p-4 font-sans"
              >
                {/* Header: avatar + nombre + estado + menú */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => onSelectCliente(c)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-950 text-sm leading-tight truncate">
                        {c.apellido}, {c.nombre}
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-[9px] rounded-full font-bold border ${badgeClass}`}>
                        {estadoLabel}
                      </span>
                    </div>
                  </button>
                  {/* WhatsApp + menú */}
                  <div className="flex items-center gap-1 shrink-0">
                    {c.telefono && <WhatsAppIcon phone={c.telefono} />}
                    <SocioActionsMenu {...menuProps(c)} />
                  </div>
                </div>


                {/* Grid de datos clave */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {/* Plan */}
                  <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 min-w-0">
                    <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Plan</div>
                    <div className="font-bold text-zinc-800 truncate flex items-center gap-1">
                      {plan ? plan.nombre : 'Genérico'}
                      {esPersonalizado && <span className="text-violet-500 text-[10px]">✦</span>}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">${precio.toLocaleString('es-AR')}/mes</div>
                  </div>

                  {/* Deuda */}
                  <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2">
                    <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Deuda</div>
                    <div className={`font-mono font-bold text-sm ${c.deuda_acumulada > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${c.deuda_acumulada.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">
                      Últ: {c.ultimo_mes_pagado || 'Sin pagos'}
                    </div>
                  </div>
                </div>

                {/* Días fijos: botón + chips */}
                <div className="mt-2">
                  <button
                    onClick={() => onManageTurnos(c)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/65 transition-colors flex items-center justify-between gap-1.5 cursor-pointer"
                    title="Gestionar turnos fijos asignados"
                  >
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      Días fijos
                    </span>
                    <span className="font-mono font-bold">{c.turnos_fijos.length} / {maxDias}</span>
                  </button>

                  {turnosChips.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {turnosChips.map(t => (
                        <span key={t.id} className="text-[9.5px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {t.dia.slice(0, 3)} {t.hora.slice(0, 5)}hs
                        </span>
                      ))}
                    </div>
                  )}

                  {profes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {profes.map(pName => (
                        <span key={pName} className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-violet-100 text-violet-800 border border-violet-200 flex items-center gap-0.5">
                          <User className="w-2.5 h-2.5" /> {pName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== VISTA TABLA (desktop) ===== */}
      <div className="hidden lg:block bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[720px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 font-sans font-medium uppercase tracking-wider border-b border-zinc-200">
                <th className="p-4">Socio</th>
                <th className="p-4">Celular</th>
                <th className="p-4">Días Fijos Asignados</th>
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
                  const { plan, maxDias, precio, esPersonalizado, turnosChips, profes } = getSocioData(c);
                  const { badgeClass, estadoLabel } = getEstadoBadge(c);
                  return (
                    <tr key={c.id} className="hover:bg-zinc-50 transition-colors font-sans border-b border-zinc-100" id={`row-cliente-desktop-${c.id}`}>
                      <td className="p-4 cursor-pointer" onClick={() => onSelectCliente(c)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 font-bold uppercase text-[10px] border border-zinc-200">
                            {c.nombre[0]}{c.apellido[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-950 text-xs flex items-center gap-2">
                              {c.apellido}, {c.nombre}
                              <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold border ${badgeClass}`}>
                                {estadoLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => onSelectCliente(c)}>
                        <div className="text-zinc-700 font-semibold text-xs flex items-center gap-1.5">
                          <span>{c.telefono || 'Sin celular'}</span>
                          {c.telefono && <WhatsAppIcon phone={c.telefono} />}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => onManageTurnos(c)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/65 transition-colors flex items-center gap-1.5 cursor-pointer w-fit"
                            title="Click para gestionar turnos fijos asignados"
                          >
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{c.turnos_fijos.length} / {maxDias} días</span>
                          </button>
                          {turnosChips.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5 max-w-[220px]">
                              {turnosChips.map(t => (
                                <span key={t.id} className="text-[9.5px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shadow-3xs">
                                  {t.dia.slice(0, 3)} {t.hora.slice(0, 5)}hs
                                </span>
                              ))}
                            </div>
                          )}
                          {profes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {profes.map(pName => (
                                <span key={pName} className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-violet-100 text-violet-800 border border-violet-200 flex items-center gap-0.5 font-sans">
                                  👤 {pName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => onSelectCliente(c)}>
                        <span className="font-semibold text-zinc-800">{plan ? plan.nombre : 'Plan Genérico'}</span>
                        {esPersonalizado && (
                          <span className="ml-1.5 text-[8px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            ✦ Personalizado
                          </span>
                        )}
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          ${precio.toLocaleString('es-AR')}/mes
                          {c.precio_personalizado != null && <span className="text-violet-500"> ↑ especial</span>}
                        </div>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => onSelectCliente(c)}>
                        <span className={`font-mono font-bold ${c.deuda_acumulada > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                          ${c.deuda_acumulada.toLocaleString('es-AR')}
                        </span>
                      </td>
                      <td className="p-4 cursor-pointer font-mono text-zinc-600" onClick={() => onSelectCliente(c)}>{c.ultimo_mes_pagado || 'Sin pagos'}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          <SocioActionsMenu {...menuProps(c)} />
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

      {/* ===== PAGINACIÓN (compartida) ===== */}
      <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-xs font-sans text-zinc-500 shadow-xs">
        <div className="min-w-0">
          <span className="hidden sm:inline">Mostrando </span>
          <span className="font-semibold text-zinc-900">{clientesFiltrados.length === 0 ? 0 : (pagina - 1) * filasPorPagina + 1}</span>
          <span>–</span>
          <span className="font-semibold text-zinc-900">{Math.min(clientesFiltrados.length, pagina * filasPorPagina)}</span>
          <span> de </span>
          <span className="font-semibold text-zinc-900">{clientesFiltrados.length}</span>
          <span className="hidden sm:inline"> alumnos</span>
        </div>
        <div className="flex gap-1.5 shrink-0">
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
