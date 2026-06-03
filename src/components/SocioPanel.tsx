// src/components/SocioPanel.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGym } from '../GymContext';
import { 
  Trash2, User, Sparkles, AlertTriangle, CreditCard, ExternalLink, 
  ChevronDown, LogOut, QrCode, Barcode, CalendarDays, Award, Phone, 
  Check, Info, Menu, X, Receipt, Home, Shield, Mail, Calendar, MapPin, Plus, RefreshCw, Megaphone,
  CalendarClock, Clock, Loader2
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
    clientes, turnos, pagos, selectedSocioId, planes, googleUser, signOutGoogle,
    novedades, setRolActivo, rolActivo,
    crearReservaIndividual, cancelarReservaIndividual, suspenderClaseFija,
    recuperos, programarRecuperoPendiente, registrarPago
  } = useGym();

  // Navigation tabs: HOME | PERFIL | RESERVAS | PAGOS | NOVEDADES
  const [activeTabSection, setActiveTabSection] = useState<'HOME' | 'PERFIL' | 'RESERVAS' | 'PAGOS' | 'NOVEDADES'>('HOME');
  
  // Mobile/SaaS slide-out sidebar drawer state (Left to Right navigation)
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [activeDays, setActiveDays] = useState<Set<'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES'>>(new Set(['LUNES']));
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Simulated editable profile contact info in state for rich user feel
  const [phoneInput, setPhoneInput] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // States for booking dates selection
  const [bookingTurnId, setBookingTurnId] = useState<string | null>(null);
  const [reprogramTurnId, setReprogramTurnId] = useState<string | null>(null);

  // --- RECOVERY PORTAL STATES ---
  const [canjeRecuperoId, setCanjeRecuperoId] = useState<string | null>(null);
  const [canjeTurnoId, setCanjeTurnoId] = useState<string>('');
  const [canjeFecha, setCanjeFecha] = useState<string>('');
  const [canjeSuccess, setCanjeSuccess] = useState<string | null>(null);
  const [canjeError, setCanjeError] = useState<string | null>(null);

  // --- MERCADO PAGO STATES ---
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentChoiceModal, setShowPaymentChoiceModal] = useState(false);
  const [simulatedSuccessData, setSimulatedSuccessData] = useState<{ clientName: string; amount: number } | null>(null);

  const handlePagarMercadoPago = async () => {
    if (!socio) return;
    setIsPaying(true);
    setPaymentError(null);
    try {
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: socio.deuda_acumulada,
          title: `Cuota KAHA GYM - ${socio.nombre} ${socio.apellido}`,
          clientId: socio.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al iniciar el pago con Mercado Pago.');
      }

      const preference = await response.json();
      if (preference.init_point) {
        window.location.href = preference.init_point;
      } else {
        throw new Error('No se recibió la URL de redirección de Mercado Pago.');
      }
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.message || 'Error de conexión con la pasarela de pagos.');
      setIsPaying(false);
    }
  };



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

  // Pending recovery tickets
  const pendingRecuperos = useMemo(() => {
    if (!socio) return [];
    return (recuperos || []).filter(
      r => r.cliente_id === socio.id && 
           r.turno_recupero_id === 'PENDIENTE_DEFINICION' && 
           r.estado === 'PENDIENTE'
    );
  }, [recuperos, socio]);

  const handleConfirmCanje = (recuperoId: string) => {
    if (!canjeTurnoId || !canjeFecha) {
      setCanjeError('Debes seleccionar un turno y una fecha.');
      return;
    }
    const result = programarRecuperoPendiente(recuperoId, canjeTurnoId, canjeFecha);
    if (result.success) {
      setCanjeSuccess(result.message);
      setCanjeError(null);
      setTimeout(() => {
        setCanjeRecuperoId(null);
        setCanjeTurnoId('');
        setCanjeFecha('');
        setCanjeSuccess(null);
      }, 2000);
    } else {
      setCanjeError(result.message);
      setCanjeSuccess(null);
    }
  };

  const handleCancelCanje = () => {
    setCanjeRecuperoId(null);
    setCanjeTurnoId('');
    setCanjeFecha('');
    setCanjeError(null);
    setCanjeSuccess(null);
  };

  // Daily slots for current tab
  const turnosDelDia = useMemo(() => {
    const DIAS_ORDER = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const selected = activeDays.size > 0 ? activeDays : new Set(['LUNES']);
    return turnos
      .filter(t => selected.has(t.dia as any))
      .sort((a, b) => DIAS_ORDER.indexOf(a.dia) - DIAS_ORDER.indexOf(b.dia) || a.hora.localeCompare(b.hora));
  }, [turnos, activeDays]);

  // Plan matching
  const planSocio = useMemo(() => {
    if (!socio) return null;
    return planes.find(p => p.id === socio.plan_id) || null;
  }, [planes, socio]);

  const paidMonth = useMemo(() => {
    return socio?.ultimo_mes_pagado || new Date().toISOString().slice(0, 7);
  }, [socio]);

  const isDateInPaidMonth = (dateStr: string) => {
    return dateStr.startsWith(paidMonth);
  };
  const getDatesOfWeekdayInMonth = (dayName: string, monthStr: string): string[] => {
    const daysMap = { 'DOMINGO': 0, 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3, 'JUEVES': 4, 'VIERNES': 5, 'SABADO': 6 };
    const targetDay = daysMap[dayName as keyof typeof daysMap] ?? 1;
    const [year, month] = monthStr.split('-').map(Number);
    
    const dates: string[] = [];
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
      if (date.getDay() === targetDay) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }
      date.setDate(date.getDate() + 1);
    }
    return dates;
  };

  const getOccupiedCountOnDate = (turnoId: string, dateStr: string) => {
    const turn = turnos.find(t => t.id === turnoId);
    if (!turn) return 0;
    const fijosCount = turn.asignados_ids.length;
    const individualCount = clientes.reduce((acc, c) => {
      const bookingsOnDate = (c.reservas_individuales || []).filter(r => r.turno_id === turnoId && r.fecha === dateStr);
      return acc + bookingsOnDate.length;
    }, 0);
    return fijosCount + individualCount;
  };

  const getAvailableDatesForTurn = (dayName: string) => {
    const daysMap = { 'DOMINGO': 0, 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3, 'JUEVES': 4, 'VIERNES': 5, 'SABADO': 6 };
    const targetDay = daysMap[dayName as keyof typeof daysMap] ?? 1;
    const [year, month] = paidMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const minDate = new Date(startOfMonth);
    minDate.setDate(minDate.getDate() - 15);
    const maxDate = new Date(endOfMonth);
    maxDate.setDate(maxDate.getDate() + 15);
    const dates: string[] = [];
    const current = new Date(minDate);
    while (current <= maxDate) {
      if (current.getDay() === targetDay) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };
  const totalMonthlySlots = useMemo(() => {
    if (!planSocio) return 12; // default
    return planSocio.dias_por_semana * 4;
  }, [planSocio]);

  const fixedDaysCount = useMemo(() => {
    return socio ? socio.turnos_fijos.length : 0;
  }, [socio]);

  const totalFixedSlotsForMonth = useMemo(() => {
    return fixedDaysCount * 4;
  }, [fixedDaysCount]);

  const activeIndividualReservations = useMemo(() => {
    if (!socio) return [];
    return (socio.reservas_individuales || []).filter(r => isDateInPaidMonth(r.fecha));
  }, [socio, paidMonth]);

  const suspendedClassesThisMonth = useMemo(() => {
    if (!socio) return [];
    return (socio.clases_suspendidas || []).filter(s => isDateInPaidMonth(s.fecha));
  }, [socio, paidMonth]);

  const reintegratedSuspensionsCount = useMemo(() => {
    return suspendedClassesThisMonth.filter(s => s.reintegrado).length;
  }, [suspendedClassesThisMonth]);

  const usedSlots = useMemo(() => {
    return Math.max(0, totalFixedSlotsForMonth - reintegratedSuspensionsCount + activeIndividualReservations.length);
  }, [totalFixedSlotsForMonth, reintegratedSuspensionsCount, activeIndividualReservations]);

  const availableSlots = useMemo(() => {
    return Math.max(0, totalMonthlySlots - usedSlots);
  }, [totalMonthlySlots, usedSlots]);

  // Unified sessions lists (Fijos + Individuales) in course month
  const sesionesDelMes = useMemo(() => {
    if (!socio) return [];
    
    interface SesionInfo {
      id: string; // unique key
      tipo: 'FIJO' | 'INDIVIDUAL';
      turnoId: string;
      diaNombre: string;
      hora: string;
      fecha: string;
      isSuspended: boolean;
      suspendedInfo?: any;
      originalReserva?: any;
    }

    let list: SesionInfo[] = [];

    // 1. Generate from fixed days
    socio.turnos_fijos.forEach(tfId => {
      const turn = turnos.find(t => t.id === tfId);
      if (!turn) return;
      
      const dates = getDatesOfWeekdayInMonth(turn.dia, paidMonth);
      dates.forEach(date => {
        const susp = (socio.clases_suspendidas || []).find(s => s.turno_id === tfId && s.fecha === date);
        list.push({
          id: `fixed-${tfId}-${date}`,
          tipo: 'FIJO',
          turnoId: tfId,
          diaNombre: turn.dia,
          hora: turn.hora,
          fecha: date,
          isSuspended: !!susp,
          suspendedInfo: susp
        });
      });
    });

    // 2. Add individual bookings
    (socio.reservas_individuales || []).forEach(r => {
      if (!isDateInPaidMonth(r.fecha)) return;
      const turn = turnos.find(t => t.id === r.turno_id);
      if (!turn) return;

      list.push({
        id: `indiv-${r.id}`,
        tipo: 'INDIVIDUAL',
        turnoId: r.turno_id,
        diaNombre: turn.dia,
        hora: turn.hora,
        fecha: r.fecha,
        isSuspended: false,
        originalReserva: r
      });
    });

    // Sort chronologically
    list.sort((a, b) => {
      const dateDiff = a.fecha.localeCompare(b.fecha);
      if (dateDiff !== 0) return dateDiff;
      return a.hora.localeCompare(b.hora);
    });

    return list;
  }, [socio, turnos, paidMonth]);

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
          


          {/* SECCIÓN PRESTIGIO: CARTELERA DE NOVEDADES EN HOME */}
          {novedades.length > 0 && (
            <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-3xl p-6.5 relative overflow-hidden shadow-md space-y-4 animate-fade-in" id="home-novedades-preview">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none"></div>
              
              <div className="relative z-10 flex justify-between items-center pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-emerald-400 animate-bounce shrink-0" />
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">CARTELERA DE NOVEDADES</h3>
                    <p className="text-[10px] text-slate-300 font-sans">Anuncios oficiales del gimnasio para alumnos</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTabSection('NOVEDADES')}
                  className="text-[10px] font-bold text-white bg-emerald-600/80 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl hover:bg-emerald-500/95 transition-all cursor-pointer relative z-10"
                >
                  Ver Cartelera Completa
                </button>
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {novedades.slice(0, 2).map((nov) => {
                  return (
                    <div 
                      key={nov.id} 
                      onClick={() => setActiveTabSection('NOVEDADES')}
                      className={`bg-white/5 backdrop-blur-md border p-4 flex flex-col justify-between gap-3 text-xs shadow-xs transition-transform hover:scale-101 cursor-pointer relative overflow-hidden rounded-2xl ${
                        nov.destacado ? 'border-amber-400/60 ring-2 ring-amber-500/10' : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      {nov.destacado && (
                        <span className="absolute top-0 right-0 bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-bl-lg text-[8px] font-black uppercase tracking-wider font-mono">
                          IMPORTANTE
                        </span>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                          <span className="bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30 uppercase font-bold text-emerald-300">
                            {nov.categoria}
                          </span>
                          <span>{nov.fecha}</span>
                        </div>
                        <h4 className="font-bold text-white leading-tight pr-14 text-[12px]">{nov.titulo}</h4>
                        <p className="text-slate-300 text-[11px] line-clamp-2 mt-1">{nov.contenido}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NUEVO BALANCE UNIFICADO: CONTROL DE CUPOS Y TURNOS */}
          <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-sm space-y-6" id="socio-control-cupos-hero">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
                  Balance de Reservas
                </span>
                <h3 className="text-base font-black text-slate-800 tracking-tight mt-1.5 flex items-center gap-2">
                  <CalendarDays className="w-5.5 h-5.5 text-emerald-600 shrink-0" />
                  <span>CONTROL DE CUPOS Y TURNOS</span>
                </h3>
              </div>
              <button 
                onClick={() => setActiveTabSection('RESERVAS')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                id="home-go-to-reservations-shortcut"
              >
                <span>Reservar nuevo cupo</span>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-150">
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Cupos Mensuales Plan</p>
                <p className="text-lg font-black text-slate-800">{totalMonthlySlots} <span className="text-xs text-slate-400 font-medium">clases</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Cupos Asignados / Usados</p>
                <p className="text-lg font-black text-emerald-700">{usedSlots} / {totalMonthlySlots}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Cupos Libres por Asignar</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${availableSlots > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                  <p className="text-lg font-black text-slate-800">{availableSlots}</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all" 
                  style={{ width: `${Math.min((usedSlots / totalMonthlySlots) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Agenda List of the Month */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-slate-450 uppercase tracking-widest font-mono">Mis Sesiones Programadas ({paidMonth})</h4>
              
              {sesionesDelMes.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Calendar className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-xs text-slate-700">No tienes sesiones programadas para este mes</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Tus días fijos y reservas aparecerán aquí. Presiona "Reservar nuevo cupo" para agendar clases.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sesionesDelMes.map(sesion => {
                    const dateFormatted = new Date(sesion.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short'
                    });

                    return (
                      <div 
                        key={sesion.id} 
                        className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all relative overflow-hidden ${
                          sesion.isSuspended 
                            ? 'bg-slate-50/80 border-slate-200 opacity-60' 
                            : sesion.tipo === 'FIJO' 
                              ? 'bg-sky-50/40 border-sky-200 hover:border-sky-300' 
                              : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 z-10">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              sesion.isSuspended 
                                ? 'bg-slate-100 text-slate-400 border-slate-200'
                                : sesion.tipo === 'FIJO' 
                                  ? 'bg-sky-100 text-sky-700 border-sky-150' 
                                  : 'bg-emerald-100 text-emerald-700 border-emerald-150'
                            }`}>
                              <Calendar className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <p className={`text-xs font-black text-slate-800 uppercase tracking-tight leading-none ${sesion.isSuspended ? 'line-through text-slate-400' : ''}`}>
                                {dateFormatted}
                              </p>
                              <p className={`text-[10px] text-slate-500 font-mono mt-1 ${sesion.isSuspended ? 'line-through' : ''}`}>
                                {sesion.hora} hs • {sesion.tipo === 'FIJO' ? 'Clase Fija Semanal' : 'Reserva Individual'}
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          {sesion.isSuspended ? (
                            <span className={`text-[8px] font-bold tracking-wider px-2 py-0.5 rounded font-mono border ${
                              sesion.suspendedInfo?.reintegrado 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {sesion.suspendedInfo?.reintegrado ? 'SUSPENDIDA (REINTEGRADO)' : 'SUSPENDIDA (SIN REINTEGRO)'}
                            </span>
                          ) : (
                            <span className={`text-[8px] font-bold tracking-wider px-2 py-0.5 rounded font-mono border ${
                              sesion.tipo === 'FIJO' 
                                ? 'bg-sky-50 text-sky-850 border-sky-200' 
                                : 'bg-emerald-50 text-emerald-805 border-emerald-200'
                            }`}>
                              {sesion.tipo === 'FIJO' ? 'FIJO' : 'INDIVIDUAL'}
                            </span>
                          )}
                        </div>

                        {/* Suspension / Cancellation buttons */}
                        {!sesion.isSuspended && (
                          <div className="flex justify-end pt-2 border-t border-slate-100/50 z-10">
                            {sesion.tipo === 'FIJO' ? (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Confirmas suspender la clase fija del ${dateFormatted} a las ${sesion.hora} hs? Si suspendes con más de 3 horas de anticipación, se te reintegrará el cupo.`)) {
                                    const res = suspenderClaseFija(socio.id, sesion.turnoId, sesion.fecha);
                                    if (res.success) {
                                      setSuccessMessage(res.message);
                                      setTimeout(() => setSuccessMessage(null), 4000);
                                    } else {
                                      setErrorMessage(res.message);
                                      setTimeout(() => setErrorMessage(null), 4000);
                                    }
                                  }
                                }}
                                className="text-[9px] font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Suspender clase
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Confirmas cancelar esta reserva individual del ${dateFormatted} a las ${sesion.hora} hs? Si cancelas con más de 3 horas de anticipación, se te reintegrará el cupo.`)) {
                                    const res = cancelarReservaIndividual(socio.id, sesion.originalReserva.id);
                                    if (res.success) {
                                      setSuccessMessage(res.message);
                                      setTimeout(() => setSuccessMessage(null), 4000);
                                    } else {
                                      setErrorMessage(res.message);
                                      setTimeout(() => setErrorMessage(null), 4000);
                                    }
                                  }
                                }}
                                className="text-[9px] font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancelar reserva
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* BENTO GRID DE INFORMACIÓN DE PERFIL */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6" id="socio-bento-dashboard">
            
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

              {socio.deuda_acumulada > 0 && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    onClick={() => setShowPaymentChoiceModal(true)}
                    disabled={isPaying}
                    className="w-full bg-[#009EE3] hover:bg-[#008bc7] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPaying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>{isPaying ? 'Iniciando Mercado Pago...' : 'Pagar con Mercado Pago'}</span>
                  </button>
                  {paymentError && (
                    <p className="text-[10px] text-rose-600 font-semibold mt-1 text-center bg-rose-50 border border-rose-100 p-1.5 rounded-lg">
                      {paymentError}
                    </p>
                  )}
                </div>
              )}
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
                          <span className={`font-mono font-bold px-2.5 py-0.5 rounded text-[10px] ${
                            socio.estado === 'ACTIVO' 
                              ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' 
                              : 'bg-rose-50 border border-rose-100 text-rose-700'
                          }`}>
                            {socio.estado === 'ACTIVO' ? 'ACTIVO / AL DÍA' : 'CON DEUDA / INHABILITADO'}
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
                          <span className={`font-bold font-mono text-[11px] ${socio.deuda_acumulada > 0 ? 'text-rose-700 font-extrabold' : 'text-slate-850'}`}>
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

                      <div className={`p-4 border-t border-slate-200 ${socio.deuda_acumulada > 0 ? 'bg-rose-50/40' : 'bg-emerald-50/40'}`}>
                        {socio.deuda_acumulada > 0 ? (
                          <p className="text-[10px] text-rose-850 leading-relaxed font-semibold flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 text-rose-650 shrink-0 mt-0.5 animate-pulse" />
                            <span>
                              Registrás una deuda de ${socio.deuda_acumulada.toLocaleString('es-AR')} ARS. Podés abonar de forma directa y 100% segura mediante Mercado Pago con el botón ubicado en tu plan vigente.
                            </span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-emerald-850 leading-relaxed font-semibold flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 text-emerald-650 shrink-0 mt-0.5 animate-pulse" />
                            <span>
                              Para solicitar cambios permanentes en el tipo de tu membresía o cancelaciones, por favor contactate con administración vía WhatsApp.
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
           {activeTabSection === 'RESERVAS' && (
        <section className="bg-white border border-slate-205 rounded-3xl p-6.5 lg:p-8 shadow-sm relative animate-fade-in" id="socio-agenda-block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_90%,rgba(16,185,129,0.01),transparent_40%)] pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2 tracking-tight">
                <CalendarDays className="w-5.5 h-5.5 text-emerald-650" />
                INSCRIPCIONES Y HORARIOS DISPONIBLES
              </h2>
              <p className="text-slate-500 text-xs font-sans mt-1">
                Administra tus días de entrenamiento y reserva los cupos libres mensuales de tu plan.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 text-[10px] text-slate-450 font-mono">
              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="w-2.5 h-2.5 bg-sky-200 border border-sky-400 rounded-full inline-block"></span> 
                <span className="text-slate-600 font-semibold">Tus Días Fijos</span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="w-2.5 h-2.5 bg-emerald-200 border border-emerald-400 rounded-full inline-block"></span> 
                <span className="text-slate-600 font-semibold">Tus Reservas Individuales</span>
              </span>
            </div>
          </div>

          {/* SUMMARY BOX: INFO REQUESTED BY USER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-450 font-mono uppercase tracking-wider font-extrabold">1. Cupos Disponibles por Asignar este Mes</p>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${availableSlots > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                <p className="text-lg font-black text-slate-800">
                  {availableSlots} <span className="text-xs text-slate-500 font-medium">de {totalMonthlySlots} cupos totales</span>
                </p>
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-normal">
                Puedes asignarlos libremente a cualquier horario con cupo en la grilla inferior.
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-450 font-mono uppercase tracking-wider font-extrabold">2. Días Fijos Asignados</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-slate-800">
                  {socio.turnos_fijos.length > 0 ? (
                    <span>{socio.turnos_fijos.length} días fijos semanales <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded">({totalFixedSlotsForMonth}/{totalMonthlySlots} cupos)</span></span>
                  ) : (
                    <span className="text-slate-450 italic text-xs font-medium">No posees horarios fijos semanales (Flex)</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {socio.turnos_fijos.map(tfId => {
                  const turn = turnos.find(t => t.id === tfId);
                  if (!turn) return null;
                  return (
                    <span key={tfId} className="text-[9px] font-mono font-bold text-slate-650 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-3xs">
                      {turn.dia} {turn.hora} hs
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ALL FIXED WARNING */}
          {availableSlots === 0 && usedSlots === totalMonthlySlots && (
            <div className="mb-8 p-4.5 bg-sky-50 border border-sky-150 rounded-2xl flex items-center gap-3">
              <Info className="w-5 h-5 text-sky-600 shrink-0" />
              <p className="text-[11px] text-sky-850 font-medium leading-relaxed">
                ¡Tienes todos tus cupos mensuales asignados de forma fija! Si deseas asistir en otro horario, puedes <strong>reprogramar</strong> tus sesiones haciendo click en "Reprogramar clase" en tus días fijos o desde el listado de sesiones en la pantalla de Inicio.
              </p>
            </div>
          )}

          {/* SECCIÓN: RECUPEROS PENDIENTES */}
          {pendingRecuperos.length > 0 && (
            <div className="mb-8 p-5 bg-amber-50/50 border border-amber-250 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="w-5.5 h-5.5 text-amber-600 animate-pulse" />
                <h3 className="text-xs font-black uppercase text-amber-800 tracking-wider font-mono">
                  Mis Recuperos Pendientes de Reprogramación
                </h3>
              </div>
              <p className="text-[11px] text-amber-700 font-sans mb-4 leading-relaxed">
                Tienes inasistencias registradas (por aviso de falta o vacaciones) que aún no has reprogramado. Cada ticket de recupero es válido por 1 mes (30 días) a partir de la inasistencia. ¡Canjéalos antes de que expiren!
              </p>

              <div className="space-y-3">
                {pendingRecuperos.map(rec => {
                  const originalTurn = turnos.find(t => t.id === rec.turno_original_id);
                  const isExpired = new Date(rec.fecha_limite + 'T23:59:59') < new Date();
                  const dateFormatted = new Date(rec.fecha_inasistencia + 'T00:00:00').toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  const limitDateFormatted = new Date(rec.fecha_limite + 'T00:00:00').toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <div key={rec.id} className="bg-white border border-amber-205 rounded-xl p-4 shadow-3xs flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Clase del {dateFormatted}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Original: {originalTurn ? `${originalTurn.dia} a las ${originalTurn.hora} hs` : 'Turno no encontrado'}
                          </p>
                          <p className="text-[10px] text-amber-750 font-bold mt-1.5 flex items-center gap-1.5 font-mono">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            VENCE EL: {limitDateFormatted}
                          </p>
                        </div>

                        {!isExpired && (
                          <button
                            onClick={() => {
                              if (canjeRecuperoId === rec.id) {
                                handleCancelCanje();
                              } else {
                                setCanjeRecuperoId(rec.id);
                                setCanjeTurnoId('');
                                setCanjeFecha('');
                              }
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer font-sans shrink-0 flex items-center gap-1.5 ${
                              canjeRecuperoId === rec.id
                                ? 'bg-slate-100 border border-slate-205 text-slate-650 hover:bg-slate-200'
                                : 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-650 shadow-3xs'
                            }`}
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            {canjeRecuperoId === rec.id ? 'Cancelar' : 'Canjear Recupero'}
                          </button>
                        )}
                      </div>

                      {/* FORM DE CANJE EXPANDIBLE */}
                      {canjeRecuperoId === rec.id && (
                        <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200 space-y-4 animate-fade-in mt-2">
                          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
                            Programar Clase de Recupero
                          </h4>

                          {canjeError && (
                            <div className="p-2.5 bg-rose-50 border border-rose-150 rounded-lg text-[10px] text-rose-600 font-medium">
                              {canjeError}
                            </div>
                          )}

                          {canjeSuccess && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-150 rounded-lg text-[10px] text-emerald-700 font-bold">
                              {canjeSuccess}
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                1. Selecciona Turno
                              </label>
                              <select
                                value={canjeTurnoId}
                                onChange={(e) => {
                                  setCanjeTurnoId(e.target.value);
                                  setCanjeFecha('');
                                }}
                                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 outline-hidden focus:border-emerald-500 font-mono transition-all"
                              >
                                <option value="">-- Seleccionar Turno --</option>
                                {turnos.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.dia} - {t.hora} hs {t.profesor ? `(Prof: ${t.profesor})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                2. Selecciona Fecha
                              </label>
                              {canjeTurnoId ? (
                                <select
                                  value={canjeFecha}
                                  onChange={(e) => setCanjeFecha(e.target.value)}
                                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 outline-hidden focus:border-emerald-500 font-mono transition-all"
                                >
                                  <option value="">-- Seleccionar Fecha --</option>
                                  {getAvailableDatesForTurn(turnos.find(t => t.id === canjeTurnoId)!.dia)
                                    .filter(d => {
                                      const dObj = new Date(d + 'T00:00:00');
                                      const limitObj = new Date(rec.fecha_limite + 'T23:59:59');
                                      return dObj <= limitObj && dObj >= new Date(new Date().setHours(0,0,0,0));
                                    })
                                    .map(d => {
                                      const formattedDate = new Date(d + 'T00:00:00').toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        weekday: 'short'
                                      });
                                      return (
                                        <option key={d} value={d}>
                                          {formattedDate}
                                        </option>
                                      );
                                    })}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  disabled
                                  placeholder="Selecciona primero un turno"
                                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100/50 text-slate-400 font-mono cursor-not-allowed"
                                />
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-150">
                            <button
                              type="button"
                              onClick={handleCancelCanje}
                              className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmCanje(rec.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Confirmar Agendamiento
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DIAS CALENDARIO SELECTOR TAB BAR — MULTI SELECT */}
          <div className="grid grid-cols-5 bg-slate-100 p-1.5 rounded-2xl border border-slate-205 gap-1 lg:max-w-xl mx-auto mb-8" id="socio-agenda-tabs">
            {(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const).map(dia => {
              const isActive = activeDays.has(dia);
              return (
                <button
                  key={dia}
                  onClick={() => {
                    setActiveDays(prev => {
                      const next = new Set(prev);
                      if (next.has(dia)) {
                        if (next.size > 1) next.delete(dia); // keep at least one
                      } else {
                        next.add(dia);
                      }
                      return next;
                    });
                    setBookingTurnId(null);
                    setReprogramTurnId(null);
                  }}
                  className={`py-3.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer select-none border ${
                    isActive 
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white border-transparent font-black scale-102 shadow-sm ring-2 ring-emerald-500/20' 
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
          {activeDays.size > 1 && (
            <div className="flex items-center justify-center mb-4">
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {activeDays.size} días seleccionados — tocá un día para deseleccionarlo
              </span>
            </div>
          )}

          {/* CONTENEDOR DE SLOTS HOY / GRID — agrupado por día */}
          <div className="space-y-8" id="socio-agenda-slots">
            {turnosDelDia.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-slate-150 rounded-2xl">
                <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500 italic text-xs font-medium">No hay horarios configurados para los días seleccionados.</p>
              </div>
            ) : (
              (['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const)
                .filter(dia => activeDays.has(dia))
                .map(dia => {
                  const turnosDelDiaFiltrado = turnosDelDia.filter(t => t.dia === dia);
                  if (turnosDelDiaFiltrado.length === 0) return null;
                  return (
                    <div key={dia}>
                      {/* Separador de día cuando hay más de 1 seleccionado */}
                      {activeDays.size > 1 && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px flex-1 bg-slate-200"></div>
                          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest font-mono bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                            {dia === 'MIERCOLES' ? 'Miércoles' : dia.charAt(0) + dia.slice(1).toLowerCase()}
                          </span>
                          <div className="h-px flex-1 bg-slate-200"></div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {turnosDelDiaFiltrado.map(turno => {

                  const holdsMyFijo = socio.turnos_fijos.includes(turno.id);
                  const misReservasEnTurno = (socio.reservas_individuales || []).filter(r => r.turno_id === turno.id && isDateInPaidMonth(r.fecha));
                  const holdsMyIndividual = misReservasEnTurno.length > 0;

                  return (
                    <div 
                      key={turno.id}
                      className={`
                        p-4.5 rounded-2xl border transition-all flex flex-col justify-between gap-4 select-none
                        ${holdsMyFijo 
                          ? 'bg-sky-50/40 border-sky-305 shadow-inner' 
                          : holdsMyIndividual 
                            ? 'bg-emerald-50/50 border-emerald-305 shadow-inner' 
                            : 'bg-slate-50/30 border-slate-205 hover:border-slate-300'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${
                            holdsMyFijo 
                              ? 'bg-sky-100 text-sky-700 border-sky-200' 
                              : holdsMyIndividual 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                : 'bg-white text-slate-500 border-slate-200'
                          }`}>
                            <Calendar className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-800 tracking-tight">{turno.hora} hs</p>
                            <p className="text-[10px] text-slate-450 mt-1 font-medium">
                              Cupo máximo del salón: {turno.cupo_maximo} alumnos
                            </p>
                            {holdsMyIndividual && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {misReservasEnTurno.map(res => (
                                  <span key={res.id} className="text-[8px] font-mono font-bold text-emerald-805 bg-emerald-100/50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                    Reservado: {new Date(res.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* BADGES */}
                        {holdsMyFijo && (
                          <span className="text-[8px] bg-sky-100 text-sky-700 border border-sky-200 font-bold px-2 py-0.5 rounded-md uppercase tracking-widest font-mono shrink-0">
                            TU FIJO
                          </span>
                        )}
                        {holdsMyIndividual && !holdsMyFijo && (
                          <span className="text-[8px] bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-md uppercase tracking-widest font-mono shrink-0">
                            RESERVADO
                          </span>
                        )}
                      </div>

                      {/* Expandable Booking dates view */}
                      {bookingTurnId === turno.id && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 mt-2 animate-fade-in">
                          <p className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider">Fechas Disponibles:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {getAvailableDatesForTurn(turno.dia).map(dateStr => {
                              const occupiedCount = getOccupiedCountOnDate(turno.id, dateStr);
                              const isFullOnDate = occupiedCount >= turno.cupo_maximo;
                              
                              const hasBooking = (socio.reservas_individuales || []).some(r => r.fecha === dateStr) || 
                                                 socio.turnos_fijos.some(tfId => {
                                                   const tfTurn = turnos.find(t => t.id === tfId);
                                                   if (!tfTurn) return false;
                                                   const dateObj = new Date(dateStr + 'T00:00:00');
                                                   const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
                                                   const dateDayName = days[dateObj.getDay()];
                                                   if (tfTurn.dia === dateDayName) {
                                                     const isSuspended = (socio.clases_suspendidas || []).some(s => s.turno_id === tfId && s.fecha === dateStr);
                                                     return !isSuspended;
                                                   }
                                                   return false;
                                                 });
                              
                              const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short'
                              });

                              return (
                                <div key={dateStr} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-150 text-xs">
                                  <div>
                                    <span className="font-bold text-slate-700">{dateFormatted}</span>
                                    <span className="text-[9px] text-slate-455 font-mono ml-2">({occupiedCount}/{turno.cupo_maximo} ocupados)</span>
                                  </div>

                                  {hasBooking ? (
                                    <span className="text-[9px] font-bold text-slate-450 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Ya tienes clase</span>
                                  ) : isFullOnDate ? (
                                    <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">Lleno</span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const res = crearReservaIndividual(socio.id, turno.id, dateStr);
                                        if (res.success) {
                                          setSuccessMessage(res.message);
                                          setTimeout(() => setSuccessMessage(null), 3500);
                                          setBookingTurnId(null);
                                        } else {
                                          setErrorMessage(res.message);
                                          setTimeout(() => setErrorMessage(null), 3500);
                                        }
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-[9px] transition-all cursor-pointer shadow-3xs"
                                    >
                                      Confirmar
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Expandable Reprogram/Suspend fixed date view */}
                      {reprogramTurnId === turno.id && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 mt-2 animate-fade-in">
                          <p className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider">Escoge qué sesión reprogramar:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {getDatesOfWeekdayInMonth(turno.dia, paidMonth).map(dateStr => {
                              const isSuspended = (socio.clases_suspendidas || []).some(s => s.turno_id === turno.id && s.fecha === dateStr);
                              const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short'
                              });

                              return (
                                <div key={dateStr} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-150 text-xs">
                                  <span className="font-bold text-slate-700">{dateFormatted}</span>

                                  {isSuspended ? (
                                    <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">Suspendida</span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (confirm(`¿Confirmas suspender la sesión fija del ${dateFormatted} para reprogramarla?`)) {
                                          const res = suspenderClaseFija(socio.id, turno.id, dateStr);
                                          if (res.success) {
                                            setSuccessMessage(res.message);
                                            setTimeout(() => setSuccessMessage(null), 4000);
                                            setReprogramTurnId(null);
                                          } else {
                                            setErrorMessage(res.message);
                                            setTimeout(() => setErrorMessage(null), 4000);
                                          }
                                        }
                                      }}
                                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1 rounded-lg text-[9px] transition-all cursor-pointer shadow-3xs"
                                    >
                                      Suspender
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs mt-1">
                        <div>
                          {/* Indicator dot */}
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${holdsMyFijo ? 'bg-sky-400 animate-pulse' : holdsMyIndividual ? 'bg-emerald-400' : 'bg-slate-200'}`}></span>
                        </div>

                        <div>
                          {holdsMyFijo && (
                            <button
                              onClick={() => {
                                setReprogramTurnId(reprogramTurnId === turno.id ? null : turno.id);
                                setBookingTurnId(null);
                              }}
                              className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-150 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 font-sans"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Reprogramar clase
                            </button>
                          )}

                          {!holdsMyFijo && (
                            <button
                              onClick={() => {
                                setBookingTurnId(bookingTurnId === turno.id ? null : turno.id);
                                setReprogramTurnId(null);
                              }}
                              className={`
                                px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer font-sans
                                ${bookingTurnId === turno.id
                                  ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                  : 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-650 text-white shadow-xs'
                                }
                              `}
                            >
                              {bookingTurnId === turno.id ? 'CERRAR PANEL' : 'RESERVAR CUPO'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            );
          })
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

                // Per-category color scheme: card bg, border, badge, title, text
                let cardBg = 'bg-gradient-to-br from-sky-50 to-sky-100/60 border-sky-200';
                let badgeCls = 'bg-sky-500/15 text-sky-800 border-sky-300';
                let titleCls = 'text-sky-950';
                let bodyCls = 'text-sky-900/80';
                let footerCls = 'border-sky-200/60 text-sky-600/70';
                let accentBar = 'bg-sky-500';
                let labelTxt = 'Información General';

                if (isArancel) {
                  cardBg = 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 border-emerald-200';
                  badgeCls = 'bg-emerald-500/15 text-emerald-800 border-emerald-300';
                  titleCls = 'text-emerald-950';
                  bodyCls = 'text-emerald-900/80';
                  footerCls = 'border-emerald-200/60 text-emerald-600/70';
                  accentBar = 'bg-emerald-500';
                  labelTxt = 'Aranceles y Pagos';
                } else if (isTurno) {
                  cardBg = 'bg-gradient-to-br from-teal-50 to-teal-100/60 border-teal-200';
                  badgeCls = 'bg-teal-500/15 text-teal-800 border-teal-300';
                  titleCls = 'text-teal-950';
                  bodyCls = 'text-teal-900/80';
                  footerCls = 'border-teal-200/60 text-teal-600/70';
                  accentBar = 'bg-teal-500';
                  labelTxt = 'Horarios y Turnos';
                } else if (isEvento) {
                  cardBg = 'bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-200';
                  badgeCls = 'bg-amber-500/15 text-amber-800 border-amber-300';
                  titleCls = 'text-amber-950';
                  bodyCls = 'text-amber-900/80';
                  footerCls = 'border-amber-200/60 text-amber-600/70';
                  accentBar = 'bg-amber-500';
                  labelTxt = 'Talleres y Eventos';
                }

                return (
                  <div
                    key={nov.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 relative overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${cardBg} ${
                      nov.destacado ? 'ring-2 ring-amber-400/40' : ''
                    }`}
                  >
                    {/* Colored left accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentBar}`}></div>

                    {nov.destacado && (
                      <span className="absolute top-0 right-0 bg-amber-500 text-white px-2.5 py-0.5 rounded-bl-xl text-[8px] font-black uppercase tracking-widest font-mono flex items-center gap-1">
                        <Award className="w-3 h-3 text-white" />
                        DESTACADO
                      </span>
                    )}

                    <div className="space-y-3 pl-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 border rounded-md text-[8.5px] font-black uppercase tracking-wider font-mono ${badgeCls}`}>
                          {labelTxt}
                        </span>
                        <span className={`text-[10px] font-mono ${footerCls.split(' ').slice(-1)[0]}`}>{nov.fecha}</span>
                      </div>

                      <h4 className={`font-bold leading-snug tracking-tight text-sm md:text-base font-sans mt-1 ${titleCls}`}>
                        {nov.titulo}
                      </h4>

                      <p className={`text-xs font-sans whitespace-pre-line leading-relaxed ${bodyCls}`}>
                        {nov.contenido}
                      </p>
                    </div>

                    <div className={`pt-3 border-t flex items-center gap-1 text-[9.5px] font-sans mt-auto pl-2 ${footerCls}`}>
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


      {/* Floating WhatsApp Button — raised above bottom nav */}
      <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-2 group" id="floating-whatsapp-container">
        {/* Chat Tooltip Bubble */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 text-slate-800 px-3.5 py-2 rounded-2xl shadow-lg text-[11px] font-bold tracking-tight opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none select-none font-sans flex items-center gap-2 border-emerald-100">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>¿Consultas? Chateá con nosotros</span>
        </div>
        
        <a
          href={`https://wa.me/541178402722?text=${encodeURIComponent(`Hola KAHA GYM, soy el socio ${socio.nombre} ${socio.apellido}. Me contacto desde mi portal de cliente.`)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/35 transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 relative"
          aria-label="Contactar por WhatsApp"
          id="floating-whatsapp-btn"
        >
          {/* Animated background ping wave */}
          <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping opacity-60 pointer-events-none"></span>
          
          {/* Official WhatsApp SVG Icon */}
          <svg className="w-6 h-6 fill-current text-white relative z-10" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/>
          </svg>
        </a>
      </div>

      {/* ═══ BOTTOM NAVIGATION BAR ═══ */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.07)] flex items-center justify-around px-2 pb-safe"
        id="socio-bottom-navbar"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', height: '68px' }}
      >
        {/* PERFIL */}
        <button
          onClick={() => setActiveTabSection('PERFIL')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-[52px] ${
            activeTabSection === 'PERFIL' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
          }`}
          id="bottom-nav-perfil"
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Perfil</span>
        </button>

        {/* RESERVAS */}
        <button
          onClick={() => setActiveTabSection('RESERVAS')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-[52px] ${
            activeTabSection === 'RESERVAS' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
          }`}
          id="bottom-nav-reservas"
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Horarios</span>
        </button>

        {/* HOME — CENTRAL PROMINENTE */}
        <button
          onClick={() => setActiveTabSection('HOME')}
          className="flex flex-col items-center gap-0.5 -mt-5 cursor-pointer group/home"
          id="bottom-nav-home"
          aria-label="Ir al inicio"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all group-hover/home:scale-105 active:scale-95 ${
            activeTabSection === 'HOME'
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 ring-4 ring-emerald-500/20'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600'
          }`}>
            <Home className="w-6 h-6 text-white" />
          </div>
          <span className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${
            activeTabSection === 'HOME' ? 'text-emerald-600' : 'text-slate-500'
          }`}>Home</span>
        </button>

        {/* PAGOS */}
        <button
          onClick={() => setActiveTabSection('PAGOS')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-[52px] ${
            activeTabSection === 'PAGOS' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
          }`}
          id="bottom-nav-pagos"
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Pagos</span>
        </button>

        {/* NOVEDADES */}
        <button
          onClick={() => setActiveTabSection('NOVEDADES')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-[52px] relative ${
            activeTabSection === 'NOVEDADES' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
          }`}
          id="bottom-nav-novedades"
        >
          <Megaphone className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Cartelera</span>
          {novedades.some(n => n.destacado) && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
          )}
        </button>
      </nav>

      {/* Spacer so content doesn't hide behind bottom nav */}
      <div className="h-20" aria-hidden="true" />

      {/* CHOICE MODAL FOR PAYMENT METHOD */}
      {showPaymentChoiceModal && socio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in font-sans" id="payment-choice-modal">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl relative overflow-hidden flex flex-col animate-scale-in">
            {/* Decorative background gradients */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-100 rounded-full blur-3xl opacity-55"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-150 rounded-full blur-3xl opacity-40"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Confirmar Método de Pago</h3>
              <button 
                onClick={() => setShowPaymentChoiceModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Monto a abonar</span>
                <span className="text-2xl font-black text-slate-800 font-mono">${socio.deuda_acumulada.toLocaleString('es-AR')} ARS</span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Selecciona cómo deseas procesar este pago. Puedes usar la pasarela oficial de Mercado Pago o simular el cobro de forma instantánea localmente sin configurar cuentas externas.
              </p>

              <div className="pt-2 flex flex-col gap-3">
                {/* Option 1: Official Checkout */}
                <button
                  onClick={async () => {
                    setShowPaymentChoiceModal(false);
                    await handlePagarMercadoPago();
                  }}
                  disabled={isPaying}
                  className="w-full bg-[#009EE3] hover:bg-[#008bc7] text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-md disabled:opacity-60"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Proceder con Mercado Pago (Oficial)</span>
                </button>

                {/* Option 2: Local Simulation */}
                <button
                  onClick={() => {
                    if (!socio) return;
                    setShowPaymentChoiceModal(false);
                    
                    // Simulate registration
                    const simulatedHash = `SIM-MP-${Date.now()}`;
                    const res = registrarPago({
                      cliente_id: socio.id,
                      cliente_nombre_completo: `${socio.nombre} ${socio.apellido}`,
                      monto: socio.deuda_acumulada,
                      medio_pago: 'MERCADO_PAGO',
                      mes_correspondiente: new Date().toISOString().slice(0, 7), // mes actual
                      hash_transaccion: simulatedHash,
                      registrado_por: socio.email
                    }, socio.email);

                    if (res.success) {
                      setSimulatedSuccessData({
                        clientName: `${socio.nombre} ${socio.apellido}`,
                        amount: socio.deuda_acumulada
                      });
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Simular Pago Rápido (Local)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED PAYMENT SUCCESS RECEIPT MODAL */}
      {simulatedSuccessData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-scale-in">
            {/* Decorative background gradients */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-100 rounded-full blur-3xl opacity-50"></div>

            {/* Big check icon with pulsating circle */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-100 rounded-full scale-150 animate-ping opacity-30"></div>
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white border-4 border-white shadow-md relative z-10">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-800 tracking-tight">¡Pago Aprobado (Simulado)!</h3>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Tu transacción simulada se ha procesado con éxito y se ha reportado al panel administrativo.
            </p>

            {/* Receipt display card */}
            <div className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-5 my-6 space-y-3 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono uppercase">Socio</span>
                <span className="font-bold text-slate-800">{simulatedSuccessData.clientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono uppercase">Medio de Pago</span>
                <span className="font-semibold text-sky-650 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 text-[10px]">
                  SIMULACIÓN MP
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono uppercase">Monto Abonado</span>
                <span className="font-black text-emerald-700 text-sm font-mono">
                  ${simulatedSuccessData.amount.toLocaleString('es-AR')} ARS
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-200">
                <span className="text-slate-400 font-mono uppercase">Estado Cuenta</span>
                <span className="font-bold text-emerald-750 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[9px] border border-emerald-150 uppercase tracking-wide">
                  ✓ Al Día
                </span>
              </div>
            </div>

            <button
              onClick={() => setSimulatedSuccessData(null)}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all shadow-md active:scale-98 cursor-pointer relative z-10"
            >
              Entendido, gracias
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
