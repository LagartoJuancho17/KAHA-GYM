// src/components/RoleSwitcher.tsx
import React from 'react';
import { useGym } from '../GymContext';
import { Shield, Sparkles, RefreshCw, Clock, User } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { 
    rolActivo, setRolActivo, borrarHistorial, clientes, 
    selectedSocioId, setSelectedSocioId, googleUser 
  } = useGym();

  // If user is Google-logged-in as SOCIO, hide simulation switcher entirely
  if (googleUser?.role === 'SOCIO') {
    return null;
  }

  const isOperatorBound = googleUser?.role === 'OPERADOR';

  return (
    <div className="bg-slate-100 text-slate-700 py-2.5 px-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs" id="role-switcher-container">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-50 text-emerald-650 p-2 rounded-lg border border-emerald-100" id="gym-logo-badge">
          <Sparkles className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <h1 className="font-sans font-bold tracking-tight text-sm text-slate-800">KAHA GYM — Control de Consola</h1>
          <p className="text-slate-500 text-[10px] font-sans">Canal Operativo Reactivo — <span className="font-semibold text-emerald-600 font-mono">RG-2026 🇦🇷</span></p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Roles Toggles */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-lg border border-slate-250 gap-1">
          <button
            onClick={() => {
              if (isOperatorBound) return;
              setRolActivo('ADMIN');
            }}
            disabled={isOperatorBound}
            title={isOperatorBound ? "Acceso restringido: Iniciaste sesión como Profesor" : "Simular administrador"}
            className={`px-3 py-1 rounded-md transition-all font-semibold flex items-center gap-1.5 text-[10px] ${
              isOperatorBound 
                ? 'opacity-35 cursor-not-allowed text-slate-400' 
                : 'cursor-pointer'
            } ${
              rolActivo === 'ADMIN'
                ? 'bg-sky-500 text-slate-950 shadow-xs'
                : 'text-slate-655 hover:text-slate-850'
            }`}
            id="role-btn-admin"
          >
            <Shield className="w-3 h-3" />
            ADMIN
          </button>
          <button
            onClick={() => setRolActivo('OPERADOR')}
            className={`px-3 py-1 rounded-md transition-all font-semibold flex items-center gap-1.5 text-[10px] cursor-pointer ${
              rolActivo === 'OPERADOR'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-655 hover:text-slate-850'
            }`}
            id="role-btn-operator"
          >
            PROFE
          </button>
          <button
            onClick={() => setRolActivo('SOCIO')}
            className={`px-3 py-1 rounded-md transition-all font-semibold flex items-center gap-1.5 text-[10px] cursor-pointer ${
              rolActivo === 'SOCIO'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-655 hover:text-slate-850'
            }`}
            id="role-btn-socio"
          >
            <User className="w-3 h-3" />
            SOCIO (VISTA CLIENTE)
          </button>
        </div>

        {/* Selected Socio Dropdown (Only visible if SOCIO is active) */}
        {rolActivo === 'SOCIO' && (
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-[10px] font-sans font-medium">Socio Activo:</span>
            <select
              value={selectedSocioId || ''}
              onChange={(e) => setSelectedSocioId(e.target.value || null)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] rounded px-1.5 py-0.5 outline-none font-medium cursor-pointer"
            >
              <option value="" disabled>Seleccione socio...</option>
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
