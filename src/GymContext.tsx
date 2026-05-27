// src/GymContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Cliente, Plan, HistorialPrecioPlan, Turno, Pago, 
  RecuperoTurno, AuditLog, RolUsuario, TipoCliente, EstadoCliente, MedioPago, Novedad 
} from './types';
import { 
  INITIAL_PLANES, INITIAL_HISTORIAL_PRECIOS, generarTurnosIniciales, 
  INITIAL_CLIENTES, INITIAL_PAGOS, INITIAL_AUDIT_LOGS, INITIAL_RECUPEROS, INITIAL_NOVEDADES 
} from './initialMockData';

interface GymContextType {
  clientes: Cliente[];
  planes: Plan[];
  historialPrecios: HistorialPrecioPlan[];
  turnos: Turno[];
  pagos: Pago[];
  recuperos: RecuperoTurno[];
  auditLogs: AuditLog[];
  novedades: Novedad[];
  rolActivo: RolUsuario;
  setRolActivo: (rol: RolUsuario) => void;
  selectedSocioId: string | null;
  setSelectedSocioId: (id: string | null) => void;
  
  // Google Authentication simulation states
  googleUser: { email: string; name: string; picture?: string; role: RolUsuario } | null;
  signInWithGoogle: (email: string, name: string, picture?: string) => void;
  signOutGoogle: () => void;
  
  // Clientes Methods
  addCliente: (cliente: Omit<Cliente, 'id' | 'creado_at' | 'deuda_acumulada' | 'ultimo_mes_pagado' | 'estado' | 'turnos_fijos' | 'activo'>) => { success: boolean; message: string; duplicate?: boolean };
  updateCliente: (id: string, updates: Partial<Cliente>) => { success: boolean; message: string };
  bajaLogicaCliente: (id: string) => void;
  altaCliente: (id: string) => void;
  eliminarCliente: (id: string) => void;
  importarClientesCSV: (clientesImportados: Array<{ nombre: string; apellido: string; email: string; telefono: string; tipo: TipoCliente; plan_nombre: string }>) => { procesados: number; insertados: number; errores: string[] };

  // Planes Methods
  updatePrecioPlan: (planId: string, nuevoPrecio: number, userEmail: string) => void;

  // Turnos Methods
  asignarClienteFijo: (clienteId: string, turnoId: string) => { success: boolean; message: string; putInWaitlist?: boolean };
  removerAsignacionFija: (clienteId: string, turnoId: string) => void;
  asignarTurnoVariable: (clienteId: string, turnoId: string | null) => { success: boolean; message: string };
  checkInFlexible: (clienteId: string, turnoId: string) => { success: boolean; message: string };
  agregarRecupero: (recupero: Omit<RecuperoTurno, 'id' | 'estado'>) => { success: boolean; message: string };
  actualizarEstadoRecupero: (id: string, estado: 'PENDIENTE' | 'COMPLETADO' | 'EXPIRADO') => void;
  modificarPrecioOCupoTurno: (turnoId: string, nuevoCupo: number) => void;

  // Pagos Methods
  registrarPago: (pago: Omit<Pago, 'id' | 'creado_at' | 'fecha_pago'>, userEmail: string) => { success: boolean; message: string };
  importarPagosCSV: (pagosImportados: Array<{ cliente_email: string; monto: number; fecha_pago: string; medio_pago: MedioPago; mes: string; hash: string }>, userEmail: string) => { procesados: number; insertados: number; duplicados: number; errores: string[] };
  
  // Novedades Methods
  addNovedad: (novedad: Omit<Novedad, 'id' | 'fecha'>) => { success: boolean; message: string };
  updateNovedad: (id: string, updates: Partial<Novedad>) => { success: boolean; message: string };
  deleteNovedad: (id: string) => void;

