// src/components/Clientes/ClientePlanAssignModal.tsx
import React, { useState, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { X, Check, CreditCard, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

interface ClientePlanAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

export const ClientePlanAssignModal: React.FC<ClientePlanAssignModalProps> = ({
  isOpen,
  onClose,
  cliente
}) => {
  const { clientes, planes, updateCliente, autorizarCliente } = useGym();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isCustomPlan, setIsCustomPlan] = useState<boolean>(false);
  const [precioPersonalizado, setPrecioPersonalizado] = useState<string>('');
  const [diasPersonalizados, setDiasPersonalizados] = useState<string>('');
  const [notaPlanPersonalizado, setNotaPlanPersonalizado] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const activeClient = cliente ? (clientes.find(c => c.id === cliente.id) || cliente) : null;
  const activePlans = planes.filter(p => p.id !== 'p-none');

  useEffect(() => {
    if (isOpen && activeClient) {
      setError('');
      setSuccess('');
      const hasCustom = activeClient.precio_personalizado != null || activeClient.dias_personalizados != null;
      setIsCustomPlan(hasCustom);
      setSelectedPlanId(activeClient.plan_id && activeClient.plan_id !== 'p-none' ? activeClient.plan_id : (activePlans[0]?.id || ''));
      setPrecioPersonalizado(activeClient.precio_personalizado?.toString() || '');
      setDiasPersonalizados(activeClient.dias_personalizados?.toString() || '');
      setNotaPlanPersonalizado(activeClient.nota_plan_personalizado || '');
    }
  }, [isOpen, activeClient]);

  if (!isOpen || !activeClient) return null;

  const handleSavePlan = () => {
    setError('');
    setSuccess('');

    if (!selectedPlanId) {
      setError('Debes seleccionar un plan de la lista.');
      return;
    }

    if (isCustomPlan) {
      if (!precioPersonalizado || Number(precioPersonalizado) <= 0) {
        setError('Por favor ingresa un precio mensual válido.');
        return;
      }
      if (!diasPersonalizados || Number(diasPersonalizados) <= 0 || Number(diasPersonalizados) > 7) {
        setError('Ingresa una cantidad de días semanales entre 1 y 7.');
        return;
      }
    }

    const updates: Partial<Cliente> = {
      plan_id: selectedPlanId,
      precio_personalizado: isCustomPlan ? Number(precioPersonalizado) : undefined,
      dias_personalizados: isCustomPlan ? Number(diasPersonalizados) : undefined,
      nota_plan_personalizado: isCustomPlan ? notaPlanPersonalizado : undefined,
    };

    const res = updateCliente(activeClient.id, updates);
    
    // Si el socio aún no estaba autorizado, autorizarlo automáticamente al asignarle un plan
    if (!activeClient.autorizado) {
      autorizarCliente(activeClient.id, selectedPlanId, activeClient.tipo || 'FIJO');
    }

    if (res.success) {
      setSuccess('Plan asignado y actualizado correctamente.');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1200);
    } else {
      setError(res.message || 'Error al guardar el plan.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs" id="assign-plan-modal">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden relative animate-scale-up">
        
        {/* Header */}
        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-lime-400" />
              Asignar / Modificar Plan
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Socio: {activeClient.nombre} {activeClient.apellido}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-center gap-2 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Selector de Planes estándar */}
          <div className="space-y-2">
            <label className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block font-mono">
              Seleccionar Plan de Abono
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {activePlans.map(plan => {
                const isSelected = !isCustomPlan && plan.id === selectedPlanId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setIsCustomPlan(false);
                      setSelectedPlanId(plan.id);
                      setError('');
                    }}
                    className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-lime-50 border-lime-400 shadow-2xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-zinc-900 text-xs">{plan.nombre}</p>
                      <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                        {plan.dias_por_semana} días fijos por semana
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-zinc-900 text-xs">
                        ${plan.precio.toLocaleString('es-AR')} ARS
                      </span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-lime-400 border-lime-500 text-zinc-900' 
                          : 'border-zinc-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Botón de Plan Personalizado */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomPlan(true);
                  setError('');
                }}
                className={`w-full text-left p-3 rounded-xl border flex justify-between items-center transition-all cursor-pointer ${
                  isCustomPlan
                    ? 'bg-violet-50 border-violet-400 shadow-2xs'
                    : 'bg-white border-dashed border-zinc-300 hover:border-violet-300'
                }`}
              >
                <div>
                  <p className="font-bold text-violet-950 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    Plan Personalizado / Especial
                  </p>
                  <p className="text-[10px] text-violet-600 font-medium mt-0.5">
                    Definir tarifa y días semanales a medida
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                  isCustomPlan 
                    ? 'bg-violet-500 border-violet-600 text-white' 
                    : 'border-zinc-300 bg-white'
                }`}>
                  {isCustomPlan && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>

          {/* Opciones de Plan Personalizado */}
          {isCustomPlan && (
            <div className="space-y-3 border border-violet-200 bg-violet-50/60 rounded-xl p-3.5 animate-scale-in">
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-800 block">
                ✦ Tarifas Personalizadas
              </span>
              
              <div className="space-y-1">
                <label className="text-zinc-600 font-semibold block text-[10px] uppercase">Plan Base de Referencia</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white cursor-pointer font-medium"
                >
                  {activePlans.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — (Base: ${p.precio.toLocaleString('es-AR')})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-600 font-semibold block text-[10px] uppercase">Precio ($ ARS/mes)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 35000"
                    value={precioPersonalizado}
                    onChange={(e) => setPrecioPersonalizado(e.target.value)}
                    className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-600 font-semibold block text-[10px] uppercase">Días / Semana</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    placeholder="Ej: 3"
                    value={diasPersonalizados}
                    onChange={(e) => setDiasPersonalizados(e.target.value)}
                    className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-600 font-semibold block text-[10px] uppercase">Nota / Motivo Especial (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Descuento familiar o beca"
                  value={notaPlanPersonalizado}
                  onChange={(e) => setNotaPlanPersonalizado(e.target.value)}
                  className="w-full border border-violet-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-violet-400 outline-hidden bg-white"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl transition-colors cursor-pointer border border-transparent"
            >
              Cancelar
            </button>
            <button
              onClick={handleSavePlan}
              className="flex-1 py-2 px-4 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer border border-transparent"
            >
              <Check className="w-4 h-4 text-lime-400" />
              Guardar Plan
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
