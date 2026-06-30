// src/components/SocioPanel/SocioHeader.tsx
import React, { useRef, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { Menu, Sparkles, Home, User, CalendarDays, Receipt, Megaphone, ChevronDown, LogOut, Shield, X, Barcode, Info } from 'lucide-react';

interface SocioHeaderProps {
  activeTabSection: 'HOME' | 'PERFIL' | 'RESERVAS' | 'PAGOS' | 'NOVEDADES';
  setActiveTabSection: (tab: 'HOME' | 'PERFIL' | 'RESERVAS' | 'PAGOS' | 'NOVEDADES') => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  socio: Cliente;
}

export const SocioHeader: React.FC<SocioHeaderProps> = ({
  activeTabSection,
  setActiveTabSection,
  drawerOpen,
  setDrawerOpen,
  isDropdownOpen,
  setIsDropdownOpen,
  socio
}) => {
  const { googleUser, signOutGoogle, setRolActivo, novedades } = useGym();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close dropdown or drawer on outside clicks
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (drawerOpen && drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [drawerOpen, setIsDropdownOpen]);

  return (
    <>
      {/* SaaS WEBAPP TOP NAVIGATION HEADER (Navbar Web) */}
      <header className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex flex-row items-center justify-between gap-4 shadow-sm relative z-30" id="socio-navbar">
        <div className="flex items-center gap-3">
          {/* Menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border-none bg-transparent"
            aria-label="Abrir menú de navegación"
            id="socio-hamburger-menu"
          >
            <Menu className="w-5.5 h-5.5 text-slate-700" />
          </button>

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-slate-800 tracking-wider uppercase">KAHA Portal</h1>
              <span className="text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-mono font-bold px-1.5 py-0.2 rounded-md">PASS ACTIVE</span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono -mt-0.5 uppercase tracking-widest hidden sm:block">Servicio Web de Autogestión</p>
          </div>
        </div>

        {/* DESKTOP INLINE HORIZONTAL WEB NAVBAR */}
        <nav className="hidden lg:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 gap-1">
          <button
            onClick={() => setActiveTabSection('HOME')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none bg-transparent ${
              activeTabSection === 'HOME'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-50/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="web-navbar-home-btn"
          >
            <Home className={`w-4 h-4 transition-colors ${activeTabSection === 'HOME' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Home</span>
          </button>
          <button
            onClick={() => setActiveTabSection('PERFIL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none bg-transparent ${
              activeTabSection === 'PERFIL'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-50/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="web-navbar-perfil-btn"
          >
            <User className={`w-4 h-4 transition-colors ${activeTabSection === 'PERFIL' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Perfil</span>
          </button>
          <button
            onClick={() => setActiveTabSection('RESERVAS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none bg-transparent ${
              activeTabSection === 'RESERVAS'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-50/50'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
            }`}
            id="web-navbar-reservas-btn"
          >
            <CalendarDays className={`w-4 h-4 transition-colors ${activeTabSection === 'RESERVAS' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Reservas y Horarios</span>
          </button>
          <button
            onClick={() => setActiveTabSection('PAGOS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none bg-transparent ${
              activeTabSection === 'PAGOS'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-50/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="web-navbar-pagos-btn"
          >
            <Receipt className={`w-4 h-4 transition-colors ${activeTabSection === 'PAGOS' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Pagos</span>
          </button>
          <button
            onClick={() => setActiveTabSection('NOVEDADES')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border-none bg-transparent relative ${
              activeTabSection === 'NOVEDADES'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-50/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="web-navbar-novedades-btn"
          >
            <Megaphone className={`w-4 h-4 transition-colors ${activeTabSection === 'NOVEDADES' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Cartelera</span>
            {novedades.some(n => n.destacado) && (
              <span className="absolute top-[3px] right-[3px] w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
            )}
          </button>
        </nav>

        {/* PROFILE CHIP & DROPDOWN */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs text-left"
            id="socio-active-user-btn"
          >
            {googleUser?.picture ? (
              <img 
                src={googleUser.picture} 
                alt={socio.nombre} 
                className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0 font-bold font-mono text-[11px]">
                {socio.nombre[0]}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-[11px] font-bold text-slate-800 leading-none tracking-tight">{socio.nombre}</p>
              <p className="text-[9px] text-emerald-600 font-bold font-mono mt-0.5 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.2 h-1.2 bg-emerald-500 rounded-full"></span>
                SOCIO
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isDropdownOpen ? 'transform rotate-180 text-emerald-600' : ''}`} />
          </button>

          {/* DROPDOWN OPTIONS */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3.5 animate-scale-in z-50">
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center border border-emerald-100">
                  {socio.nombre[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-xs truncate">{socio.nombre} {socio.apellido}</p>
                  <p className="text-[9px] font-mono text-slate-500 truncate mt-0.5">{socio.email}</p>
                </div>
              </div>

              <div className="space-y-1 text-[9px] text-slate-700 font-mono leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between">
                  <span>ID:</span>
                  <span className="font-bold text-slate-800">#{socio.id.slice(2, 8).toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estado:</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-1 rounded">Activo</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  signOutGoogle();
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100/50 text-rose-700 hover:text-rose-800 border border-rose-100 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[10px] border-none"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión Google
              </button>
            </div>
          )}
        </div>
      </header>

      {/* DRAWER MENU */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex" id="drawer-slide-wrapper">
          <div 
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setDrawerOpen(false)}
            id="drawer-backdrop"
          />

          <div 
            ref={drawerRef}
            className="relative flex flex-col w-72 max-w-[85vw] h-full bg-white shadow-2xl border-r border-slate-200 p-6 space-y-6 animate-slide-in-left select-none outline-none overflow-y-auto"
            id="drawer-cabinet"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Shield className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">KAHA Menú</h3>
                  <span className="text-[8px] text-slate-400 font-mono uppercase tracking-widest block -mt-0.5">Socio Autogestión</span>
                </div>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
                aria-label="Cerrar menú"
                id="drawer-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-2.5">
              {googleUser?.picture ? (
                <img 
                  src={googleUser.picture} 
                  alt={socio.nombre} 
                  className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-100">
                  {socio.nombre[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-[11.5px] truncate">{socio.nombre} {socio.apellido}</p>
                <p className="text-[9px] font-mono text-slate-500 truncate block mt-0.5">#{socio.id.slice(2, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400 px-3.5 mb-1">Secciones Disponibles</p>
              
              <button
                onClick={() => {
                  setActiveTabSection('HOME');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer border-none bg-transparent ${
                  activeTabSection === 'HOME' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-home"
              >
                <Home className={`w-4 h-4 transition-colors ${activeTabSection === 'HOME' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Home (Membresía)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabSection('PERFIL');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer border-none bg-transparent ${
                  activeTabSection === 'PERFIL' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-perfil"
              >
                <User className={`w-4 h-4 transition-colors ${activeTabSection === 'PERFIL' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Perfil</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabSection('RESERVAS');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer border-none bg-transparent ${
                  activeTabSection === 'RESERVAS' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-reservas"
              >
                <CalendarDays className={`w-4 h-4 transition-colors ${activeTabSection === 'RESERVAS' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Reservas y Horarios</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabSection('PAGOS');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer border-none bg-transparent ${
                  activeTabSection === 'PAGOS' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-pagos"
              >
                <Receipt className={`w-4 h-4 transition-colors ${activeTabSection === 'PAGOS' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Pagos & Recibos</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabSection('NOVEDADES');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer border-none bg-transparent relative ${
                  activeTabSection === 'NOVEDADES' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-novedades"
              >
                <Megaphone className={`w-4 h-4 transition-colors ${activeTabSection === 'NOVEDADES' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Cartelera</span>
                {novedades.some(n => n.destacado) && (
                  <span className="absolute top-[16px] right-[16px] w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                )}
              </button>

              {googleUser?.role !== 'SOCIO' && (
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      setRolActivo('ADMIN');
                    }}
                    className="w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 border border-dashed border-emerald-200 bg-emerald-50/30"
                    id="drawer-link-admin-panel"
                  >
                    <Shield className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span>Volver al Panel General</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <span className="text-[8px] font-mono text-center text-slate-400 block uppercase tracking-widest">KAHA GYM © 2026</span>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  signOutGoogle();
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100/50 text-rose-700 hover:text-rose-800 border border-rose-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-[10.5px] border-none"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión Google
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
