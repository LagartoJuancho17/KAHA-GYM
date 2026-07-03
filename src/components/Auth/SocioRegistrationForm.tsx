import React, { useState } from 'react';
import { useGym } from '../../GymContext';
import { Shield, Sparkles, User, Phone, LogOut } from 'lucide-react';

export const SocioRegistrationForm: React.FC = () => {
  const { pendingRegistrationUser, completeSocioRegistration, signOutGoogle } = useGym();
  
  const [nombre, setNombre] = useState(() => {
    if (!pendingRegistrationUser?.name) return '';
    const parts = pendingRegistrationUser.name.split(' ');
    return parts[0] || '';
  });
  
  const [apellido, setApellido] = useState(() => {
    if (!pendingRegistrationUser?.name) return '';
    const parts = pendingRegistrationUser.name.split(' ');
    return parts.slice(1).join(' ') || '';
  });
  
  const [telefono, setTelefono] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!pendingRegistrationUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nombre.trim()) {
      setErrorMsg('El nombre es requerido.');
      return;
    }
    if (!apellido.trim()) {
      setErrorMsg('El apellido es requerido.');
      return;
    }
    if (!telefono.trim()) {
      setErrorMsg('El celular/teléfono es requerido para coordinar tus turnos.');
      return;
    }

    // Complete the onboarding signup
    completeSocioRegistration(nombre, apellido, telefono);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-xs select-none relative" id="socio-onboarding-wrapper">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(163,230,53,0.05),transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(14,165,233,0.05),transparent_50%)] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative z-10 space-y-6 animate-scale-up">
        
        {/* BRAND HEADER */}
        <div className="text-center space-y-2">
          <div className="flex flex-col justify-center items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-lime-300 flex items-center justify-center shadow-sm">
              <Shield className="w-7 h-7 text-zinc-900" />
            </div>
            <div className="text-center">
              <h2 className="font-display text-xl font-extrabold text-zinc-900 tracking-tight">Completa tu Ficha de Socio</h2>
              <p className="text-zinc-400 text-[10px] uppercase font-mono tracking-widest mt-0.5">Último Paso de Registro</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
            Detectamos que es tu primera vez ingresando con esta cuenta. Completa tus datos para que el administrador pueda autorizar tu acceso.
          </p>
        </div>

        {/* REGISTRATION FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* EMAIL (DISABLED) */}
          <div className="space-y-1">
            <label className="font-bold text-[9px] text-zinc-400 uppercase tracking-widest block">Correo Electrónico</label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-medium">
              <span>{pendingRegistrationUser.email}</span>
            </div>
          </div>

          {/* NOMBRE */}
          <div className="space-y-1">
            <label className="font-bold text-[9px] text-zinc-500 uppercase tracking-widest block">Nombre</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingresa tu nombre"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 focus:border-slate-400 outline-none rounded-xl bg-white font-medium text-slate-800 transition-colors"
                required
              />
            </div>
          </div>

          {/* APELLIDO */}
          <div className="space-y-1">
            <label className="font-bold text-[9px] text-zinc-500 uppercase tracking-widest block">Apellido</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ingresa tu apellido"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 focus:border-slate-400 outline-none rounded-xl bg-white font-medium text-slate-800 transition-colors"
                required
              />
            </div>
          </div>

          {/* CELULAR */}
          <div className="space-y-1">
            <label className="font-bold text-[9px] text-zinc-500 uppercase tracking-widest block">Celular / Teléfono</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 11-1234-5678"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 focus:border-slate-400 outline-none rounded-xl bg-white font-medium text-slate-800 transition-colors focus:ring-1 focus:ring-lime-300"
                required
              />
            </div>
          </div>

          {/* ERROR BOX */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl font-semibold text-[10px] text-center">
              {errorMsg}
            </div>
          )}

          {/* ACTIONS */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-lime-300 hover:bg-lime-400 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border-none"
            >
              <Sparkles className="w-4 h-4 text-zinc-900" />
              Completar Registro
            </button>
            <button
              type="button"
              onClick={signOutGoogle}
              className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 border-dashed font-semibold text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cancelar / Usar otra cuenta
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