  // Morosidad Simulation
  ejecutarCronMorosidad: (simularFecha: string) => { procesados: number; nuevosMorosos: number; deudaTotal: number };
  borrarHistorial: () => void;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [historialPrecios, setHistorialPrecios] = useState<HistorialPrecioPlan[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [recuperos, setRecuperos] = useState<RecuperoTurno[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [googleUser, setGoogleUser] = useState<{ email: string; name: string; picture?: string; role: RolUsuario } | null>(() => {
    const local = localStorage.getItem('gym_google_user');
    return local ? JSON.parse(local) : null;
  });
  const [rolActivo, setRolActivo] = useState<RolUsuario>(() => {
    const localUser = localStorage.getItem('gym_google_user');
    if (localUser) {
      try {
        return JSON.parse(localUser).role;
      } catch (e) {}
    }
    const localRol = localStorage.getItem('gym_rol_activo');
    return (localRol as RolUsuario) || 'ADMIN';
  });
  const [selectedSocioId, setSelectedSocioId] = useState<string | null>(() => {
    const localUser = localStorage.getItem('gym_google_user');
    if (localUser) {
      try {
        const u = JSON.parse(localUser);
        if (u.role === 'SOCIO') {
          // If logged in via Google as a socio, map them automatically
          const localClientes = localStorage.getItem('gym_clientes');
          const list: Cliente[] = localClientes ? JSON.parse(localClientes) : [];
          const matched = list.find(c => c.activo && c.email.toLowerCase().trim() === u.email.toLowerCase().trim());
          if (matched) return matched.id;
        }
      } catch (e) {}
    }
    return null;
  });

  // Auto-seleccionar primer socio activo si no hay ninguno seleccionado
  useEffect(() => {
    if (!selectedSocioId && clientes.length > 0) {
      const primerActivo = clientes.find(c => c.activo);
      if (primerActivo) {
        setSelectedSocioId(primerActivo.id);
      }
    }
  }, [clientes, selectedSocioId]);

  // Carga inicial
  useEffect(() => {
    const localClientes = localStorage.getItem('gym_clientes');
    const localPlanes = localStorage.getItem('gym_planes');
    const localHistorial = localStorage.getItem('gym_historial_precios');
    const localTurnos = localStorage.getItem('gym_turnos');
    const localPagos = localStorage.getItem('gym_pagos');
    const localRecuperos = localStorage.getItem('gym_recuperos');
    const localLogs = localStorage.getItem('gym_audit_logs');
    const localNovedades = localStorage.getItem('gym_novedades');
    const localRol = localStorage.getItem('gym_rol_activo');

    if (localClientes) setClientes(JSON.parse(localClientes));
    else {
      setClientes(INITIAL_CLIENTES);
      localStorage.setItem('gym_clientes', JSON.stringify(INITIAL_CLIENTES));
    }

    if (localPlanes) setPlanes(JSON.parse(localPlanes));
    else {
      setPlanes(INITIAL_PLANES);
      localStorage.setItem('gym_planes', JSON.stringify(INITIAL_PLANES));
    }

    if (localHistorial) setHistorialPrecios(JSON.parse(localHistorial));
    else {
      setHistorialPrecios(INITIAL_HISTORIAL_PRECIOS);
      localStorage.setItem('gym_historial_precios', JSON.stringify(INITIAL_HISTORIAL_PRECIOS));
    }

    if (localTurnos) setTurnos(JSON.parse(localTurnos));
    else {
      // Registrar asignaciones iniciales en turnos basándose en INITIAL_CLIENTES
      const baseTurnos = generarTurnosIniciales();
      INITIAL_CLIENTES.forEach(c => {
        if (c.activo && c.tipo === 'FIJO' && c.turnos_fijos) {
          c.turnos_fijos.forEach(tId => {
            const index = baseTurnos.findIndex(t => t.id === tId);
            if (index !== -1) {
              baseTurnos[index].asignados_ids.push(c.id);
            }
          });
        }
      });
      setTurnos(baseTurnos);
      localStorage.setItem('gym_turnos', JSON.stringify(baseTurnos));
    }

    if (localPagos) setPagos(JSON.parse(localPagos));
    else {
      setPagos(INITIAL_PAGOS);
      localStorage.setItem('gym_pagos', JSON.stringify(INITIAL_PAGOS));
    }

    if (localRecuperos) setRecuperos(JSON.parse(localRecuperos));
    else {
      setRecuperos(INITIAL_RECUPEROS);
      localStorage.setItem('gym_recuperos', JSON.stringify(INITIAL_RECUPEROS));
    }

    if (localLogs) setAuditLogs(JSON.parse(localLogs));
    else {
      setAuditLogs(INITIAL_AUDIT_LOGS);
      localStorage.setItem('gym_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
    }

    if (localNovedades) setNovedades(JSON.parse(localNovedades));
    else {
      setNovedades(INITIAL_NOVEDADES);
      localStorage.setItem('gym_novedades', JSON.stringify(INITIAL_NOVEDADES));
    }

    const localGoogleUser = localStorage.getItem('gym_google_user');
    if (localGoogleUser) {
      try {
        const parsed = JSON.parse(localGoogleUser);
        setGoogleUser(parsed);
        setRolActivo(parsed.role);
        
        if (parsed.role === 'SOCIO') {
          const list = localClientes ? JSON.parse(localClientes) : INITIAL_CLIENTES;
          const matched = list.find((c: any) => c.activo && c.email.toLowerCase().trim() === parsed.email.toLowerCase().trim());
          if (matched) {
            setSelectedSocioId(matched.id);
          }
        }
      } catch (e) {}
    } else if (localRol) {
      setRolActivo(localRol as RolUsuario);
    }
  }, []);

  // Sync helpers
  const saveState = (
    updatedClientes: Cliente[],
    updatedPlanes?: Plan[],
    updatedHistorial?: HistorialPrecioPlan[],
    updatedTurnos?: Turno[],
    updatedPagos?: Pago[],
    updatedRecuperos?: RecuperoTurno[],
    updatedLogs?: AuditLog[],
    updatedNovedades?: Novedad[]
  ) => {
    if (updatedClientes) {
      setClientes(updatedClientes);
      localStorage.setItem('gym_clientes', JSON.stringify(updatedClientes));
    }
    if (updatedPlanes) {
      setPlanes(updatedPlanes);
      localStorage.setItem('gym_planes', JSON.stringify(updatedPlanes));
    }
    if (updatedHistorial) {
      setHistorialPrecios(updatedHistorial);
      localStorage.setItem('gym_historial_precios', JSON.stringify(updatedHistorial));
    }
    if (updatedTurnos) {
      setTurnos(updatedTurnos);
      localStorage.setItem('gym_turnos', JSON.stringify(updatedTurnos));
    }
    if (updatedPagos) {
      setPagos(updatedPagos);
      localStorage.setItem('gym_pagos', JSON.stringify(updatedPagos));
    }
    if (updatedRecuperos) {
      setRecuperos(updatedRecuperos);
      localStorage.setItem('gym_recuperos', JSON.stringify(updatedRecuperos));
    }
    if (updatedLogs) {
      setAuditLogs(updatedLogs);
      localStorage.setItem('gym_audit_logs', JSON.stringify(updatedLogs));
    }
    if (updatedNovedades) {
      setNovedades(updatedNovedades);
      localStorage.setItem('gym_novedades', JSON.stringify(updatedNovedades));
    }
  };

  const addAuditLog = (accion: string, detalles: any, userEmail: string = rolActivo === 'ADMIN' ? 'admin@gimnasio.com.ar' : 'operador@gimnasio.com.ar') => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      usuario_id: rolActivo === 'ADMIN' ? 'usr-admin' : 'usr-operador',
      usuario_email: userEmail,
      accion,
      detalles,
      creado_at: new Date().toISOString()
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    localStorage.setItem('gym_audit_logs', JSON.stringify(updated));
  };

  const handleSetRolActivo = (rol: RolUsuario) => {
    setRolActivo(rol);
    localStorage.setItem('gym_rol_activo', rol);
    addAuditLog('SESION_ROL_CAMBIADO', { rol_anterior: rolActivo, rol_nuevo: rol });
  };

  // Fuzzy matching simple
  const isDuplicateFuzzy = (nombre: string, apellido: string, email: string, lista: Cliente[]) => {
    const cleanN = nombre.toLowerCase().trim();
    const cleanA = apellido.toLowerCase().trim();
    const cleanE = email.toLowerCase().trim();

    return lista.some(elem => {
      if (!elem.activo) return false;
      if (elem.email.toLowerCase().trim() === cleanE) return true;
      
      // Fuzzy simple por similitud de letras
      const nomSimil = elem.nombre.toLowerCase().trim() === cleanN && elem.apellido.toLowerCase().trim() === cleanA;
      return nomSimil;
    });
  };

  // CLIENTS CRUD
  const addCliente = (clientData: Omit<Cliente, 'id' | 'creado_at' | 'deuda_acumulada' | 'ultimo_mes_pagado' | 'estado' | 'turnos_fijos' | 'activo'>) => {
    // Validar duplicados (email o nombre+apellido idénticos)
    if (isDuplicateFuzzy(clientData.nombre, clientData.apellido, clientData.email, clientes)) {
      return { 
        success: false, 
        message: 'Ya existe un cliente activo registrado con el mismo email o mismo nombre completo (Fuzzy Matching)',
        duplicate: true 
      };
    }

    const plan = planes.find(p => p.id === clientData.plan_id);
    const planPrecio = plan ? plan.precio : 0;

    const newClient: Cliente = {
      ...clientData,
      id: `c-${Date.now()}`,
      estado: 'ACTIVO',
      deuda_acumulada: 0,
      ultimo_mes_pagado: new Date().toISOString().slice(0, 7), // Al día del mes de registro
      turnos_fijos: [],
      activo: true,
      creado_at: new Date().toISOString()
    };

    const updated = [newClient, ...clientes];
    saveState(updated);
    addAuditLog('CLIENTE_CREADO', { id: newClient.id, nombre: `${newClient.nombre} ${newClient.apellido}`, tipo: newClient.tipo });
    return { success: true, message: 'Cliente registrado exitosamente.' };
  };

  const updateCliente = (id: string, updates: Partial<Cliente>) => {
    // Validar email único si se cambia
    if (updates.email) {
      const otroDuplicado = clientes.some(c => c.id !== id && c.activo && c.email.toLowerCase().trim() === updates.email?.toLowerCase().trim());
      if (otroDuplicado) {
        return { success: false, message: 'El correo electrónico ya se encuentra registrado por otro miembro.' };
      }
    }

    // Gestionar si cambia de plan
    let extraLog = '';
    const clientePrev = clientes.find(c => c.id === id);
    if (updates.plan_id && clientePrev && clientePrev.plan_id !== updates.plan_id) {
      const pAnterior = planes.find(p => p.id === clientePrev.plan_id)?.nombre || '';
      const pNuevo = planes.find(p => p.id === updates.plan_id)?.nombre || '';
      extraLog = `Cambió plan de [${pAnterior}] a [${pNuevo}]`;
      
      // Si cambia de plan y tenía turnos asignados fijos, comprobar límite de turnos si excede días por semana
      const planNuevo = planes.find(p => p.id === updates.plan_id);
      const maxDias = planNuevo ? planNuevo.dias_por_semana : 5;
      if (clientePrev.turnos_fijos.length > maxDias) {
        // Recortamos turnos excedentes
        updates.turnos_fijos = clientePrev.turnos_fijos.slice(0, maxDias);
        // Desasignar en los turnos
        const turnosAQuitar = clientePrev.turnos_fijos.slice(maxDias);
        const updatedTurnos = turnos.map(t => {
          if (turnosAQuitar.includes(t.id)) {
            return { ...t, asignados_ids: t.asignados_ids.filter(cid => cid !== id) };
          }
          return t;
        });
        saveState(clientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);
      }
    }

    const updated = clientes.map(c => {
      if (c.id === id) {
        return { ...c, ...updates };
      }
      return c;
    });

    saveState(updated);
    addAuditLog('CLIENTE_MODIFICADO', { id, cambiados: Object.keys(updates), nota: extraLog });
    return { success: true, message: 'Cliente actualizado exitosamente.' };
  };

  const bajaLogicaCliente = (id: string) => {
    const updatedClientes = clientes.map(c => {
      if (c.id === id) {
        // Cambiar estado a INACTIVO y poner activo = false
        return { ...c, activo: false, estado: 'INACTIVO' as EstadoCliente };
      }
      return c;
    });

    // Remover al cliente de todas sus asignaciones fijas de turno
    const updatedTurnos = turnos.map(t => {
      return {
        ...t,
        asignados_ids: t.asignados_ids.filter(cid => cid !== id),
        lista_espera_ids: t.lista_espera_ids.filter(cid => cid !== id),
      };
    });

    saveState(updatedClientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);
    const c = clientes.find(cl => cl.id === id);
    addAuditLog('CLIENTE_BAJA', { id, nombre: c ? `${c.nombre} ${c.apellido}` : '' });
  };

  const altaCliente = (id: string) => {
    const updatedClientes = clientes.map(c => {
      if (c.id === id) {
        return { ...c, activo: true, estado: 'ACTIVO' as EstadoCliente };
      }
      return c;
    });

    saveState(updatedClientes);
    const c = clientes.find(cl => cl.id === id);
    addAuditLog('CLIENTE_ALTA', { id, nombre: c ? `${c.nombre} ${c.apellido}` : '' });
  };

  const eliminarCliente = (id: string) => {
    const updatedClientes = clientes.filter(c => c.id !== id);

    // Desasignar de todos los turnos fijos y variables
    const updatedTurnos = turnos.map(t => {
      return {
        ...t,
        asignados_ids: t.asignados_ids.filter(cid => cid !== id),
        lista_espera_ids: t.lista_espera_ids.filter(cid => cid !== id)
      };
    });

    saveState(updatedClientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);
    const c = clientes.find(cl => cl.id === id);
    addAuditLog('CLIENTE_ELIMINADO_PERMANENTE', { id, nombre: c ? `${c.nombre} ${c.apellido}` : '' });
  };

  // IMPORTACIÓN MASIVA CSV CLIENTES
  const importarClientesCSV = (clientesImportados: Array<{ nombre: string; apellido: string; email: string; telefono: string; tipo: TipoCliente; plan_nombre: string }>) => {
    let procesados = 0;
    let insertados = 0;
    const errores: string[] = [];
    const listadoClasificacion = [...clientes];

    const planesMapeados: { [key: string]: string } = {};
    planes.forEach(p => {
      planesMapeados[p.nombre.toLowerCase().trim()] = p.id;
    });

    const nuevosClientes: Cliente[] = [];

    clientesImportados.forEach((row, i) => {
      procesados++;
      const email = row.email?.trim();
      const nombre = row.nombre?.trim();
      const apellido = row.apellido?.trim();
      const tCliente = (row.tipo?.toUpperCase() === 'FIJO' ? 'FIJO' : 'FLEXIBLE') as TipoCliente;
      
      const planId = planesMapeados[row.plan_nombre?.toLowerCase().trim()] || planes[0]?.id; // Default al primero si no machea

      if (!nombre || !apellido || !email) {
        errores.push(`Fila ${i + 1}: Datos obligatorios incompletos (Nombre, Apellido, Email).`);
        return;
      }

      // Validar duplicado en base actual o en esta misma tanda
      const duplicadoActual = listadoClasificacion.some(c => c.activo && c.email.toLowerCase().trim() === email.toLowerCase().trim());
      const duplicadoEnImportacion = nuevosClientes.some(c => c.email.toLowerCase().trim() === email.toLowerCase().trim());

      if (duplicadoActual || duplicadoEnImportacion) {
        errores.push(`Fila ${i + 1}: El email ${email} ya está registrado y activo.`);
        return;
      }

      const clientAdded: Cliente = {
        id: `c-imp-${Date.now()}-${i}`,
        nombre,
        apellido,
        email,
        telefono: row.telefono || '',
        tipo: tCliente,
        estado: 'ACTIVO',
        plan_id: planId,
        activo: true,
        deuda_acumulada: 0,
        ultimo_mes_pagado: new Date().toISOString().slice(0, 7),
        turnos_fijos: [],
        creado_at: new Date().toISOString()
      };

      nuevosClientes.push(clientAdded);
      insertados++;
    });

    if (nuevosClientes.length > 0) {
      const finalClientes = [...nuevosClientes, ...clientes];
      saveState(finalClientes);
      addAuditLog('IMPORTACION_MASIVA_CSV_CLIENTES', { procesados, insertados, errores: errores.length });
    }

    return { procesados, insertados, errores };
  };

  // HISTORIAL PRECIO PLANES (no retroactivo)
  const updatePrecioPlan = (planId: string, nuevoPrecio: number, userEmail: string) => {
    const plan = planes.find(p => p.id === planId);
    if (!plan) return;

    const precioViejo = plan.precio;
    const updatedPlanes = planes.map(p => {
      if (p.id === planId) {
        return { ...p, precio: nuevoPrecio };
      }
      return p;
    });

    const newCambioHistorial: HistorialPrecioPlan = {
      id: `h-${Date.now()}`,
      plan_id: planId,
      nombre_plan: plan.nombre,
      precio_anterior: precioViejo,
      precio_nuevo: nuevoPrecio,
      fecha_cambio: new Date().toISOString(),
      cambiado_por: userEmail
    };

    const updatedHistorial = [newCambioHistorial, ...historialPrecios];

    saveState(clientes, updatedPlanes, updatedHistorial, turnos, pagos, recuperos, auditLogs);
    addAuditLog('PRECIO_PLAN_MODIFICADO', { 
      plan: plan.nombre, 
      antes: precioViejo, 
      despues: nuevoPrecio,
      ejecutado_por: userEmail 
    });
  };

  // TURNOS
  const asignarClienteFijo = (clienteId: string, turnoId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    const turno = turnos.find(t => t.id === turnoId);

    if (!cliente || !turno) {
      return { success: false, message: 'Turno o cliente no válido.' };
    }

    // Verificar si el cliente ya está asignado en este turno exacto o como variable
    if (cliente.turnos_fijos.includes(turnoId)) {
      return { success: false, message: 'El socio ya tiene asignado este turno fijo.' };
    }

    // Límite estricto de acuerdo al plan seleccionado para el socio
    const plan = planes.find(p => p.id === cliente.plan_id);
    const maxDias = plan ? plan.dias_por_semana : 2;
    if (cliente.turnos_fijos.length >= maxDias) {
      return { success: false, message: `Límite alcanzado: El plan del socio (${plan?.nombre || 'Sin Plan'}) permite como máximo ${maxDias} horarios fijos semanales.` };
    }

    // Verificar conflicto de horario en el mismo día (e.g. no registrarse 2 veces el mismo día)
    const tieneTurnoMismoDia = cliente.turnos_fijos.some(tFid => tFid.startsWith(turno.dia));
    if (tieneTurnoMismoDia) {
      return { success: false, message: `Conflicto de horario: El cliente ya posee un turno fijo asignado el día ${turno.dia}.` };
    }

    // Verificar cupo máximo
    const ocupadoActualmente = turno.asignados_ids.length;
    if (ocupadoActualmente >= turno.cupo_maximo) {
      // Mandar a lista de espera automática
      const actualWaitlist = turno.lista_espera_ids.includes(clienteId);
      if (actualWaitlist) {
        return { success: false, message: 'El turno está lleno y el cliente ya se encuentra en la lista de espera de este slot.' };
      }

      const updatedTurnos = turnos.map(t => {
        if (t.id === turnoId) {
          return { ...t, lista_espera_ids: [...t.lista_espera_ids, clienteId] };
        }
        return t;
      });

      saveState(clientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);
      addAuditLog('TURNO_LISTA_ESPERA_AGREGADO', { cliente: `${cliente.nombre} ${cliente.apellido}`, turno: turnoId });
      return { success: true, message: 'El horario está completo. El cliente ha sido registrado en la lista de espera.', putInWaitlist: true };
    }

    // Asignación limpia exitosa
    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        return { 
          ...c, 
          turnos_fijos: [...c.turnos_fijos, turnoId],
          turno_variable: c.turno_variable === turnoId ? undefined : c.turno_variable 
        };
      }
      return c;
    });

