// src/components/RoleSwitcher.tsx
import React from 'react';
import { useGym } from '../../GymContext';
import { Shield, Sparkles, User, Dumbbell } from 'lucide-react';
import logoKaha from '../../assets/logokaha.png';

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
    <div className="bg-white text-slate-700 py-2 px-3 sm:px-4 lg:px-6 border-b border-slate-200 flex flex-row flex-wrap justify-between items-center gap-2 text-xs overflow-x-hidden" id="role-switcher-container">
      {/* Brand + rol activo indicator */}
      <div className="flex items-center gap-2 min-w-0 shrink">
        <img src={logoKaha} alt="KAHA GYM Logo" className="w-6 h-6 rounded-lg object-contain shrink-0" id="gym-logo-badge" />
        <div className="min-w-0 hidden sm:block">
          <span className="font-display font-bold text-zinc-900 text-xs tracking-tight">KAHA GYM</span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${rolColor}`}>
            {rolLabel}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border sm:hidden ${rolColor}`}>
          {rolLabel}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-full border border-zinc-200 gap-0.5">
          <button
            onClick={() => { if (!isOperatorBound) setRolActivo('ADMIN'); }}
            disabled={isOperatorBound}
            title={isOperatorBound ? 'Acceso restringido: estás autenticado como Profesor' : 'Vista de Administrador'}
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all font-semibold flex items-center gap-1 text-[10px] ${
              isOperatorBound ? 'opacity-30 cursor-not-allowed text-zinc-400'
                : rolActivo === 'ADMIN' ? 'bg-zinc-900 text-white shadow-sm cursor-pointer'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white cursor-pointer'
            }`}
            id="role-btn-admin"
          >
            <Shield className="w-3 h-3" />
            Admin
          </button>
          <button
            onClick={() => setRolActivo('OPERADOR')}
            title="Vista de Profesor/Operador"
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all font-semibold flex items-center gap-1 text-[10px] cursor-pointer ${
              rolActivo === 'OPERADOR'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'
            }`}
            id="role-btn-operator"
          >
            <Dumbbell className="w-3 h-3" />
            Profe
          </button>
          <button
            onClick={() => setRolActivo('SOCIO')}
            title="Vista del Socio (panel del cliente)"
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all font-semibold flex items-center gap-1 text-[10px] cursor-pointer ${
              rolActivo === 'SOCIO'
                ? 'bg-lime-300 text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white'
            }`}
            id="role-btn-socio"
          >
            <User className="w-3 h-3" />
            Socio
          </button>
        </div>

        {/* Selected Socio Dropdown (Only visible if SOCIO is active) */}
        {rolActivo === 'SOCIO' && (
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-sm min-w-0">
            <User className="w-3 h-3 text-emerald-600 shrink-0" />
            <select
              value={selectedSocioId || ''}
              onChange={(e) => setSelectedSocioId(e.target.value || null)}
              className="bg-transparent text-slate-800 text-[10px] outline-none font-medium cursor-pointer truncate max-w-[104px] sm:max-w-[150px]"
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
