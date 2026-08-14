// src/components/RoleSwitcher.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { Shield, User, Dumbbell, ChevronDown, Check, Sparkles } from 'lucide-react';
import logoKaha from '../../assets/logokaha.png';
import { OnboardingModal } from '../Onboarding/OnboardingModal';

export const RoleSwitcher: React.FC = () => {
  const {
    rolActivo, setRolActivo, clientes,
    selectedSocioId, setSelectedSocioId, googleUser
  } = useGym();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If user is Google-logged-in as SOCIO, hide simulation switcher entirely
  if (googleUser?.role === 'SOCIO') {
    return null;
  }

  const isOperatorBound = googleUser?.role === 'OPERADOR';

  const rolLabel = rolActivo === 'ADMIN' ? 'Administrador' : rolActivo === 'OPERADOR' ? 'Profesor' : 'Socio';
  const rolColor = rolActivo === 'ADMIN' 
    ? 'text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100/80' 
    : rolActivo === 'OPERADOR' 
    ? 'text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200/80' 
    : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100/80';

  const handleSelectRole = (newRole: 'ADMIN' | 'OPERADOR' | 'SOCIO') => {
    if (newRole === 'ADMIN' && isOperatorBound) return;
    setRolActivo(newRole);
    setIsDropdownOpen(false);
  };

  return (
    <div className="bg-white text-slate-700 py-2 px-3 sm:px-4 lg:px-6 border-b border-slate-200 flex flex-row flex-wrap justify-between items-center gap-2 text-xs" id="role-switcher-container">
      
      {/* Brand + Interactive Unified Role Dropdown */}
      <div className="flex items-center gap-2 min-w-0" ref={dropdownRef}>
        <img src={logoKaha} alt="KAHA GYM Logo" className="w-6 h-6 rounded-lg object-contain shrink-0" id="gym-logo-badge" />
        <span className="font-display font-bold text-zinc-900 text-xs tracking-tight shrink-0">KAHA GYM</span>
        <span className="text-slate-300 shrink-0">·</span>

        {/* UNIFIED ROLE DROPDOWN TRIGGER */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shadow-2xs ${rolColor}`}
            id="role-dropdown-trigger"
          >
            {rolActivo === 'ADMIN' && <Shield className="w-3.5 h-3.5 text-sky-600" />}
            {rolActivo === 'OPERADOR' && <Dumbbell className="w-3.5 h-3.5 text-slate-600" />}
            {rolActivo === 'SOCIO' && <User className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{rolLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* DROPDOWN MENU */}
          {isDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 space-y-0.5 animate-scale-in text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Cambiar Rol / Vista
              </div>

              {/* ADMIN OPTION */}
              <button
                type="button"
                onClick={() => handleSelectRole('ADMIN')}
                disabled={isOperatorBound}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors border-none bg-transparent cursor-pointer ${
                  isOperatorBound
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : rolActivo === 'ADMIN'
                    ? 'bg-sky-50 font-bold text-sky-900'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-sky-600" />
                  <span>Administrador</span>
                </span>
                {rolActivo === 'ADMIN' && <Check className="w-3.5 h-3.5 text-sky-600" />}
              </button>

              {/* OPERADOR OPTION */}
              <button
                type="button"
                onClick={() => handleSelectRole('OPERADOR')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors border-none bg-transparent cursor-pointer ${
                  rolActivo === 'OPERADOR'
                    ? 'bg-slate-100 font-bold text-slate-900'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Dumbbell className="w-3.5 h-3.5 text-slate-600" />
                  <span>Profesor / Operador</span>
                </span>
                {rolActivo === 'OPERADOR' && <Check className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              {/* SOCIO OPTION */}
              <button
                type="button"
                onClick={() => handleSelectRole('SOCIO')}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors border-none bg-transparent cursor-pointer ${
                  rolActivo === 'SOCIO'
                    ? 'bg-emerald-50 font-bold text-emerald-900'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Socio (Vista Cliente)</span>
                </span>
                {rolActivo === 'SOCIO' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            </div>
          )}
        </div>

        {/* ONBOARDING TUTORIAL BUTTON */}
        <button
          type="button"
          onClick={() => setShowOnboardingModal(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 transition-all cursor-pointer shadow-2xs"
          title="Ver guía tutorial de inicio"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span className="hidden sm:inline">Guía / Tutorial</span>
        </button>
      </div>

      {/* Selected Socio Dropdown (Only visible if SOCIO is active) */}
      {rolActivo === 'SOCIO' && (
        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs min-w-0">
          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[10px] text-slate-500 font-semibold hidden sm:inline">Simular:</span>
          <select
            value={selectedSocioId || ''}
            onChange={(e) => setSelectedSocioId(e.target.value || null)}
            className="bg-transparent text-slate-800 text-[10px] outline-hidden font-bold cursor-pointer truncate max-w-[140px] sm:max-w-[180px]"
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

      {/* ONBOARDING MODAL */}
      <OnboardingModal 
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        rol={rolActivo}
        nombreUsuario={googleUser?.name}
      />
    </div>
  );
};
