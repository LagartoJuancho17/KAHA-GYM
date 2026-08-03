// src/components/Clientes/ClienteFormModal.tsx
import React, { useState, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { TipoCliente } from '../../types';
import { X, AlertCircle, Check } from 'lucide-react';

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingClienteId: string | null;
}

export const ClienteFormModal: React.FC<ClienteFormModalProps> = ({
  isOpen,
  onClose,
  editingClienteId
}) => {
  const { clientes, planes, addCliente, updateCliente } = useGym();

  const [isCustomPlan, setIsCustomPlan] = useState(false);

  const [clienteForm, setClienteForm] = useState({
    codigo_socio: '',
    nombre: '',
    apellido: '',
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

  // Reset form
  const resetForm = () => {
    setClienteForm({
      codigo_socio: '',
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      tipo: 'FIJO',
      plan_id: planes[0]?.id || '',
      exencion_cobro: 'NINGUNA',
      deuda_acumulada: 0,
      precio_personalizado: '',
      dias_personalizados: '',
      nota_plan_personalizado: ''
    });
    setIsCustomPlan(false);
    setFormError('');
    setFormSuccess('');
  };

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Load client data if editing
  useEffect(() => {
    if (editingClienteId && isOpen) {
      const cl = clientes.find(c => c.id === editingClienteId);
      if (cl) {
        const hasCustom = cl.precio_personalizado != null || cl.dias_personalizados != null || Boolean(cl.nota_plan_personalizado);
        setIsCustomPlan(hasCustom);
        setClienteForm({
          codigo_socio: cl.codigo_socio || '',
          nombre: cl.nombre,
          apellido: cl.apellido,
          email: cl.email,
          telefono: cl.telefono,
          tipo: cl.tipo,
          plan_id: cl.plan_id,
          exencion_cobro: cl.exencion_cobro || 'NINGUNA',
          deuda_acumulada: cl.deuda_acumulada,
          precio_personalizado: cl.precio_personalizado ?? '',
          dias_personalizados: cl.dias_personalizados ?? '',
          nota_plan_personalizado: cl.nota_plan_personalizado || ''
        });
      }
    } else {
      resetForm();
    }
  }, [editingClienteId, isOpen, clientes, planes]);

  if (!isOpen) return null;

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!clienteForm.nombre || !clienteForm.apellido || !clienteForm.email) {
      setFormError('Nombre, Apellido y Email son requeridos.');
      return;
    }

    const payload = {
      ...clienteForm,
      plan_id: clienteForm.plan_id || planes[0]?.id || '',
      precio_personalizado: isCustomPlan && clienteForm.precio_personalizado !== '' ? Number(clienteForm.precio_personalizado) : undefined,
      dias_personalizados: isCustomPlan && clienteForm.dias_personalizados !== '' ? Number(clienteForm.dias_personalizados) : undefined,
      nota_plan_personalizado: isCustomPlan ? (clienteForm.nota_plan_personalizado || undefined) : undefined
    };

    if (editingClienteId) {
      const existing = clientes.find(c => c.id === editingClienteId);
      let nuevoEstado = existing?.estado || 'ACTIVO';
      const nuevaDeuda = Number(clienteForm.deuda_acumulada) || 0;
      
      if (nuevaDeuda > 0 && nuevoEstado === 'ACTIVO') {
        nuevoEstado = 'CON_DEUDA';
      } else if (nuevaDeuda === 0 && nuevoEstado !== 'INACTIVO') {
        nuevoEstado = 'ACTIVO';
      }

      const res = updateCliente(editingClienteId, {
        ...payload,
        estado: nuevoEstado
      });
      if (res.success) {
        setFormSuccess(res.message);
        setTimeout(() => {
          onClose();
          resetForm();
        }, 1200);
      } else {
        setFormError(res.message);
      }
    } else {
      const res = addCliente(payload);
      if (res.success) {
        setFormSuccess(res.message);
        setTimeout(() => {
          onClose();
          resetForm();
        }, 1200);
      } else {
        setFormError(res.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="client-form-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md flex flex-col max-h-[90vh] animate-scale-in">
        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
          <h3 className="text-base font-bold tracking-tight">
            {editingClienteId ? 'Modificar ficha de Alumno' : 'Registrar Nuevo Socio'}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800 p-1 rounded cursor-pointer"
            id="btn-close-form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs font-sans overflow-y-auto flex-1">
          {formError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 border border-emerald-200">
              <Check className="w-4 h-4" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* CÓDIGO / ID DE SOCIO */}
          <div className="space-y-1">
            <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Código de Socio / ID Personalizado (Opcional)</label>
            <input
              type="text"
              placeholder="ej: SOC-104 (autogenerado si se omite)"
              value={clienteForm.codigo_socio}
              onChange={(e) => setClienteForm(prev => ({ ...prev, codigo_socio: e.target.value }))}
              className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white font-mono"
              id="form-codigo-socio"
            />
          </div>

          {/* NOMBRE */}
          <div className="space-y-1">
            <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Nombre</label>
            <input
              type="text"
              required
              placeholder="ej: Juan"
              value={clienteForm.nombre}
              onChange={(e) => setClienteForm(prev => ({ ...prev, nombre: e.target.value }))}
              className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white"
              id="form-nombre"
            />
          </div>

          {/* APELLIDO */}
          <div className="space-y-1">
            <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Apellido</label>
            <input
              type="text"
              required
              placeholder="ej: Pérez"
              value={clienteForm.apellido}
              onChange={(e) => setClienteForm(prev => ({ ...prev, apellido: e.target.value }))}
              className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white"
              id="form-apellido"
            />
          </div>

          {/* EMAIL */}
          <div className="space-y-1">
            <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Correo Electrónico (Único)</label>
            <input
              type="email"
              required
              placeholder="ej: juanperez@gmail.com"
              value={clienteForm.email}
              disabled={!!editingClienteId}
              onChange={(e) => setClienteForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white disabled:bg-zinc-100 disabled:text-zinc-400"
              id="form-email"
            />
          </div>

          {/* TELEFONO */}
          <div className="space-y-1">
            <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Celular / WhatsApp</label>
            <input
              type="text"
              placeholder="ej: 11-5432-8822"
              value={clienteForm.telefono}
              onChange={(e) => setClienteForm(prev => ({ ...prev, telefono: e.target.value }))}
              className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white"
              id="form-telefono"
            />
          </div>

          {/* PLAN BASE CONTRATADO */}
          <div className="space-y-1">
            <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Plan Base Contratado</label>
            <select
              value={isCustomPlan ? 'PERSONALIZADO' : clienteForm.plan_id}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'PERSONALIZADO') {
                  setIsCustomPlan(true);
                } else {
                  setIsCustomPlan(false);
                  setClienteForm(prev => ({
                    ...prev,
                    plan_id: val,
                    precio_personalizado: '',
                    dias_personalizados: '',
                    nota_plan_personalizado: ''
                  }));
                }
              }}
              className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white cursor-pointer font-medium"
              id="form-plan"
            >
              {planes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} — (${p.precio.toLocaleString('es-AR')})</option>
              ))}
              <option value="PERSONALIZADO">✦ Plan Personalizado / Especial</option>
            </select>
          </div>

          {/* CAMPOS DE PLAN PERSONALIZADO (SOLO SE DESPLIEGAN AL SELECCIONAR "PERSONALIZADO") */}
          {isCustomPlan && (
            <div className="space-y-3 border border-violet-200 bg-violet-50/60 rounded-xl p-3.5 animate-scale-in">
              <div className="flex items-center justify-between border-b border-violet-200/60 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-700 flex items-center gap-1">
                  ✦ Opciones de Plan Personalizado
                </span>
                <span className="text-[9px] text-violet-600 font-semibold bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">
                  Membresía Especial
                </span>
              </div>

              {/* PLAN BASE DE REFERENCIA */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Plan Base de Referencia</label>
                <select
                  value={clienteForm.plan_id}
                  onChange={(e) => setClienteForm(prev => ({ ...prev, plan_id: e.target.value }))}
                  className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white cursor-pointer font-medium"
                  id="form-plan-base-referencia"
                >
                  {planes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — (Base estándar: ${p.precio.toLocaleString('es-AR')})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Precio Especial ($ ARS/mes)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="ej: 15000"
                    value={clienteForm.precio_personalizado}
                    onChange={(e) => setClienteForm(prev => ({ ...prev, precio_personalizado: e.target.value }))}
                    className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white font-mono"
                    id="form-precio-personalizado"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Días/Semana Personalizados</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    step="1"
                    placeholder="ej: 3"
                    value={clienteForm.dias_personalizados}
                    onChange={(e) => setClienteForm(prev => ({ ...prev, dias_personalizados: e.target.value }))}
                    className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white font-mono"
                    id="form-dias-personalizados"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Nota / Motivo del Plan Especial</label>
                <input
                  type="text"
                  placeholder="ej: Acuerdo temporada de invierno, familiar de empleado..."
                  value={clienteForm.nota_plan_personalizado}
                  onChange={(e) => setClienteForm(prev => ({ ...prev, nota_plan_personalizado: e.target.value }))}
                  className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white"
                  id="form-nota-plan-personalizado"
                />
              </div>
            </div>
          )}

          {/* EXENCIÓN DE COBRO */}
          <div className="space-y-1">
            <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Excepción / Exención de Cobro</label>
            <select
              value={clienteForm.exencion_cobro}
              onChange={(e) => setClienteForm(prev => ({ ...prev, exencion_cobro: e.target.value as any }))}
              className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white cursor-pointer"
              id="form-exencion-cobro"
            >
              <option value="NINGUNA">Ninguna (Control de cobro estándar)</option>
              <option value="SUSPENDIDO">Suspensión de cobro momentáneo</option>
              <option value="POSTERGADO">Postergación de cobro autorizada</option>
              <option value="PERDONADO">Perdonar pago / Exento este mes</option>
            </select>
          </div>

          {/* DEUDA ACUMULADA */}
          {editingClienteId && (
            <div className="space-y-1">
              <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Deuda Acumulada ($ ARS)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="ej: 9500"
                value={clienteForm.deuda_acumulada}
                onChange={(e) => setClienteForm(prev => ({ ...prev, deuda_acumulada: Number(e.target.value) || 0 }))}
                className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white"
                id="form-deuda-acumulada"
              />
            </div>
          )}

          <div className="pt-4 border-t border-zinc-100 flex justify-end gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer bg-white"
              id="btn-cancel-form"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-all font-semibold cursor-pointer"
              id="btn-submit-form"
            >
              {editingClienteId ? 'Guardar Cambios' : 'Confirmar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
