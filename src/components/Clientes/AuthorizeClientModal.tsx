import React, { useState } from 'react';
import { useGym } from '../../GymContext';
import { Plan } from '../../types';
import { Check, X, ShieldAlert, Sparkles } from 'lucide-react';

interface AuthorizeClientModalProps {
  clientId: string;
  onClose: () => void;
  onAuthorized: (planId: string) => void;
}

export const AuthorizeClientModal: React.FC<AuthorizeClientModalProps> = ({ clientId, onClose, onAuthorized }) => {
  const { clientes, planes, autorizarCliente } = useGym();
  
  const client = clientes.find(c => c.id === clientId);
  const activePlans = planes.filter(p => p.id !== 'p-none'); // Filter out the fallback plan
  
  const [selectedPlanId, setSelectedPlanId] = useState<string>(activePlans[0]?.id || '');
  const [error, setError] = useState('');

  if (!client) return null;

  const handleConfirm = () => {
    if (!selectedPlanId) {
      setError('Debes seleccionar un plan de abono para autorizar al socio.');
      return;
    }

    const res = autorizarCliente(clientId, selectedPlanId);
    if (res.success) {
      onAuthorized(selectedPlanId);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs" id="authorize-client-modal">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden relative animate-scale-up">
        
        {/* Header */}
        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-lime-400 animate-pulse" />
              Autorizar Nuevo Socio
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Asignación de plan de abono inicial</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          
          {/* Client summary */}
          <div className="bg-zinc-50 border border-zinc-200/50 rounded-xl p-3.5 space-y-1">
            <span className="font-bold text-[9px] text-zinc-400 uppercase tracking-widest block font-mono">Detalles del Socio</span>
            <p className="font-bold text-zinc-900 text-xs">{client.apellido}, {client.nombre}</p>
            <p className="text-[10px] text-zinc-500 font-medium">{client.email}</p>
            {client.telefono && <p className="text-[10px] text-zinc-400">Celular: {client.telefono}</p>}
          </div>

          {/* Plan selection */}
          <div className="space-y-2.5">
            <label className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block font-mono">Selecciona las Sesiones Semanales</label>
            
            <div className="grid grid-cols-1 gap-2">
              {activePlans.map(plan => {
                const isSelected = plan.id === selectedPlanId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setError('');
                    }}
                    className={`text-left p-3 rounded-xl border flex justify-between items-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-lime-50 border-lime-400 shadow-2xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-zinc-900 text-xs">{plan.nombre}</p>
                      <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                        {plan.dias_por_semana} clases fijas permitidas por semana
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-zinc-900 text-xs">
                        ${plan.precio.toLocaleString('es-AR')}
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
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 p-2.5 border border-red-200 rounded-lg text-center font-semibold text-[10px]">
              {error}
            </div>
          )}

          {/* Confirm Button */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl transition-colors cursor-pointer border border-transparent"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 px-4 bg-lime-300 hover:bg-lime-400 text-zinc-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer border border-transparent"
            >
              <Sparkles className="w-4 h-4 text-zinc-900" />
              Autorizar Socio
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
