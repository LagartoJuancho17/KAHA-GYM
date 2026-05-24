// src/components/SocioPanel.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGym } from '../GymContext';
import { 
  Trash2, User, Sparkles, AlertTriangle, CreditCard, ExternalLink, 
  ChevronDown, LogOut, QrCode, Barcode, CalendarDays, Award, Phone, 
  Check, Info, Menu, X, Receipt, Home, Shield, Mail, Calendar, MapPin, Plus, RefreshCw, Megaphone
} from 'lucide-react';

// Decoupled weekday calculation to schedule replacement dates
function getNextOccurrenceOfWeekday(dayName: 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES'): string {
  const daysMap = { 'DOMINGO': 0, 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3, 'JUEVES': 4, 'VIERNES': 5, 'SABADO': 6 };
  const targetDay = daysMap[dayName];
  
  const today = new Date();
  const currentDay = today.getDay();
  
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // force next week's occurrence
  }
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysToAdd);
  
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const SocioPanel: React.FC = () => {
  const { 
    clientes, turnos, pagos, selectedSocioId, asignarTurnoVariable, planes, googleUser, signOutGoogle,
    recuperos, agregarRecupero, novedades, setRolActivo, rolActivo
  } = useGym();

  // Navigation tabs: HOME | PERFIL | RESERVAS | PAGOS | NOVEDADES
  const [activeTabSection, setActiveTabSection] = useState<'HOME' | 'PERFIL' | 'RESERVAS' | 'PAGOS' | 'NOVEDADES'>('HOME');
  
  // Mobile/SaaS slide-out sidebar drawer state (Left to Right navigation)
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [activeDayTab, setActiveDayTab] = useState<'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES'>('LUNES');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Simulated editable profile contact info in state for rich user feel
  const [phoneInput, setPhoneInput] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // States for Baja and Alta Ocasional (Inasistencia y Recuperos)
  const [showRecuperoModal, setShowRecuperoModal] = useState(false);
  const [recuperoForm, setRecuperoForm] = useState({
    turno_original_id: '',
    fecha_inasistencia: '',
    turno_recupero_id: '',
    fecha_recupero: ''
  });

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
  }, [drawerOpen]);

  // Find simulated/logged in user
  const socio = useMemo(() => {
    return clientes.find(c => c.id === selectedSocioId && c.activo) || null;
  }, [clientes, selectedSocioId]);

  // Sync phone input state on load
  useEffect(() => {
    if (socio) {
      setPhoneInput(socio.telefono || '');
    }
  }, [socio]);

  // Payments log
  const misPagos = useMemo(() => {
    if (!socio) return [];
    return pagos.filter(p => p.cliente_id === socio.id)
      .sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
  }, [pagos, socio]);

  // Recuperos list
  const misRecuperos = useMemo(() => {
    if (!socio) return [];
    return recuperos.filter(r => r.cliente_id === socio.id);
  }, [recuperos, socio]);

  // Daily slots for current tab
  const turnosDelDia = useMemo(() => {
    return turnos.filter(t => t.dia === activeDayTab);
  }, [turnos, activeDayTab]);

  // Plan matching
  const planSocio = useMemo(() => {
    if (!socio) return null;
    return planes.find(p => p.id === socio.plan_id) || null;
  }, [planes, socio]);

  // Track the reserved slots (both turnos fijos and turno variable)
  const misTurnosReservados = useMemo(() => {
    if (!socio) return [];
    const list: { id: string; dia: string; hora: string; tipo: 'FIJO' | 'VARIABLE' }[] = [];
    
    // 1. Fijos
    if (socio.turnos_fijos && Array.isArray(socio.turnos_fijos)) {
      socio.turnos_fijos.forEach(id => {
        const found = turnos.find(t => t.id === id);
        if (found) {
          list.push({ id: found.id, dia: found.dia, hora: found.hora, tipo: 'FIJO' });
        }
      });
    }

    // 2. Variable
    if (socio.turno_variable) {
      const found = turnos.find(t => t.id === socio.turno_variable);
      if (found) {
        list.push({ id: found.id, dia: found.dia, hora: found.hora, tipo: 'VARIABLE' });
      }
    }

    // Sort order by Day (Lunes to Viernes) and hour
    const diasOrder = { 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3, 'JUEVES': 4, 'VIERNES': 5 };
    list.sort((a, b) => {
      const dayDiff = (diasOrder[a.dia as keyof typeof diasOrder] || 99) - (diasOrder[b.dia as keyof typeof diasOrder] || 99);
      if (dayDiff !== 0) return dayDiff;
      return a.hora.localeCompare(b.hora);
    });

    return list;
  }, [socio, turnos]);

  const handleAsignarVariable = (turnoId: string) => {
    if (!socio) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = asignarTurnoVariable(socio.id, turnoId);
    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(res.message);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleLiberarVariable = () => {
    if (!socio) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = asignarTurnoVariable(socio.id, null);
    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 3500);
    } else {
      setErrorMessage(res.message);
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  const handleRegistrarRecuperoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socio) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!recuperoForm.turno_original_id || !recuperoForm.fecha_inasistencia || !recuperoForm.turno_recupero_id || !recuperoForm.fecha_recupero) {
      setErrorMessage("Por favor completa todos los campos para realizar el cambio ocasional.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const tOrig = turnos.find(t => t.id === recuperoForm.turno_original_id);
    const tRec = turnos.find(t => t.id === recuperoForm.turno_recupero_id);

    if (tOrig?.dia === tRec?.dia) {
      // Small logic sanity check or helper message
    }

    const res = agregarRecupero({
      cliente_id: socio.id,
      cliente_nombre: `${socio.nombre} ${socio.apellido}`,
      turno_original_id: recuperoForm.turno_original_id,
      fecha_inasistencia: recuperoForm.fecha_inasistencia,
      turno_recupero_id: recuperoForm.turno_recupero_id,
      fecha_recupero: recuperoForm.fecha_recupero,
    });

    if (res.success) {
      setSuccessMessage("¡Baja ocasional reportada y Alta ocasional agendada exitosamente!");
      setShowRecuperoModal(false);
      setRecuperoForm({
        turno_original_id: '',
        fecha_inasistencia: '',
        turno_recupero_id: '',
        fecha_recupero: ''
      });
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.message);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  if (!socio) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center max-w-md mx-auto my-12 shadow-md relative" id="socio-panel-no-selected">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.03),transparent_50%)] pointer-events-none"></div>
        <AlertTriangle className="w-14 h-14 text-rose-500 mx-auto mb-5 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Sin sesión activa</h3>
        <p className="text-slate-600 text-xs mt-3 leading-relaxed">
          No se ha detectado una vinculación de socio activa de Google OAuth. Por favor, inicia sesión con un correo válido en el portal o escoge una cuenta simulada en el menú principal.
        </p>
      </div>
    );
  }

  // Support link formulation
  const whatsappUrl = () => {
    const phone = "5491123456789"; 
    const textMessage = `Hola KAHA GYM, soy el socio ${socio.nombre} ${socio.apellido}. Me contacto desde mi portal de cliente para resolver una duda administrativa.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(textMessage)}`;
  };

  const handleSavePhone = () => {
    setIsEditingPhone(false);
    // Locally mutate phone in safety context just for instant UX response
    socio.telefono = phoneInput;
    setSuccessMessage("Información de contacto guardada!");
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  return (
    <div className="space-y-6 select-none font-sans" id="socio-premium-webapp">
      
      {/* SaaS WEBAPP TOP NAVIGATION HEADER (Acts as Navbar Web) */}
      <header className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex flex-row items-center justify-between gap-4 shadow-sm relative z-30" id="socio-navbar">
        <div className="flex items-center gap-3">
          {/* Menu button: Slides Left to Right */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 text-slate-650 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
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
              <h1 className="text-sm font-black text-slate-850 tracking-wider uppercase">KAHA Portal</h1>
              <span className="text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-mono font-bold px-1.5 py-0.2 rounded-md">PASS ACTIVE</span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono -mt-0.5 uppercase tracking-widest hidden sm:block">Servicio Web de Autogestión</p>
          </div>
        </div>
              {/* DESKTOP INLINE HORIZONTAL WEB NAVBAR */}
        <nav className="hidden lg:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 gap-1">
          <button
            onClick={() => setActiveTabSection('HOME')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
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
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
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
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
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
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
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
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer relative ${
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
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
            }}
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
            <ChevronDown className={`w-3.5 h-3.5 text-slate-550 transition-transform ${isDropdownOpen ? 'transform rotate-180 text-emerald-600' : ''}`} />
          </button>

          {/* QUICK PRESTIGE CONFIG DIALOG */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3.5 animate-fade-in z-50">
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center border border-emerald-100">
                  {socio.nombre[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-xs truncate">{socio.nombre} {socio.apellido}</p>
                  <p className="text-[9px] font-mono text-slate-500 truncate mt-0.5">{socio.email}</p>
                </div>
              </div>

              <div className="space-y-1 text-[9px] text-slate-600 font-mono leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                <div className="flex items-center justify-between">
                  <span>ID:</span>
                  <span className="font-bold text-slate-800">#{socio.id.slice(2, 8).toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Estado:</span>
                  <span className="font-bold text-emerald-650 bg-emerald-50 px-1 rounded">Activo</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  signOutGoogle();
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100/50 text-rose-700 hover:text-rose-800 border border-rose-100 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[10px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión Google
              </button>
            </div>
          )}
        </div>
      </header>

      {/* LEFT-TO-RIGHT SLIDING MENU DRAWER (El menu hamburguesa de izquierda a derecha de apertura) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex" id="drawer-slide-wrapper">
          {/* Backdrop Blur overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setDrawerOpen(false)}
            id="drawer-backdrop"
          />

          {/* Drawer content (slides in from left to right) */}
          <div 
            ref={drawerRef}
            className="relative flex flex-col w-72 max-w-[85vw] h-full bg-white shadow-2xl border-r border-slate-200 p-6 space-y-6 animate-slide-in-left select-none outline-none overflow-y-auto"
            id="drawer-cabinet"
          >
            {/* Header Block inside Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Shield className="w-4.5 h-4.5 text-emerald-650" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">KAHA Menú</h3>
                  <span className="text-[8px] text-slate-400 font-mono uppercase tracking-widest block -mt-0.5">Socio Autogestión</span>
                </div>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Cerrar menú"
                id="drawer-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile badge in drawer */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 flex items-center gap-2.5">
              {googleUser?.picture ? (
                <img 
                  src={googleUser.picture} 
                  alt={socio.nombre} 
                  className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-650 flex items-center justify-center font-bold text-xs border border-emerald-100">
                  {socio.nombre[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-[11.5px] truncate">{socio.nombre} {socio.apellido}</p>
                <p className="text-[9px] font-mono text-slate-500 truncate block mt-0.5">#{socio.id.slice(2,8).toUpperCase()}</p>
              </div>
            </div>

            {/* SECTION NAV MENU LINKS */}
            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400 px-3.5 mb-1">Secciones Disponibles</p>
              
              <button
                onClick={() => {
                  setActiveTabSection('HOME');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${
                  activeTabSection === 'HOME' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-home"
              >
                <Home className={`w-4 h-4 transition-colors ${activeTabSection === 'HOME' ? 'text-emerald-600' : 'text-slate-500 group-hover:text-emerald-650'}`} />
                <span>Home (Membresía)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabSection('PERFIL');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${
                  activeTabSection === 'PERFIL' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-perfil"
              >
                <User className={`w-4 h-4 transition-colors ${activeTabSection === 'PERFIL' ? 'text-emerald-600' : 'text-slate-500 group-hover:text-emerald-650'}`} />
                <span>Perfil</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabSection('RESERVAS');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${
                  activeTabSection === 'RESERVAS' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-reservas"
              >
                <CalendarDays className={`w-4 h-4 transition-colors ${activeTabSection === 'RESERVAS' ? 'text-emerald-600' : 'text-slate-500 group-hover:text-emerald-650'}`} />
                <span>Reservas y Horarios</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabSection('PAGOS');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${
                  activeTabSection === 'PAGOS' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-pagos"
              >
                <Receipt className={`w-4 h-4 transition-colors ${activeTabSection === 'PAGOS' ? 'text-emerald-600' : 'text-slate-500 group-hover:text-emerald-650'}`} />
                <span>Pagos & Recibos</span>
              </button>

              <button
                onClick={() => {
                  setActiveTabSection('NOVEDADES');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer relative ${
                  activeTabSection === 'NOVEDADES' 
                    ? 'bg-emerald-50/80 text-emerald-700 border-l-4 border-emerald-600 pl-3 shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="drawer-link-novedades"
              >
                <Megaphone className={`w-4 h-4 transition-colors ${activeTabSection === 'NOVEDADES' ? 'text-emerald-600' : 'text-slate-500 group-hover:text-emerald-650'}`} />
                <span>Novedades y Comunicados</span>
                {novedades.some(n => n.destacado) && (
                  <span className="absolute top-[16px] right-[16px] w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                )}
              </button>

              {/* BACK TO GENERAL PANEL OPTION (Only for users not fully restricted to SOCIO) */}
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

            {/* Footer Sign Out Button in Drawer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <span className="text-[8px] font-mono text-center text-slate-400 block uppercase tracking-widest">KAHA GYM © 2026</span>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  signOutGoogle();
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100/50 text-rose-700 hover:text-rose-850 border border-rose-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-[10.5px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión Google
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERROR & SUCCESS STATUS BANNER */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-205 text-emerald-800 p-4 rounded-2xl font-semibold flex items-center gap-2.5 animate-flash-success shadow-xs">
          <Check className="w-5 h-5 text-emerald-600 shrink-0 bg-emerald-100 p-1 rounded-full border border-emerald-200" />
          <span className="text-[11.5px] font-sans leading-none">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-205 text-rose-800 p-4 rounded-2xl font-semibold flex items-center gap-2.5 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 bg-rose-100 p-1 rounded-full border border-rose-200" />
          <span className="text-[11.5px] font-sans leading-none">{errorMessage}</span>
        </div>
      )}

      {/* RENDER DYNAMIC SECTION BASED ON ACTIVE SELECTION */}
      
      {/* 1. SECCION: HOME */}
      {activeTabSection === 'HOME' && (
        <div className="space-y-6 animate-fade-in" id="socio-section-home">
          
          {/* Welcome Premium Header banner */}
          <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-3xl p-6.5 relative overflow-hidden shadow-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none"></div>
            <div className="relative z-10 space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[8px] uppercase tracking-wider font-extrabold">
                <Award className="w-3 h-3 text-emerald-400" />
                Ingreso Verificado
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase col-span-2">
                ¡Hola de nuevo, {socio.nombre}!
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed font-medium">
                Bienvenido al portal inteligente KAHA GYM. Desde aquí puedes descargar tu pase digital con código de barras QR, consultar turnos variables vacantes y visualizar tu abono vigente.
              </p>
            </div>
            {/* Background geometric decorative label */}
            <span className="absolute bottom-1 right-4 text-white/[0.04] font-black text-6xl select-none font-sans uppercase tracking-tight hidden sm:block">KAHA</span>
          </div>

          {/* SECCIÓN PRESTIGIO: CARTELERA DE NOVEDADES EN HOME */}
          {novedades.length > 0 && (
            <div className="bg-gradient-to-tr from-amber-500/5 to-emerald-50/30 rounded-3xl border border-emerald-150 p-5 space-y-4 shadow-xs" id="home-novedades-preview">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-emerald-700 animate-bounce shrink-0" />
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">CARTELERA DE NOVEDADES</h3>
                    <p className="text-[10px] text-slate-450 font-sans">Anuncios oficiales del gimnasio para alumnos</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTabSection('NOVEDADES')}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-150 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-all cursor-pointer"
                >
                  Ver Cartelera Completa
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {novedades.slice(0, 2).map((nov) => {
                  return (
                    <div 
                      key={nov.id} 
                      onClick={() => setActiveTabSection('NOVEDADES')}
                      className={`bg-white rounded-2xl border p-4 flex flex-col justify-between gap-3 text-xs shadow-xs transition-transform hover:scale-101 cursor-pointer relative overflow-hidden ${
                        nov.destacado ? 'border-amber-300 ring-2 ring-amber-500/5' : 'border-slate-205'
                      }`}
                    >
                      {nov.destacado && (
                        <span className="absolute top-0 right-0 bg-amber-500 text-white px-2 py-0.5 rounded-bl-lg text-[8px] font-black uppercase tracking-wider font-mono">
                          IMPORTANTE
                        </span>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded border uppercase font-bold text-slate-600">
                            {nov.categoria}
                          </span>
                          <span>{nov.fecha}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 leading-tight pr-14 text-[12px]">{nov.titulo}</h4>
                        <p className="text-slate-500 text-[11px] line-clamp-2 mt-1">{nov.contenido}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MIS DÍAS RESERVADOS DE ENTRENAMIENTO (USER REQUEST) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4" id="socio-active-reservations-dashboard">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-805 tracking-tight flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>MIS DÍAS RESERVADOS DE ENTRENAMIENTO</span>
                </h3>
                <p className="text-slate-550 text-[11px] font-medium leading-relaxed mt-0.5">
                  Estos son los días y horarios que tenés reservados de forma fija o variable para esta semana.
                </p>
              </div>
              <button 
                onClick={() => setActiveTabSection('RESERVAS')}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-850 transition-colors cursor-pointer flex items-center gap-1 shrink-0 self-start sm:self-auto"
                id="home-go-to-reservations-shortcut"
              >
                <span>Administrar mis reservas</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {misTurnosReservados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <CalendarDays className="w-10 h-10 text-slate-300 mb-2.5 animate-pulse" />
                <p className="font-bold text-xs text-slate-705">No tenés días reservados esta semana</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-sm leading-relaxed">
                  Para poder asistir a entrenar, recordá reservar un turno variable o solicitar un turno fijo.
                </p>
                <button
                  onClick={() => setActiveTabSection('RESERVAS')}
                  className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Ver turnos disponibles
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {misTurnosReservados.map(r => (
                  <div 
                    key={r.id} 
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] shadow-2xs ${
                      r.tipo === 'FIJO' 
                        ? 'bg-sky-50/40 border-sky-200' 
                        : 'bg-emerald-50/40 border-emerald-205'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        r.tipo === 'FIJO' 
                          ? 'bg-sky-100 text-sky-700 border-sky-150' 
                          : 'bg-emerald-100 text-emerald-700 border-emerald-150'
                      }`}>
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-mono text-[10px] font-extrabold text-slate-450 uppercase tracking-wide leading-none">
                          {r.dia === 'MIERCOLES' ? 'MIÉRCOLES' : r.dia}
                        </p>
                        <p className="text-sm font-black text-slate-800 leading-none mt-1.5">{r.hora} hs</p>
                      </div>
                    </div>

                    <span className={`text-[8px] font-bold tracking-wider px-2 py-0.5 rounded font-mono border ${
                      r.tipo === 'FIJO' 
                        ? 'bg-sky-50 text-sky-850 border-sky-200' 
                        : 'bg-emerald-50 text-emerald-805 border-emerald-200'
                    }`}>
                      {r.tipo === 'FIJO' ? 'FIJO SEMANAL' : 'TURNO VARIABLE'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BENTO GRID DE INFORMACIÓN DE PERFIL */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="socio-bento-dashboard">
            
            {/* CARD A: TARJETA DIGITAL DE MIEMBRO (Light Minimalist Visa design) */}
            <div className="bg-gradient-to-tr from-slate-50 via-white to-emerald-50/20 border border-slate-205 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px] shadow-sm transition-all hover:border-emerald-400 group" id="socio-card-member">
              {/* Glowing element */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-emerald-500 to-sky-400 rounded-full blur-2xl opacity-10 group-hover:opacity-15 transition-opacity -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200/50 text-emerald-700 font-mono text-[8px] uppercase tracking-wider font-extrabold">
                    <Award className="w-3 h-3" />
                    Membresía KAHA
                  </div>
                  <h2 className="text-sm font-black text-slate-800 mt-2 tracking-tight">CREDENTIAL PASS</h2>
                </div>
                <div className="text-slate-400 group-hover:text-emerald-650 transition-colors">
                  <QrCode className="w-7 h-7" />
                </div>
              </div>

              <div className="py-2">
                <p className="text-[9px] text-slate-400 font-mono select-all tracking-wider">MEMBER NO: {socio.id.toUpperCase()}</p>
                <p className="text-lg font-black text-slate-850 tracking-wider uppercase mt-0.5">{socio.nombre} {socio.apellido}</p>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${socio.estado === 'ACTIVO' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                    {socio.estado === 'ACTIVO' ? 'ACTIVO / ACCESO HABILITADO' : 'SUSPENDIDO'}
                  </span>
                </div>
                
                {/* Vector simulated barcode */}
                <div className="opacity-60 group-hover:opacity-90 transition-opacity flex items-center shrink-0">
                  <Barcode className="w-14 h-6 text-slate-500" />
                </div>
              </div>
            </div>

            {/* CARD B: PLAN CONTRATADO & ARCELES */}
            <div className="bg-white border border-slate-205 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px] shadow-sm hover:border-slate-300 transition-all" id="socio-card-plan">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-sky-700 bg-sky-50 border border-sky-105 px-2.5 py-0.5 rounded-full tracking-wider uppercase font-bold">
                    Plan Vigente
                  </span>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight mt-2.5">
                    {planSocio ? planSocio.nombre : 'Abono Individual'}
                  </h3>
                  <p className="text-slate-550 text-xs mt-1.5 leading-relaxed font-semibold">
                    {planSocio ? `Gimnasio completo con acceso a ${planSocio.dias_por_semana} clases semanales.` : 'Sin especificación de plan contratado.'}
                  </p>
                  {planSocio && (
                    <p className="font-mono text-emerald-700 font-extrabold text-[15px] mt-2.5">
                      ${planSocio.precio.toLocaleString('es-AR')} ARS <span className="text-[10px] text-slate-400 font-normal">/mes</span>
                    </p>
                  )}
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-sky-600">
                  <CreditCard className="w-4.5 h-4.5" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <p className="text-slate-400 text-[10px] tracking-wider uppercase font-mono">Estado de Cuenta</p>
                  <p className={`font-bold mt-0.5 ${socio.estado === 'ACTIVO' ? 'text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px] uppercase font-mono inline-block' : 'text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[10px] uppercase font-mono text-center inline-block'}`}>
                    {socio.estado === 'ACTIVO' ? '✓ Al día' : `⚠ Pendiente: $${socio.deuda_acumulada.toLocaleString('es-AR')}`}
                  </p>
                </div>
                
                <div className="text-right">
                  <span className="text-slate-400 text-[9px] block uppercase font-mono">Último Mes</span>
                  <span className="font-mono text-slate-700 text-[11px] font-bold">
                    {socio.ultimo_mes_pagado ? `${socio.ultimo_mes_pagado.split('-')[1]}/ ${socio.ultimo_mes_pagado.split('-')[0]}` : 'Sin datos'}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD C: RÉGIMEN DE CRÉDITO DE TURNOS */}
            <div className="bg-white border border-slate-205 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px] shadow-sm hover:border-slate-300 transition-all" id="socio-card-credits">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-violet-700 bg-violet-50 border border-violet-105 px-2.5 py-0.5 rounded-full tracking-wider uppercase font-bold">
                    Balance de Reservas
                  </span>
                  <h3 className="text-base font-black text-slate-800 tracking-tight mt-2.5">CRÉDITOS DE TURNOS</h3>
                  <p className="text-slate-500 text-xs mt-1 leading-normal">
                    Disponibilidad calculada de acuerdo a las políticas de reserva del centro KAHA GYM.
                  </p>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-violet-500">
                  <CalendarDays className="w-4.5 h-4.5 text-violet-600" />
                </div>
              </div>

              <div className="space-y-2.5 pb-0.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-600">
                    <span>1. Turnos Fijos Asignados:</span>
                    <span className="font-bold text-slate-800">{socio.turnos_fijos.length} / 2</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="bg-sky-500 h-full rounded-full transition-all" 
                      style={{ width: `${Math.min((socio.turnos_fijos.length / 2) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-600">
                    <span>2. Turno Variable Reservable:</span>
                    <span className="font-bold text-slate-800">{socio.turno_variable ? '1 / 1' : '0 / 1'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="bg-violet-500 h-full rounded-full transition-all" 
                      style={{ width: `${socio.turno_variable ? 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* DYNAMIC WHATSAPP BOX */}
          <section className="bg-white border border-slate-200 rounded-3xl p-6.5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6" id="socio-whatsapp-support">
            <div className="flex-1 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-150 text-emerald-700 font-mono text-[8px] uppercase tracking-wider">
                <Phone className="w-3 h-3 text-emerald-500" />
                Soporte KAHA GYM
              </div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">¿Deseas cambiar un turno fijo asignado?</h3>
              <p className="text-slate-550 text-xs leading-relaxed max-w-2xl font-medium">
                Los turnos fijos semanales son permanentes y deben ser aprobados o modificados por un Operador / Profesor. Puedes iniciar un chat directo de WhatsApp con nuestro equipo administrativo haciendo click a la derecha.
              </p>
            </div>

            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs animate-pulse hover:animate-none"
            >
              <span>Conversar por WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>
        </div>
      )}

      {/* 2. SECCION: PERFIL */}
      {activeTabSection === 'PERFIL' && (
        <div className="space-y-6 animate-fade-in" id="socio-section-perfil">
          {/* Cover Header and Profile Card card */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {/* cover image background banner */}
            <div className="h-32 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.2),transparent_50%)]"></div>
              <div className="absolute bottom-3 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-mono text-[9px] uppercase tracking-wider font-extrabold shadow-sm">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span>Portal Autenticado</span>
              </div>
            </div>

            {/* Profile info offset block */}
            <div className="px-6 lg:px-8 pb-8 pt-0 relative" id="socio-profile-offset-header">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-10 relative z-10 border-b border-slate-100 pb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4.5">
                  {googleUser?.picture ? (
                    <img 
                      src={googleUser.picture} 
                      alt={socio.nombre} 
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md border-4 border-white shrink-0">
                      {socio.nombre[0]}
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-slate-850 tracking-tight uppercase">
                        {socio.nombre} {socio.apellido}
                      </h2>
                      <span className="text-[9px] bg-emerald-50 border border-emerald-150 text-emerald-700 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                        Socio Activo
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{socio.email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 self-start sm:self-auto sm:text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-mono tracking-widest font-extrabold block">Vía de Acceso</span>
                  <div className="text-emerald-750 bg-emerald-50/75 border border-emerald-100 px-3 py-1.5 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 shadow-3xs">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Google OAuth 2.0 Direct</span>
                  </div>
                </div>
              </div>

              {/* Grid block */}
              <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left column - Editable details */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-3">Detalles de Contacto</h3>
                    
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider block">Número de Teléfono Móvil</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 select-none">AR</span>
                            <input 
                              type="text" 
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value)}
                              disabled={!isEditingPhone}
                              placeholder="Ej: +54 9 11 1234-5678"
                              className={`w-full text-xs pl-10 pr-3.5 py-3 rounded-xl outline-hidden font-mono transition-all ${
                                isEditingPhone 
                                  ? 'bg-white border border-emerald-400 text-slate-800 shadow-inner' 
                                  : 'bg-slate-100/85 border border-slate-200 text-slate-500 cursor-not-allowed'
                              }`}
                            />
                          </div>
                          {isEditingPhone ? (
                            <button
                              onClick={handleSavePhone}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4.5 py-3 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                            >
                              <Check className="w-4 h-4" />
                              Guardar
                            </button>
                          ) : (
                            <button
                              onClick={() => setIsEditingPhone(true)}
                              className="bg-emerald-550 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 font-bold px-4.5 py-3 rounded-xl text-xs transition-colors cursor-pointer shrink-0"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-450 italic leading-snug">
                          Indispensable para el envío automático de confirmaciones y alertas de disponibilidad por WhatsApp.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-3">Sede Registrada</h3>
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-4">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-emerald-600 shrink-0">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-850">KAHA Gimnasio - Sede Principal</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Av. Cabildo 1420, Belgrano, Ciudad Autónoma de Buenos Aires, Argentina.
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1 font-mono">
                          Horarios: Lunes a Viernes 07:00 hs - 22:00 hs
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column - Plan status conditions */}
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-3">Condiciones de Membresía</h3>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                      <div className="p-5 space-y-3.5">
                        <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-150">
                          <span className="text-slate-500 font-semibold">Estado de Cuenta:</span>
                          <span className="font-mono font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded text-[10px]">
                            ACTIVO / AL DÍA
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-150">
                          <span className="text-slate-500 font-semibold">Plan Asignado:</span>
                          <span className="font-bold text-slate-800 text-[11px]">
                            {planSocio ? planSocio.nombre : 'Plan KAHA Semanal'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-150">
                          <span className="text-slate-500 font-semibold">Valor del Plan:</span>
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            {planSocio ? `$${planSocio.precio.toLocaleString('es-AR')} ARS` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-150">
                          <span className="text-slate-500 font-semibold">Deuda Acumulada:</span>
                          <span className="font-bold text-slate-800 font-mono text-[11px]">
                            ${socio.deuda_acumulada.toLocaleString('es-AR')} ARS
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-150">
                          <span className="text-slate-500 font-semibold">ID Unico Cuenta:</span>
                          <span className="font-mono text-slate-550 text-[10px] select-all tracking-tight bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate">
                            {socio.id}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold">Último Mes Pago:</span>
                          <span className="font-bold text-slate-700 font-mono text-[11px]">
                            {socio.ultimo_mes_pagado ? `${socio.ultimo_mes_pagado.split('-')[1]} / ${socio.ultimo_mes_pagado.split('-')[0]}` : 'Sin abonos'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-emerald-50/40 p-4 border-t border-slate-200">
                        <p className="text-[10px] text-emerald-850 leading-relaxed font-semibold flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 text-emerald-650 shrink-0 mt-0.5 animate-pulse" />
                          <span>
                            Para solicitar cambios permanentes en el tipo de tu membresía o cancelaciones, por favor contactate con administración vía WhatsApp.
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECCION: RESERVAS Y HORARIOS */}
      {activeTabSection === 'RESERVAS' && (
        <section className="bg-white border border-slate-205 rounded-3xl p-6.5 lg:p-8 shadow-sm relative animate-fade-in" id="socio-agenda-block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_90%,rgba(16,185,129,0.01),transparent_40%)] pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2 tracking-tight">
                <CalendarDays className="w-5.5 h-5.5 text-emerald-650" />
                INSCRIPCIONES Y HORARIOS DISPONIBLES
              </h2>
              <p className="text-slate-500 text-xs font-sans mt-1 col-span-2">
                Consulta los cupos libres en vivo del gimnasio para reservar tu cupo variable de inmediato.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 text-[10px] text-slate-450 font-mono">
              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="w-2.5 h-2.5 bg-sky-200 border border-sky-450 rounded-full inline-block"></span> 
                <span className="text-slate-600 font-semibold">Tus Fijos Semanales</span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="w-2.5 h-2.5 bg-violet-200 border border-violet-400 rounded-full inline-block"></span> 
                <span className="text-slate-600 font-semibold">Tu Reserva Variable</span>
              </span>
            </div>
          </div>

          {/* SECCIÓN DE GESTIÓN DE RECUPEROS (BAJAS Y ALTAS OCASIONALES) */}
          <div className="mb-8 p-5 rounded-2xl border border-emerald-150 bg-gradient-to-tr from-slate-50 to-emerald-50/20 shadow-xs relative overflow-hidden" id="socio-recuperos-dashboard">
            <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500"></div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-emerald-650 animate-spin-slow" />
                  MIS CAMBIOS OCASIONALES (BAJAS Y ALTAS)
                </h3>
                <p className="text-slate-500 text-[11px] font-sans mt-1">
                  ¿No puedes asistir a un turno fijo semanal? Notifica tu falta (baja ocasional) y reserva una clase de reemplazo (alta ocasional).
                </p>
              </div>
              
              <button
                onClick={() => {
                  setRecuperoForm({
                    turno_original_id: socio.turnos_fijos[0] || '',
                    fecha_inasistencia: socio.turnos_fijos[0] ? getNextOccurrenceOfWeekday(turnos.find(t => t.id === socio.turnos_fijos[0])?.dia || 'LUNES') : '',
                    turno_recupero_id: '',
                    fecha_recupero: ''
                  });
                  setShowRecuperoModal(true);
                }}
                disabled={socio.turnos_fijos.length === 0}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  socio.turnos_fijos.length === 0
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-650 hover:scale-101'
                }`}
              >
                <Plus className="w-4 h-4" />
                Nueva Baja y Alta Ocasional
              </button>
            </div>

            {misRecuperos.length === 0 ? (
              <div className="text-center py-6 bg-white/60 border border-dashed border-slate-200 rounded-xl">
                <p className="text-slate-400 italic text-[11px] font-sans">No tienes ninguna baja y alta ocasional reportada todavía.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {misRecuperos.map(rec => {
                  const origTurno = turnos.find(t => t.id === rec.turno_original_id);
                  const newTurno = turnos.find(t => t.id === rec.turno_recupero_id);
                  
                  return (
                    <div key={rec.id} className="bg-white border border-slate-250 rounded-xl p-3.5 flex flex-col justify-between gap-3 text-xs shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[8px] bg-emerald-50 border border-emerald-150 text-emerald-755 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                          CAMBIO OCASIONAL: {rec.estado}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">#{rec.id.split('-')[1]?.slice(-4)}</span>
                      </div>

                      <div className="space-y-1.5 border-l-2 border-slate-200 pl-2.5 font-sans">
                        <div className="text-slate-600 flex items-center gap-1 text-[11px]">
                          <span className="font-semibold text-rose-550 shrink-0">Baja Ocasional:</span>
                          <span className="font-medium text-slate-800">{origTurno ? `${origTurno.dia} ${origTurno.hora}hs` : rec.turno_original_id}</span>
                          <span className="text-slate-400 font-mono text-[9px]">({rec.fecha_inasistencia})</span>
                        </div>
                        <div className="text-slate-600 flex items-center gap-1 text-[11px]">
                          <span className="font-semibold text-emerald-600 shrink-0">Alta Ocasional:</span>
                          <span className="font-medium text-slate-800">{newTurno ? `${newTurno.dia} ${newTurno.hora}hs` : rec.turno_recupero_id}</span>
                          <span className="text-slate-400 font-mono text-[9px]">({rec.fecha_recupero})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DIAS CALENDARIO SELECTOR TAB BAR */}
          <div className="grid grid-cols-5 bg-slate-100 p-1.5 rounded-2xl border border-slate-205 gap-1 lg:max-w-xl mx-auto mb-8" id="socio-agenda-tabs">
            {(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const).map(dia => {
              const isActive = activeDayTab === dia;
              return (
                <button
                  key={dia}
                  onClick={() => setActiveDayTab(dia)}
                  className={`py-3.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer select-none border ${
                    isActive 
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white border-transparent font-black scale-102 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 bg-transparent border-transparent hover:bg-white/50'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-mono uppercase text-[9px] tracking-wide">
                      {dia === 'MIERCOLES' ? 'MIÉ' : dia.slice(0, 3)}
                    </span>
                    <span className={`text-[7px] hidden md:inline tracking-wider mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>DIA</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* CONTENEDOR DE SLOTS HOY / GRID */}
          <div className="space-y-3.5" id="socio-agenda-slots">
            {turnosDelDia.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-slate-150 rounded-2xl">
                <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500 italic text-xs font-medium">No hay horarios o turnos configurados para el día {activeDayTab}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {turnosDelDia.map(turno => {
                  const fijosCount = turno.asignados_ids.length;
                  const variablesCount = clientes.filter(c => c.activo && c.turno_variable === turno.id).length;
                  const totalOccupied = fijosCount + variablesCount;
                  
                  const holdsMyFijo = socio.turnos_fijos.includes(turno.id);
                  const holdsMyVariable = socio.turno_variable === turno.id;
                  const isFull = totalOccupied >= turno.cupo_maximo;

                  return (
                    <div 
                      key={turno.id}
                      className={`
                        p-4.5 rounded-2xl border transition-all flex flex-col justify-between gap-4 select-none
                        ${holdsMyFijo 
                          ? 'bg-sky-50/40 border-sky-305 shadow-inner' 
                          : holdsMyVariable 
                            ? 'bg-emerald-50/50 border-emerald-305 shadow-inner' 
                            : 'bg-slate-50/30 border-slate-205 hover:border-slate-300'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${
                            holdsMyFijo 
                              ? 'bg-sky-100 text-sky-700 border-sky-200' 
                              : holdsMyVariable 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                : 'bg-white text-slate-500 border-slate-200'
                          }`}>
                            <Calendar className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-800 tracking-tight">{turno.hora} hs</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                isFull ? 'bg-red-50 text-red-700 border border-red-150' : 'bg-white text-slate-600 border border-slate-200'
                              }`}>
                                Cupos: {totalOccupied} / {turno.cupo_maximo}
                              </span>
                              <span className="text-[9px] text-slate-450 font-mono">
                                ({fijosCount} Fijos • {variablesCount} Variables)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* BADGE DE ESTADO SELECCIÓN */}
                        {holdsMyFijo && (
                          <span className="text-[8px] bg-sky-100 text-sky-700 border border-sky-200 font-bold px-2 py-0.5 rounded-md uppercase tracking-widest font-mono">
                            TU FIJO (SEMANAL)
                          </span>
                        )}
                        {holdsMyVariable && (
                          <span className="text-[8px] bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-md uppercase tracking-widest font-mono animate-pulse">
                            RESERVA VARIABLE
                          </span>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                        <div>
                          {/* Micro Progress Bar */}
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-emerald-600'}`}
                              style={{ width: `${Math.min((totalOccupied / turno.cupo_maximo) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          {holdsMyFijo && (
                            <button
                              onClick={() => {
                                setRecuperoForm({
                                  turno_original_id: turno.id,
                                  fecha_inasistencia: getNextOccurrenceOfWeekday(turno.dia),
                                  turno_recupero_id: '',
                                  fecha_recupero: ''
                                });
                                setShowRecuperoModal(true);
                              }}
                              className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-150 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 font-sans"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-sky-550" />
                              Baja Ocasional / Recuperar
                            </button>
                          )}

                          {holdsMyVariable && (
                            <button
                              onClick={() => handleLiberarVariable()}
                              className="bg-rose-50 hover:bg-rose-105 text-rose-700 border border-rose-150 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 font-mono"
                            >
                              <Trash2 className="w-3 h-3" />
                              Liberar Reserva
                            </button>
                          )}

                          {!holdsMyFijo && !holdsMyVariable && (
                            <button
                              onClick={() => handleAsignarVariable(turno.id)}
                              disabled={isFull}
                              className={`
                                px-4  py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer font-sans
                                ${isFull 
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-650 text-white shadow-xs'
                                }
                              `}
                            >
                              {isFull ? 'SIN CUPOS' : 'RESERVAR VARIABLE'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. SECCION: PAGOS */}
      {activeTabSection === 'PAGOS' && (
        <section className="bg-white border border-slate-205 rounded-3xl p-6.5 lg:p-8 shadow-sm space-y-6 animate-fade-in" id="socio-ledger-payments">
          <div>
            <h3 className="text-sm font-black text-slate-805 uppercase tracking-wider font-mono flex items-center gap-2 mb-4 pb-3 border-b border-slate-150">
              <CreditCard className="w-4.5 h-4.5 text-emerald-600" />
              HISTORIAL DE TRANSACCIONES PROCESADAS
            </h3>

            {misPagos.length === 0 ? (
              <div className="text-center py-12 text-slate-405 text-xs italic font-semibold">
                No tienes abonos procesados cargados en tu cartera histórica.
              </div>
            ) : (
              <div className="space-y-2.5">
                {misPagos.map(p => (
                  <div key={p.id} className="bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-850 text-xs">Arancel correspondiente: {p.mes_correspondiente}</span>
                        <span className="text-[8.5px] bg-emerald-100 text-emerald-800 border border-emerald-150 px-1.5 py-0.2 rounded font-mono font-bold tracking-wider">PAGO SEGURO</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono tracking-tight text-emerald-600/80">
                        HASH: {p.hash_transaccion}
                      </p>
                      <p className="text-[9px] text-emerald-805">
                        Procesado el {new Date(p.fecha_pago).toLocaleDateString('es-AR')} a las {new Date(p.fecha_pago).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-mono font-bold text-slate-800 text-sm sm:text-base">${p.monto.toLocaleString('es-AR')}</p>
                      <span className="text-[8px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider inline-block mt-1 border border-emerald-110 font-mono">
                        {p.medio_pago}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. SECCION: NOVEDADES (Tablón de Alumnos) */}
      {activeTabSection === 'NOVEDADES' && (
        <section className="bg-white border border-slate-205 rounded-3xl p-6.5 lg:p-8 shadow-sm space-y-6 animate-fade-in" id="socio-novedades-cartelera">
          <div>
            <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider font-mono flex items-center gap-2 mb-2 pb-3 border-b border-slate-150">
              <Megaphone className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
              CARTELERA OFICIAL DE SOCIOS Y CIRCULARES
            </h3>
            <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
              Mantente informado con las novedades vigentes, reajustes de tarifas, avisos de mantenimiento y anuncios excepcionales publicados por el equipo administrativo.
            </p>
          </div>

          {/* Listado de Novedades del Portal */}
          {novedades.length === 0 ? (
            <div className="text-center py-12 text-slate-405 text-xs italic">
              No hay publicaciones ni comunicados activos en la cartelera por el momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {novedades.map((nov) => {
                const isArancel = nov.categoria === 'ARANCELES';
                const isTurno = nov.categoria === 'TURNOS';
                const isEvento = nov.categoria === 'EVENTOS';

                let bgBadge = 'bg-sky-50 text-sky-800 border-sky-150';
                let dotColor = 'bg-sky-500';
                let labelTxt = 'Información General';

                if (isArancel) {
                  bgBadge = 'bg-emerald-50 text-emerald-800 border-emerald-150';
                  dotColor = 'bg-emerald-500';
                  labelTxt = 'Aranceles y Pagos';
                } else if (isTurno) {
                  bgBadge = 'bg-teal-50 text-teal-800 border-teal-150';
                  dotColor = 'bg-teal-500';
                  labelTxt = 'Horarios y Turnos';
                } else if (isEvento) {
                  bgBadge = 'bg-amber-50 text-amber-800 border-amber-150';
                  dotColor = 'bg-amber-500';
                  labelTxt = 'Talleres y Eventos';
                }

                return (
                  <div 
                    key={nov.id}
                    className={`bg-white rounded-2xl border p-5 flex flex-col justify-between gap-4 relative overflow-hidden shadow-xs transition-shadow hover:shadow-sm ${
                      nov.destacado ? 'border-amber-250 ring-2 ring-amber-500/5 bg-gradient-to-tr from-white to-amber-500/[0.01]' : 'border-slate-205'
                    }`}
                  >
                    {nov.destacado && (
                      <span className="absolute top-0 right-0 bg-amber-500 text-white px-2.5 py-0.5 rounded-bl-xl text-[8px] font-black uppercase tracking-widest font-mono flex items-center gap-1">
                        <Award className="w-3 h-3 text-white" />
                        DESTACADO
                      </span>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 border rounded-md text-[8.5px] font-black uppercase tracking-wider font-mono ${bgBadge}`}>
                          {labelTxt}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{nov.fecha}</span>
                      </div>

                      <h4 className="font-bold text-slate-900 leading-snug tracking-tight text-sm md:text-base font-sans mt-1">
                        {nov.titulo}
                      </h4>

                      <p className="text-slate-650 text-xs font-sans whitespace-pre-line leading-relaxed">
                        {nov.contenido}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-1 text-[9.5px] text-slate-400 font-sans mt-auto">
                      <User className="w-3.5 h-3.5" />
                      <span>Publicado por la administración</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* RECUPERO / BAJA Y ALTA OCASIONAL MODAL COMPONENT */}
      {showRecuperoModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl border border-slate-205 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                  <RefreshCw className="w-4 h-4 text-emerald-650" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-805 tracking-tight uppercase">Baja y Alta Ocasional</h3>
                  <p className="text-[10px] text-slate-500 font-sans">Reportar inasistencia y agendar reemplazo</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecuperoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegistrarRecuperoSubmit} className="space-y-4 text-xs font-sans">
              
              {/* ORIGEN: BAJA OCASIONAL */}
              <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
                <span className="block text-[9px] font-bold text-slate-500 uppercase font-mono tracking-wider">1. BAJA OCASIONAL (Clase a Faltar)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Turno Fijo Semanal</label>
                    <select
                      value={recuperoForm.turno_original_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchedTurno = turnos.find(t => t.id === val);
                        const calculatedDate = matchedTurno ? getNextOccurrenceOfWeekday(matchedTurno.dia) : '';
                        setRecuperoForm(prev => ({
                          ...prev,
                          turno_original_id: val,
                          fecha_inasistencia: calculatedDate
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Selecciona tu turno...</option>
                      {socio.turnos_fijos.map(tfId => {
                        const t = turnos.find(x => x.id === tfId);
                        return (
                          <option key={tfId} value={tfId}>
                            {t ? `${t.dia} ${t.hora}hs` : tfId}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Fecha de Falta</label>
                    <input
                      type="date"
                      value={recuperoForm.fecha_inasistencia}
                      onChange={(e) => setRecuperoForm(prev => ({ ...prev, fecha_inasistencia: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* DESTINO: ALTA OCASIONAL */}
              <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
                <span className="block text-[9px] font-bold text-slate-500 uppercase font-mono tracking-wider">2. ALTA OCASIONAL (Clase de Reemplazo)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Turno de Recupero</label>
                    <select
                      value={recuperoForm.turno_recupero_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchedTurno = turnos.find(t => t.id === val);
                        const calculatedDate = matchedTurno ? getNextOccurrenceOfWeekday(matchedTurno.dia) : '';
                        setRecuperoForm(prev => ({
                          ...prev,
                          turno_recupero_id: val,
                          fecha_recupero: calculatedDate
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Selecciona el recupero...</option>
                      {turnos
                        .filter(t => !socio.turnos_fijos.includes(t.id))
                        .map(t => {
                          const fijosCount = t.asignados_ids.length;
                          const variablesCount = clientes.filter(c => c.activo && c.turno_variable === t.id).length;
                          const occupied = fijosCount + variablesCount;
                          const available = t.cupo_maximo - occupied;
                          return (
                            <option key={t.id} value={t.id} disabled={available <= 0}>
                              {t.dia} {t.hora}hs {available <= 0 ? '(SIN CUPOS)' : `(${available} libres)`}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Fecha de Recupero</label>
                    <input
                      type="date"
                      value={recuperoForm.fecha_recupero}
                      onChange={(e) => setRecuperoForm(prev => ({ ...prev, fecha_recupero: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecuperoModal(false)}
                  className="flex-1 py-2.5 border border-slate-250 text-slate-600 rounded-xl font-bold bg-white hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl border border-emerald-650 shadow-xs transition-all cursor-pointer"
                >
                  Agendar Cambio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
