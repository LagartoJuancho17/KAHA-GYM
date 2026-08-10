// src/components/Clientes/ClienteFormModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { TipoCliente } from '../../types';
import { X, AlertCircle, Check, ChevronRight, Calendar, Plus, Wallet, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingClienteId: string | null;
}

const DIAS_ORDEN = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

type PagoEstado = 'MES_COMPLETO' | 'PARCIAL' | 'EXENTO' | null;

export const ClienteFormModal: React.FC<ClienteFormModalProps> = ({
  isOpen,
  onClose,
  editingClienteId
}) => {
  const { clientes, planes, turnos, addCliente, updateCliente, asignarClienteFijo } = useGym();

  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [newClientId, setNewClientId] = useState<string | null>(null);

  const [clienteForm, setClienteForm] = useState({
    codigo_socio: '',
    nombre_completo: '',
    email: '',
    telefono: '',
    tipo: 'FIJO' as TipoCliente,
    plan_id: planes[0]?.id || '',
    exencion_cobro: 'NINGUNA' as 'NINGUNA' | 'SUSPENDIDO' | 'POSTERGADO' | 'PERDONADO',
    deuda_acumulada: 0,
    precio_personalizado: '' as string | number,
    dias_personalizados: '' as string | number,
    nota_plan_personalizado: ''
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [selectedTurnoToAssign, setSelectedTurnoToAssign] = useState('');
  const [turnosAsignados, setTurnosAsignados] = useState<string[]>([]);
  const [turnosError, setTurnosError] = useState('');
  const [turnosSuccess, setTurnosSuccess] = useState('');
  const [turnosWaitlist, setTurnosWaitlist] = useState('');
  const [pagoEstado, setPagoEstado] = useState<PagoEstado>(null);
  const [montoParcial, setMontoParcial] = useState('');

  const resetForm = () => {
    setClienteForm({ codigo_socio: '', nombre_completo: '', email: '', telefono: '', tipo: 'FIJO', plan_id: planes[0]?.id || '', exencion_cobro: 'NINGUNA', deuda_acumulada: 0, precio_personalizado: '', dias_personalizados: '', nota_plan_personalizado: '' });
    setIsCustomPlan(false);
    setFormError(''); setFormSuccess('');
    setWizardStep(1); setNewClientId(null);
    setTurnosAsignados([]); setSelectedTurnoToAssign('');
    setTurnosError(''); setTurnosSuccess(''); setTurnosWaitlist('');
    setPagoEstado(null); setMontoParcial('');
  };

  const handleClose = () => { onClose(); resetForm(); };

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  useEffect(() => {
    if (editingClienteId && isOpen) {
      const cl = clientes.find(c => c.id === editingClienteId);
      if (cl) {
        const hasCustom = cl.precio_personalizado != null || cl.dias_personalizados != null || Boolean(cl.nota_plan_personalizado);
        setIsCustomPlan(hasCustom);
        setClienteForm({ codigo_socio: cl.codigo_socio || '', nombre_completo: `${cl.nombre} ${cl.apellido}`.trim(), email: cl.email, telefono: cl.telefono, tipo: cl.tipo, plan_id: cl.plan_id, exencion_cobro: cl.exencion_cobro || 'NINGUNA', deuda_acumulada: cl.deuda_acumulada, precio_personalizado: cl.precio_personalizado ?? '', dias_personalizados: cl.dias_personalizados ?? '', nota_plan_personalizado: cl.nota_plan_personalizado || '' });
      }
    } else {
      resetForm();
    }
  }, [editingClienteId, isOpen, clientes, planes]);

  // ── All hooks BEFORE early return (Rules of Hooks) ──────────────────────
  const plan = planes.find(p => p.id === clienteForm.plan_id);
  const planPrecio = plan?.precio || 0;

  const turnosDisponibles = useMemo(() => {
    return turnos
      .filter(t => !turnosAsignados.includes(t.id))
      .sort((a, b) => {
        const diaA = DIAS_ORDEN.indexOf(a.dia), diaB = DIAS_ORDEN.indexOf(b.dia);
        if (diaA !== diaB) return diaA - diaB;
        return a.hora.localeCompare(b.hora);
      });
  }, [turnos, turnosAsignados]);

  const turnosAsignadosSorted = useMemo(() => {
    return [...turnosAsignados].sort((a, b) => {
      const diaA = DIAS_ORDEN.indexOf(a.split('-')[0]), diaB = DIAS_ORDEN.indexOf(b.split('-')[0]);
      if (diaA !== diaB) return diaA - diaB;
      return (a.split('-')[1] || '').localeCompare(b.split('-')[1] || '');
    });
  }, [turnosAsignados]);

  if (!isOpen) return null;

  const splitNombre = (nombreCompleto: string) => {
    const parts = nombreCompleto.trim().split(/\s+/);
    if (parts.length === 1) return { nombre: parts[0], apellido: '' };
    const apellido = parts.pop()!;
    return { nombre: parts.join(' '), apellido };
  };

  // Step 2: assign a turno to local state array
  const handleAssignTurno = () => {
    setTurnosError('');
    setTurnosWaitlist('');
    if (!selectedTurnoToAssign) return;
    
    if (turnosAsignados.includes(selectedTurnoToAssign)) {
      setTurnosError('El turno ya fue agregado.');
      return;
    }

    const turnoObj = turnos.find(t => t.id === selectedTurnoToAssign);
    if (turnoObj && turnoObj.asignados_ids.length >= turnoObj.cupo_maximo) {
      setTurnosWaitlist(`El horario ${turnoObj.dia} - ${turnoObj.hora.slice(0,5)}hs está completo. Al confirmar el registro, el socio quedará en lista de espera.`);
    }

    setTurnosAsignados(prev => [...prev, selectedTurnoToAssign]);
    setSelectedTurnoToAssign('');
    setTurnosSuccess('Horario agregado a la selección.');
    setTimeout(() => setTurnosSuccess(''), 2000);
  };

  // Step 1: validate form & advance to step 2 (NO saving to DB yet)
  const handleSubmitFormStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');

    if (!clienteForm.nombre_completo.trim() || !clienteForm.email.trim()) {
      setFormError('Nombre y Apellido, y Email son requeridos.'); return;
    }

    const cleanEmail = clienteForm.email.trim().toLowerCase();
    if (!editingClienteId) {
      const emailExiste = clientes.some(c => c.activo && c.email.toLowerCase().trim() === cleanEmail);
      if (emailExiste) {
        setFormError('El correo electrónico ya se encuentra registrado por otro socio.');
        return;
      }
    }

    const parts = clienteForm.nombre_completo.trim().split(/\s+/);
    const apellido = parts.length > 1 ? parts.pop()! : '';
    const nombre = parts.join(' ');

    const payload = {
      nombre, apellido,
      codigo_socio: clienteForm.codigo_socio,
      email: clienteForm.email,
      telefono: clienteForm.telefono,
      tipo: clienteForm.tipo,
      plan_id: clienteForm.plan_id || planes[0]?.id || '',
      exencion_cobro: clienteForm.exencion_cobro,
      deuda_acumulada: clienteForm.deuda_acumulada,
      precio_personalizado: isCustomPlan && clienteForm.precio_personalizado !== '' ? Number(clienteForm.precio_personalizado) : null,
      dias_personalizados: isCustomPlan && clienteForm.dias_personalizados !== '' ? Number(clienteForm.dias_personalizados) : null,
      nota_plan_personalizado: isCustomPlan ? (clienteForm.nota_plan_personalizado || null) : null
    };

    if (editingClienteId) {
      const existing = clientes.find(c => c.id === editingClienteId);
      let nuevoEstado = existing?.estado || 'ACTIVO';
      const nuevaDeuda = Number(clienteForm.deuda_acumulada) || 0;
      if (nuevaDeuda > 0 && nuevoEstado === 'ACTIVO') nuevoEstado = 'CON_DEUDA';
      else if (nuevaDeuda === 0 && nuevoEstado !== 'INACTIVO') nuevoEstado = 'ACTIVO';
      const res = updateCliente(editingClienteId, { ...payload, estado: nuevoEstado });
      if (res.success) { setFormSuccess(res.message); setTimeout(() => handleClose(), 1200); }
      else setFormError(res.message);
    } else {
      // Advance to step 2 without saving
      setWizardStep(2);
    }
  };

  // Step 3: Final confirmation — save client to DB with initial turnos_fijos & payment status in one atomic operation
  const handleConfirmFinalRegistration = () => {
    setFormError('');
    const parts = clienteForm.nombre_completo.trim().split(/\s+/);
    const apellido = parts.length > 1 ? parts.pop()! : '';
    const nombre = parts.join(' ');

    let exencion = clienteForm.exencion_cobro;
    if (pagoEstado === 'EXENTO') {
      exencion = 'PERDONADO';
    }

    let deuda = clienteForm.deuda_acumulada || 0;
    if (pagoEstado === 'PARCIAL') {
      const monto = Number(montoParcial) || 0;
      const restante = planPrecio - monto;
      if (restante > 0) {
        deuda = restante;
      }
    }

    const payload = {
      nombre,
      apellido,
      codigo_socio: clienteForm.codigo_socio,
      email: clienteForm.email,
      telefono: clienteForm.telefono,
      tipo: clienteForm.tipo,
      plan_id: clienteForm.plan_id || planes[0]?.id || '',
      exencion_cobro: exencion,
      deuda_acumulada: deuda,
      turnos_fijos: turnosAsignados,
      precio_personalizado: isCustomPlan && clienteForm.precio_personalizado !== '' ? Number(clienteForm.precio_personalizado) : null,
      dias_personalizados: isCustomPlan && clienteForm.dias_personalizados !== '' ? Number(clienteForm.dias_personalizados) : null,
      nota_plan_personalizado: isCustomPlan ? (clienteForm.nota_plan_personalizado || null) : null
    };

    // Save client to database atomically with turnos_fijos
    const res = addCliente(payload) as { success: boolean; message: string; id?: string };
    if (!res.success) {
      setFormError(res.message);
      setWizardStep(1);
      return;
    }

    handleClose();
  };

  const stepIndicator = (
    <div className="flex items-center gap-1 px-5 py-3 border-b border-zinc-800 bg-zinc-950">
      {[{ n: 1, label: 'Datos' }, { n: 2, label: 'Turnos' }, { n: 3, label: 'Pago' }].map((s, i) => (
        <React.Fragment key={s.n}>
          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${wizardStep === s.n ? 'text-emerald-400' : wizardStep > s.n ? 'text-zinc-500' : 'text-zinc-600'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${wizardStep > s.n ? 'bg-emerald-500 border-emerald-500 text-white' : wizardStep === s.n ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
              {wizardStep > s.n ? '✓' : s.n}
            </span>
            {s.label}
          </div>
          {i < 2 && <ChevronRight className="w-3 h-3 text-zinc-700 shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="client-form-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md flex flex-col max-h-[90vh] animate-scale-in">

        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center rounded-t-xl">
          <h3 className="text-base font-bold tracking-tight">{editingClienteId ? 'Modificar ficha de Alumno' : 'Registrar Nuevo Socio'}</h3>
          <button onClick={handleClose} className="text-zinc-400 hover:text-white bg-zinc-800 p-1 rounded cursor-pointer" id="btn-close-form"><X className="w-5 h-5" /></button>
        </div>

        {!editingClienteId && stepIndicator}

        {/* STEP 1 */}
        {(editingClienteId || wizardStep === 1) && (
          <form onSubmit={handleSubmitFormStep1} className="p-5 space-y-4 text-xs font-sans overflow-y-auto flex-1">
            {formError && <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 border border-red-200"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{formError}</span></div>}
            {formSuccess && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 border border-emerald-200"><Check className="w-4 h-4" /><span>{formSuccess}</span></div>}

            <div className="space-y-1">
              <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Código de Socio (Opcional)</label>
              <input type="text" placeholder="ej: SOC-104 (autogenerado si se omite)" value={clienteForm.codigo_socio} onChange={(e) => setClienteForm(prev => ({ ...prev, codigo_socio: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white font-mono" id="form-codigo-socio" />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Nombre y Apellido</label>
              <input type="text" required placeholder="ej: Juan Pérez" value={clienteForm.nombre_completo} onChange={(e) => setClienteForm(prev => ({ ...prev, nombre_completo: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white" id="form-nombre-completo" />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Correo Electrónico (Único)</label>
              <input type="email" required placeholder="ej: juanperez@gmail.com" value={clienteForm.email} disabled={!!editingClienteId} onChange={(e) => setClienteForm(prev => ({ ...prev, email: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white disabled:bg-zinc-100 disabled:text-zinc-400" id="form-email" />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Celular / WhatsApp</label>
              <input type="text" placeholder="ej: 11-5432-8822" value={clienteForm.telefono} onChange={(e) => setClienteForm(prev => ({ ...prev, telefono: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white" id="form-telefono" />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Plan Base Contratado</label>
              <select value={isCustomPlan ? 'PERSONALIZADO' : clienteForm.plan_id} onChange={(e) => { const val = e.target.value; if (val === 'PERSONALIZADO') setIsCustomPlan(true); else { setIsCustomPlan(false); setClienteForm(prev => ({ ...prev, plan_id: val, precio_personalizado: '', dias_personalizados: '', nota_plan_personalizado: '' })); } }} className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white cursor-pointer font-medium" id="form-plan">
                {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} — (${p.precio.toLocaleString('es-AR')})</option>)}
                <option value="PERSONALIZADO">✦ Plan Personalizado / Especial</option>
              </select>
            </div>

            {isCustomPlan && (
              <div className="space-y-3 border border-violet-200 bg-violet-50/60 rounded-xl p-3.5 animate-scale-in">
                <div className="flex items-center justify-between border-b border-violet-200/60 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">✦ Plan Personalizado</span>
                  <span className="text-[9px] text-violet-600 font-semibold bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">Membresía Especial</span>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Plan Base de Referencia</label>
                  <select value={clienteForm.plan_id} onChange={(e) => setClienteForm(prev => ({ ...prev, plan_id: e.target.value }))} className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white cursor-pointer font-medium" id="form-plan-base-referencia">
                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} — (Base: ${p.precio.toLocaleString('es-AR')})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Precio Especial ($ ARS)</label>
                    <input type="number" min="0" step="any" placeholder="ej: 15000" value={clienteForm.precio_personalizado} onChange={(e) => setClienteForm(prev => ({ ...prev, precio_personalizado: e.target.value }))} className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white font-mono" id="form-precio-personalizado" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Días/Semana</label>
                    <input type="number" min="1" max="7" step="1" placeholder="ej: 3" value={clienteForm.dias_personalizados} onChange={(e) => setClienteForm(prev => ({ ...prev, dias_personalizados: e.target.value }))} className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white font-mono" id="form-dias-personalizados" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Nota / Motivo</label>
                  <input type="text" placeholder="ej: Acuerdo temporal, familiar..." value={clienteForm.nota_plan_personalizado} onChange={(e) => setClienteForm(prev => ({ ...prev, nota_plan_personalizado: e.target.value }))} className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white" id="form-nota-plan-personalizado" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Excepción / Exención de Cobro</label>
              <select value={clienteForm.exencion_cobro} onChange={(e) => setClienteForm(prev => ({ ...prev, exencion_cobro: e.target.value as any }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white cursor-pointer" id="form-exencion-cobro">
                <option value="NINGUNA">Ninguna (Control estándar)</option>
                <option value="SUSPENDIDO">Suspensión momentánea</option>
                <option value="POSTERGADO">Postergación autorizada</option>
                <option value="PERDONADO">Exento este mes</option>
              </select>
            </div>

            {editingClienteId && (
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Deuda Acumulada ($ ARS)</label>
                <input type="number" min="0" step="any" placeholder="ej: 9500" value={clienteForm.deuda_acumulada} onChange={(e) => setClienteForm(prev => ({ ...prev, deuda_acumulada: Number(e.target.value) || 0 }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white" id="form-deuda-acumulada" />
              </div>
            )}

            <div className="pt-4 border-t border-zinc-100 flex justify-end gap-2 text-xs font-semibold">
              <button type="button" onClick={handleClose} className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer bg-white" id="btn-cancel-form">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-all font-semibold cursor-pointer flex items-center gap-1.5" id="btn-submit-form">
                {editingClienteId ? 'Guardar Cambios' : <><span>Siguiente</span><ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2 */}
        {!editingClienteId && wizardStep === 2 && (
          <div className="p-5 space-y-4 text-xs font-sans overflow-y-auto flex-1">
            <div>
              <h4 className="font-bold text-sm text-zinc-900">Asignar Turnos Fijos</h4>
              <p className="text-zinc-500 text-[11px] mt-0.5 leading-snug">Elegí los días y horarios semanales. Si aún no los comunicaron, podés omitir y asignarlos después.</p>
            </div>

            {turnosError && <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 border border-red-200"><AlertCircle className="w-4 h-4 shrink-0" /><span>{turnosError}</span></div>}
            {turnosWaitlist && (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-900 text-[11px]">⏳ Turno completo — agregado a lista de espera</p>
                  <p className="text-[11px]">{turnosWaitlist}</p>
                  <p className="text-[10px] text-amber-600">Revisá la lista de espera en la Matriz Fija para resolver cuando se libere un lugar.</p>
                </div>
              </div>
            )}
            {turnosSuccess && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 border border-emerald-200"><CheckCircle className="w-4 h-4 shrink-0" /><span>{turnosSuccess}</span></div>}

            <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl text-[11px] flex justify-between items-center">
              <span className="font-semibold text-zinc-800">Plan: <strong>{isCustomPlan ? 'Personalizado' : (plan?.nombre || 'Sin plan')}</strong></span>
              <span className="bg-zinc-200 text-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {turnosAsignados.length} / {isCustomPlan && clienteForm.dias_personalizados !== '' ? Number(clienteForm.dias_personalizados) : (plan?.dias_por_semana || 5)} asignados
              </span>
            </div>

            {turnosAsignadosSorted.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest block">Turnos asignados</span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {turnosAsignadosSorted.map(tId => {
                    const turno = turnos.find(t => t.id === tId);
                    return (
                      <div key={tId} className="bg-emerald-50 border border-emerald-100 py-2 px-3 rounded-lg flex justify-between items-center text-emerald-900 text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{turno ? `${turno.dia} — ${turno.hora.slice(0,5)} hs` : tId}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setTurnosAsignados(prev => prev.filter(id => id !== tId))}
                          className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded border border-red-200/60 transition-colors cursor-pointer text-[10px] font-bold"
                          title="Remover horario seleccionado"
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-1 border-t border-zinc-100">
              <span className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block">Agregar turno</span>
              <div className="flex gap-2">
                <select value={selectedTurnoToAssign} onChange={(e) => setSelectedTurnoToAssign(e.target.value)} className="flex-1 p-2 border border-zinc-200 rounded-lg text-xs outline-hidden bg-white cursor-pointer">
                  <option value="">-- Seleccioná día y horario --</option>
                  {turnosDisponibles.map(t => <option key={t.id} value={t.id}>{t.dia} - {t.hora.slice(0,5)}hs ({t.asignados_ids.length}/{t.cupo_maximo} ocupados)</option>)}
                </select>
                <button onClick={handleAssignTurno} className="bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-lg font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors border-none shadow-xs"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex justify-between gap-2 text-xs font-semibold">
              <button onClick={() => setWizardStep(3)} className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer bg-white text-zinc-600">Omitir por ahora</button>
              <button onClick={() => setWizardStep(3)} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-all font-semibold cursor-pointer flex items-center gap-1.5"><span>Siguiente</span><ArrowRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {!editingClienteId && wizardStep === 3 && (
          <div className="p-5 space-y-5 text-xs font-sans overflow-y-auto flex-1">
            <div>
              <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-600" />Estado de pago del mes</h4>
              <p className="text-zinc-500 text-[11px] mt-0.5 leading-snug">¿El socio ya abonó el mes vigente (<strong className="capitalize">{new Date().toLocaleString('es-AR', { month: 'long' })}</strong>)?</p>
            </div>

            <div className="space-y-2.5">
              {[
                { id: 'MES_COMPLETO' as PagoEstado, emoji: '✅', title: 'Abonó el mes completo', desc: 'El socio pagó la cuota completa del mes vigente.', color: 'emerald' },
                { id: 'PARCIAL' as PagoEstado, emoji: '⚠️', title: 'Abonó parcialmente', desc: 'Pagó solo una parte. Se calculará la deuda restante.', color: 'amber' },
                { id: 'EXENTO' as PagoEstado, emoji: '🎁', title: 'Exento de pago este mes', desc: 'No cobra cuota este mes (convenio, cortesía, etc.).', color: 'violet' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setPagoEstado(opt.id)}
                  className={`w-full p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                    pagoEstado === opt.id
                      ? `border-${opt.color}-500 bg-${opt.color}-50`
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${pagoEstado === opt.id ? `border-${opt.color}-500 bg-${opt.color}-500` : 'border-zinc-300'}`}>
                    {pagoEstado === opt.id && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-zinc-900 text-xs">{opt.emoji} {opt.title}</p>
                    <p className="text-zinc-500 text-[10px] mt-0.5">{opt.desc}</p>
                    {opt.id === 'PARCIAL' && pagoEstado === 'PARCIAL' && (
                      <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <label className="text-zinc-600 font-semibold text-[10px] shrink-0">Monto abonado $</label>
                        <input type="number" min="0" step="any" placeholder={`Cuota: $${planPrecio.toLocaleString('es-AR')}`} value={montoParcial} onChange={(e) => setMontoParcial(e.target.value)} className="flex-1 border border-amber-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-amber-400 outline-hidden bg-white font-mono" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-100 flex justify-between gap-2 text-xs font-semibold">
              <button onClick={() => setWizardStep(2)} className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer bg-white text-zinc-600">← Volver</button>
              <button onClick={handleConfirmFinalRegistration} disabled={!pagoEstado} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                <CheckCircle className="w-3.5 h-3.5" /><span>Confirmar registro</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
