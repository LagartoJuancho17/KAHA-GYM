// src/components/RoleSwitcher.tsx
import React from 'react';
import { useGym } from '../../GymContext';
import { Shield, Sparkles, User, Dumbbell } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const {
    rolActivo, setRolActivo, clientes,
    selectedSocioId, setSelectedSocioId, googleUser
  } = useGym();

  // If user is Google-logged-in as SOCIO, hide simulation switcher entirely
  if (googleUser?.role === 'SOCIO') {
    return null;
  }

  const isOperatorBound = googleUser?.role === 'OPERADOR';

  const rolLabel = rolActivo === 'ADMIN' ? 'Administrador' : rolActivo === 'OPERADOR' ? 'Profesor' : 'Socio';
  const rolColor = rolActivo === 'ADMIN' ? 'text-sky-700 bg-sky-50 border-sky-200' : rolActivo === 'OPERADOR' ? 'text-slate-700 bg-slate-100 border-slate-300' : 'text-emerald-700 bg-emerald-50 border-emerald-200';

  return (
    <div className="bg-white text-slate-700 py-2 px-4 lg:px-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs" id="role-switcher-container">
      {/* Brand + rol activo indicator */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 shrink-0" id="gym-logo-badge">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-slate-800 text-xs tracking-tight">KAHA GYM</span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${rolColor}`}>
            {rolLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* MODO SIMULACION label */}
        <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest hidden sm:inline">Modo Simulación:</span>

        {/* Roles Toggles */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 gap-0.5">
          <button
            onClick={() => { if (!isOperatorBound) setRolActivo('ADMIN'); }}
            disabled={isOperatorBound}
            title={isOperatorBound ? 'Acceso restringido: estás autenticado como Profesor' : 'Vista de Administrador'}
            className={`px-2.5 py-1 rounded-md transition-all font-semibold flex items-center gap-1 text-[10px] ${
              isOperatorBound ? 'opacity-30 cursor-not-allowed text-slate-400'
                : rolActivo === 'ADMIN' ? 'bg-sky-500 text-white shadow-sm cursor-pointer'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer'
            }`}
            id="role-btn-admin"
          >
            <Shield className="w-3 h-3" />
            Admin
          </button>
          <button
            onClick={() => setRolActivo('OPERADOR')}
            title="Vista de Profesor/Operador"
            className={`px-2.5 py-1 rounded-md transition-all font-semibold flex items-center gap-1 text-[10px] cursor-pointer ${
              rolActivo === 'OPERADOR'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="role-btn-operator"
          >
            <Dumbbell className="w-3 h-3" />
            Profe
          </button>
          <button
            onClick={() => setRolActivo('SOCIO')}
            title="Vista del Socio (panel del cliente)"
            className={`px-2.5 py-1 rounded-md transition-all font-semibold flex items-center gap-1 text-[10px] cursor-pointer ${
              rolActivo === 'SOCIO'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="role-btn-socio"
          >
            <User className="w-3 h-3" />
            Socio
          </button>
        </div>

        {/* Selected Socio Dropdown (Only visible if SOCIO is active) */}
        {rolActivo === 'SOCIO' && (
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-sm">
            <User className="w-3 h-3 text-emerald-600 shrink-0" />
            <select
              value={selectedSocioId || ''}
              onChange={(e) => setSelectedSocioId(e.target.value || null)}
              className="bg-transparent text-slate-800 text-[10px] outline-none font-medium cursor-pointer max-w-[150px]"
            >
              <option value="" disabled>Elegir socio...</option>
              {clientes.filter(c => c.activo && c.autorizado !== false).map(c => (
                <option key={c.id} value={c.id}>
                  {c.apellido}, {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