    const updatedTurnos = turnos.map(t => {
      if (t.id === turnoId) {
        return { ...t, asignados_ids: [...t.asignados_ids, clienteId] };
      }
      return t;
    });

    saveState(updatedClientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);
    addAuditLog('TURNO_ASIGNACION_FIJA', { cliente: `${cliente.nombre} ${cliente.apellido}`, turno: turnoId });
    return { success: true, message: 'Asignación directa de horario completada exitosamente.' };
  };

  const removerAsignacionFija = (clienteId: string, turnoId: string) => {
    let waitlistClientLiberado: string | null = null;
    let waitlistClientNombre = '';

    // Modificar el turno
    const updatedTurnos = turnos.map(t => {
      if (t.id === turnoId) {
        const filtradoAsignados = t.asignados_ids.filter(cid => cid !== clienteId);
        let nuevosAsignados = [...filtradoAsignados];
        let nuevaWaitlist = [...t.lista_espera_ids];

        // Promover de forma automática desde la lista de espera si hay lugar liberado!
        if (nuevaWaitlist.length > 0 && nuevosAsignados.length < t.cupo_maximo) {
          const promovidoId = nuevaWaitlist[0];
          waitlistClientLiberado = promovidoId;
          nuevosAsignados.push(promovidoId);
          nuevaWaitlist = nuevaWaitlist.slice(1);
        }

        return { 
          ...t, 
          asignados_ids: nuevosAsignados,
          lista_espera_ids: nuevaWaitlist
        };
      }
      return t;
    });

    // Modificar clientes (Remover del saliente, e integrar al promovido de waitlist si hubiere)
    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        return { ...c, turnos_fijos: c.turnos_fijos.filter(tid => tid !== turnoId) };
      }
      if (waitlistClientLiberado && c.id === waitlistClientLiberado) {
        waitlistClientNombre = `${c.nombre} ${c.apellido}`;
        return { ...c, turnos_fijos: [...c.turnos_fijos, turnoId] };
      }
      return c;
    });

    saveState(updatedClientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);
    addAuditLog('TURNO_ASIGNACION_REMOCION', { 
      cliente_id: clienteId, 
      turno_id: turnoId,
      promocion_automatica: waitlistClientLiberado ? `Se promovió automáticamente de lista de espera a ${waitlistClientNombre}` : 'Ninguno'
    });
  };

  const asignarTurnoVariable = (clienteId: string, turnoId: string | null) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) {
      return { success: false, message: 'Socio no encontrado.' };
    }

    if (turnoId) {
      const turno = turnos.find(t => t.id === turnoId);
      if (!turno) {
        return { success: false, message: 'Turno no válido.' };
      }

      // Verificar si ya tiene este turno como fijo
      if (cliente.turnos_fijos.includes(turnoId)) {
        return { success: false, message: 'Ya tienes este horario asignado como TU TURNO FIJO.' };
      }

      // Calcular ocupación en tiempo real: asignados fijos + personas que tienen este turno_variable
      const fixedCount = turno.asignados_ids.length;
      const variableCount = clientes.filter(c => c.activo && c.id !== clienteId && c.turno_variable === turnoId).length;
      const totalOccupied = fixedCount + variableCount;

      if (totalOccupied >= turno.cupo_maximo) {
        return { success: false, message: `El horario en tiempo real está completo para este día (${totalOccupied}/${turno.cupo_maximo}).` };
      }
    }

    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        return { ...c, turno_variable: turnoId || undefined };
      }
      return c;
    });

    saveState(updatedClientes);
    addAuditLog('TURNO_VARIABLE_ESTADO', { 
      cliente: `${cliente.nombre} ${cliente.apellido}`, 
      turno_id: turnoId || 'Ninguno' 
    });

    return { success: true, message: turnoId ? 'Turno variable asignado con éxito.' : 'Turno variable liberado con éxito.' };
  };

  // Simular check-in Flexible del día a día (asistencia temporal)
  const checkInFlexible = (clienteId: string, turnoId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no existente.' };
    
    // Validar estado de la cuota para permitir el acceso
    if (cliente.estado === 'MOROSO') {
      return { success: false, message: 'Acceso Denegado: El cliente es MOROSO con cuota impaga.' };
    }

    const turno = turnos.find(t => t.id === turnoId);
    if (!turno) return { success: false, message: 'Turno no encontrado.' };

    const totalActual = turno.asignados_ids.length; // Fijos toman lugar físico permanente
    if (totalActual >= turno.cupo_maximo) {
      return { success: false, message: `El turno está saturado (${totalActual}/${turno.cupo_maximo}). Intente ingresar en otro horario.` };
    }

    // Registra logística de visita como auditoría de asistencia
    addAuditLog('ASISTENCIA_FLEXIBLE_REGISTRADA', { cliente: `${cliente.nombre} ${cliente.apellido}`, turno: turnoId });
    return { success: true, message: `Asistencia aprobada para ${cliente.nombre} ${cliente.apellido} en el turno ${turno.dia} ${turno.hora}.` };
  };

  const agregarRecupero = (data: Omit<RecuperoTurno, 'id' | 'estado'>) => {
    const cli = clientes.find(c => c.id === data.cliente_id);
    const recTurno = turnos.find(t => t.id === data.turno_recupero_id);

    if (!cli || !recTurno) return { success: false, message: 'Cliente o Turno de recupero inválidos.' };

    // Validar cupos en el turno de recupero
    if (recTurno.asignados_ids.length >= recTurno.cupo_maximo) {
      return { success: false, message: 'El turno del recupero no posee cupos disponibles.' };
    }

    const nuevoRec: RecuperoTurno = {
      ...data,
      id: `rec-${Date.now()}`,
      estado: 'PENDIENTE'
    };

    const updatedRecs = [nuevoRec, ...recuperos];
    saveState(clientes, planes, historialPrecios, turnos, pagos, updatedRecs, auditLogs);
    addAuditLog('RECUPERO_TURNO_PROGRAMADO', { cliente: data.cliente_nombre, para_fecha: data.fecha_recupero });
    return { success: true, message: 'Recupero de turno agendado exitosamente.' };
  };

  const actualizarEstadoRecupero = (id: string, estado: 'PENDIENTE' | 'COMPLETADO' | 'EXPIRADO') => {
    const updated = recuperos.map(r => {
      if (r.id === id) {
        return { ...r, estado };
      }
      return r;
    });
    saveState(clientes, planes, historialPrecios, turnos, pagos, updated, auditLogs);
    addAuditLog('RECUPERO_TURNO_ESTADO_CAMBIADO', { id, nuevo_estado: estado });
  };

  const modificarPrecioOCupoTurno = (turnoId: string, nuevoCupo: number) => {
    const updated = turnos.map(t => {
      if (t.id === turnoId) {
        return { ...t, cupo_maximo: nuevoCupo };
      }
      return t;
    });
    saveState(clientes, planes, historialPrecios, updated, pagos, recuperos, auditLogs);
    addAuditLog('CUPO_TURNO_EDITADO', { turno_id: turnoId, nuevo_cupo: nuevoCupo });
  };

  // CLIENT PAGOS OPERATIONS
  const registrarPago = (pagoData: Omit<Pago, 'id' | 'creado_at' | 'fecha_pago'>, userEmail: string) => {
    const cli = clientes.find(c => c.id === pagoData.cliente_id);
    if (!cli) return { success: false, message: 'Cliente no encontrado.' };

    const cleanHash = pagoData.hash_transaccion?.trim() || `MP-${Date.now()}`;
    
    // Prevención de duplicados por hash
    if (pagoData.hash_transaccion) {
      const duplicado = pagos.some(p => p.hash_transaccion === pagoData.hash_transaccion);
      if (duplicado) {
        return { success: false, message: 'Este pago ya se encuentra registrado (Detección de hash duplicado).' };
      }
    }

    const nuevoPago: Pago = {
      ...pagoData,
      id: `pay-${Date.now()}`,
      fecha_pago: new Date().toISOString(),
      hash_transaccion: cleanHash,
      creado_at: new Date().toISOString()
    };

    // Actualizar ficha del cliente (bajar deudas e indicar mes pagado)
    const precioPlan = planes.find(p => p.id === cli.plan_id)?.precio || 0;
    
    const updatedClientes = clientes.map(c => {
      if (c.id === pagoData.cliente_id) {
        // Reducimos deuda acumulada por el monto pagado
        const nuevaDeuda = Math.max(0, c.deuda_acumulada - pagoData.monto);
        
        // Mapeamos el mes
        let ultimoMes = c.ultimo_mes_pagado;
        if (!ultimoMes || pagoData.mes_correspondiente > ultimoMes) {
          ultimoMes = pagoData.mes_correspondiente;
        }

        // Si la deuda se redujo a 0, recalcular el estado a ACTIVO
        let nuevoEstado = c.estado;
        if (nuevaDeuda === 0) {
          nuevoEstado = 'ACTIVO';
        } else if (nuevoEstado === 'MOROSO' && nuevaDeuda > 0) {
          nuevoEstado = 'CON_DEUDA';
        }

        return {
          ...c,
          deuda_acumulada: nuevaDeuda,
          ultimo_mes_pagado: ultimoMes,
          estado: nuevoEstado as EstadoCliente
        };
      }
      return c;
    });

    const updatedPagos = [nuevoPago, ...pagos];

    saveState(updatedClientes, planes, historialPrecios, turnos, updatedPagos, recuperos, auditLogs);
    addAuditLog('PAGO_REGISTRADO', { 
      cliente: cli.nombre + ' ' + cli.apellido, 
      monto: pagoData.monto, 
      mes: pagoData.mes_correspondiente, 
      medio: pagoData.medio_pago 
    }, userEmail);

    return { success: true, message: 'Pago registrado exitosamente. Comprobante de cobertura generado.' };
  };

  // IMPORTACIÓN CSV EXTRACTO
  const importarPagosCSV = (pagosImportados: Array<{ cliente_email: string; monto: number; fecha_pago: string; medio_pago: MedioPago; mes: string; hash: string }>, userEmail: string) => {
    let procesados = 0;
    let insertados = 0;
    let duplicados = 0;
    const errores: string[] = [];
    
    const listadoPagos = [...pagos];
    const listadoClientes = [...clientes];

    const nuevosPagos: Pago[] = [];
    const hashUnicosNuevos = new Set<string>();

    pagosImportados.forEach((row, idx) => {
      procesados++;
      const email = row.cliente_email?.trim();
      const hash = row.hash?.trim();

      if (!email || !hash || !row.monto) {
        errores.push(`ID Fila ${idx + 1}: Información incompleta para procesar la transacción.`);
        return;
      }

      // Validar duplicado por hash de transacción
      const duplicadoHistorial = listadoPagos.some(p => p.hash_transaccion === hash);
      const enEstaTanda = hashUnicosNuevos.has(hash);

      if (duplicadoHistorial || enEstaTanda) {
        duplicados++;
        return;
      }

      // Asociar cliente por email
      const clienteEncontrado = listadoClientes.find(c => c.activo && c.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (!clienteEncontrado) {
        errores.push(`ID Fila ${idx + 1}: Cliente con email [${email}] no está activo o registrado en el sistema.`);
        return;
      }

      const pagoCreado: Pago = {
        id: `pay-imp-${Date.now()}-${idx}`,
        cliente_id: clienteEncontrado.id,
        cliente_nombre_completo: `${clienteEncontrado.nombre} ${clienteEncontrado.apellido}`,
        monto: Number(row.monto),
        fecha_pago: row.fecha_pago || new Date().toISOString(),
        medio_pago: row.medio_pago || 'TRANSFERENCIA',
        mes_correspondiente: row.mes || new Date().toISOString().slice(0, 7),
        hash_transaccion: hash,
        registrado_por: userEmail,
        creado_at: new Date().toISOString()
      };

      hashUnicosNuevos.add(hash);
      nuevosPagos.push(pagoCreado);
      insertados++;

      // Descontar deuda del cliente en caliente
      clienteEncontrado.deuda_acumulada = Math.max(0, clienteEncontrado.deuda_acumulada - row.monto);
      if (clienteEncontrado.deuda_acumulada === 0) {
        clienteEncontrado.estado = 'ACTIVO';
      }
      if (!clienteEncontrado.ultimo_mes_pagado || row.mes > clienteEncontrado.ultimo_mes_pagado) {
        clienteEncontrado.ultimo_mes_pagado = row.mes;
      }
    });

    if (nuevosPagos.length > 0) {
      const finalPagos = [...nuevosPagos, ...pagos];
      saveState(listadoClientes, planes, historialPrecios, turnos, finalPagos, recuperos, auditLogs);
      addAuditLog('IMPORTACION_MASIVA_EXTRACTO_PAGOS', { procesados, insertados, duplicados, errores: errores.length });
    }

    return { procesados, insertados, duplicados, errores };
  };

  // CONTROL DE MOROSIDAD (Simulación del Cron de Supabase Edge Function interactivo desde el panel)
  const ejecutarCronMorosidad = (simularFecha: string) => {
    const simFechaObj = new Date(simularFecha);
    
    // Obtener día y mes simulated
    const diaDelMes = simFechaObj.getUTCDate(); // usar UTC para evitar desfases de timezone locales
    const deMesFormato = simularFecha.slice(0, 7); // "YYYY-MM"

    // Regla: si el día 5 a las 23:59 (hora Argentina) no hay pago del mes -> MOROSO
    const esFechaLimitePasada = diaDelMes > 5 || (diaDelMes === 5);

    let procesados = 0;
    let nuevosMorosos = 0;
    let deudaTotal = 0;

    const listadoClientesActualizado = clientes.map(cli => {
      if (!cli.activo) return cli;
      procesados++;

      const precioPlan = planes.find(p => p.id === cli.plan_id)?.precio || 0;
      let nuevoEstado = cli.estado;
      let deudaActualizada = cli.deuda_acumulada;

      const pagoEsteMes = cli.ultimo_mes_pagado >= deMesFormato;

      if (!pagoEsteMes && esFechaLimitePasada) {
        nuevoEstado = 'MOROSO';
        if (deudaActualizada < precioPlan) {
          deudaActualizada = precioPlan; // cargar la cuota este mes
        }
      } else if (!pagoEsteMes && !esFechaLimitePasada && nuevoEstado === 'ACTIVO') {
        nuevoEstado = 'ACTIVO'; // Aún en periodo de gracia
      }

      if (deudaActualizada > 0) {
        deudaTotal += deudaActualizada;
        if (nuevoEstado !== 'MOROSO') {
          nuevoEstado = 'CON_DEUDA';
        }
      }

      if (nuevoEstado === 'MOROSO' && cli.estado !== 'MOROSO') {
        nuevosMorosos++;
      }

      return {
        ...cli,
        estado: nuevoEstado as EstadoCliente,
        deuda_acumulada: deudaActualizada
      };
    });

    saveState(listadoClientesActualizado, planes, historialPrecios, turnos, pagos, recuperos, auditLogs);
    addAuditLog('CRON_DETECCION_MOROSIDAD_MANUAL', { 
      simulacion_mes: deMesFormato, 
      dia_mes: diaDelMes,
      fecha_limite_pasada: esFechaLimitePasada,
      total_analizados: procesados, 
      nuevos_morosos_detectados: nuevosMorosos,
      deuda_total_acumulada: deudaTotal
    });

    return { procesados, nuevosMorosos, deudaTotal };
  };

  const signInWithGoogle = (email: string, nameName: string, picture?: string) => {
    const cleanMail = email.trim().toLowerCase();
    let detectedRole: RolUsuario = 'SOCIO';
    let targetSocioId: string | null = null;

    if (
      cleanMail === 'tobiasarraiza17@gmail.com' ||
      cleanMail === 'totoarr17@gmail.com' ||
      cleanMail === 'jmferrariprofe@gmail.com'
    ) {
      detectedRole = 'ADMIN';
    } else if (cleanMail === 'profe@gimnasio.com.ar' || cleanMail === 'profe@aresgym.com') {
      detectedRole = 'OPERADOR';
    } else {
      // Intentar buscar socio existente
      const socioExistente = clientes.find(c => c.activo && c.email.toLowerCase().trim() === cleanMail);
      if (socioExistente) {
        detectedRole = 'SOCIO';
        targetSocioId = socioExistente.id;
      } else {
        // Registrar este nuevo socio automáticamente
        const partes = nameName.split(' ');
        const nombre = partes[0] || 'Socio';
        const apellido = partes.slice(1).join(' ') || 'Nuevo';
        
        const nuevoCliente: Cliente = {
          id: `c-${Date.now()}`,
          nombre,
          apellido,
          email: cleanMail,
          telefono: '11-0000-0000',
          tipo: 'FLEXIBLE',
          estado: 'ACTIVO',
          plan_id: 'p-3d', // plan default
          activo: true,
          deuda_acumulada: 0,
          ultimo_mes_pagado: new Date().toISOString().slice(0, 7),
          turnos_fijos: [],
          creado_at: new Date().toISOString()
        };
        
        const updated = [nuevoCliente, ...clientes];
        setClientes(updated);
        localStorage.setItem('gym_clientes', JSON.stringify(updated));
        
        detectedRole = 'SOCIO';
        targetSocioId = nuevoCliente.id;
      }
    }

    const newUser = { email, name: nameName, picture, role: detectedRole };
    setGoogleUser(newUser);
    localStorage.setItem('gym_google_user', JSON.stringify(newUser));
    setRolActivo(detectedRole);
    localStorage.setItem('gym_rol_activo', detectedRole);
    
    if (targetSocioId) {
      setSelectedSocioId(targetSocioId);
    }
    
    addAuditLog('SESION_INICIO_GOOGLE', { email, rol: detectedRole, nombre: nameName });
  };

  const signOutGoogle = () => {
    addAuditLog('SESION_CERRADA_GOOGLE', { email: googleUser?.email });
    setGoogleUser(null);
    localStorage.removeItem('gym_google_user');
    setRolActivo('SOCIO');
    localStorage.setItem('gym_rol_activo', 'SOCIO');
    setSelectedSocioId(null);
  };

  const addNovedad = (novData: Omit<Novedad, 'id' | 'fecha'>) => {
    const formatTime = () => {
      const d = new Date();
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yr}-${mo}-${dy} ${hr}:${mi}`;
    };

    const newNov: Novedad = {
      ...novData,
      id: `nov-${Date.now()}`,
      fecha: formatTime()
    };

    const updated = [newNov, ...novedades];
    saveState(clientes, planes, historialPrecios, turnos, pagos, recuperos, [], updated);
    // Para no pisar ni truncar otros datos, pasamos la llamada completa con los estados persistentes actuales
    saveState(clientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs, updated);
    addAuditLog('NOVEDAD_CREADA', { id: newNov.id, titulo: newNov.titulo });
    return { success: true, message: 'Novedad publicada exitosamente.' };
  };

  const updateNovedad = (id: string, updates: Partial<Novedad>) => {
    const updated = novedades.map(n => n.id === id ? { ...n, ...updates } : n);
    saveState(clientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs, updated);
    addAuditLog('NOVEDAD_MODIFICADA', { id, titulo_nuevo: updates.titulo });
    return { success: true, message: 'Novedad modificada exitosamente.' };
  };

  const deleteNovedad = (id: string) => {
    const matched = novedades.find(n => n.id === id);
    const updated = novedades.filter(n => n.id !== id);
    saveState(clientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs, updated);
    addAuditLog('NOVEDAD_ELIMINADA', { id, titulo: matched?.titulo });
  };

  const borrarHistorial = () => {
    localStorage.removeItem('gym_clientes');
    localStorage.removeItem('gym_planes');
    localStorage.removeItem('gym_historial_precios');
    localStorage.removeItem('gym_turnos');
    localStorage.removeItem('gym_pagos');
    localStorage.removeItem('gym_recuperos');
    localStorage.removeItem('gym_novedades');
    localStorage.removeItem('gym_audit_logs');
    localStorage.removeItem('gym_google_user');
    localStorage.removeItem('gym_rol_activo');
    window.location.reload();
  };

  return (
    <GymContext.Provider value={{
      clientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs, novedades, rolActivo,
      setRolActivo: handleSetRolActivo,
      selectedSocioId, setSelectedSocioId,
      googleUser, signInWithGoogle, signOutGoogle,
      addCliente, updateCliente, bajaLogicaCliente, altaCliente, eliminarCliente, importarClientesCSV,
      updatePrecioPlan,
      asignarClienteFijo, removerAsignacionFija, asignarTurnoVariable, checkInFlexible, agregarRecupero, actualizarEstadoRecupero, modificarPrecioOCupoTurno,
      registrarPago, importarPagosCSV,
      addNovedad, updateNovedad, deleteNovedad,
      ejecutarCronMorosidad,
      borrarHistorial
    }}>
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => {
  const context = useContext(GymContext);
  if (!context) throw new Error('useGym debe ser utilizado dentro de GymProvider');
  return context;
};
