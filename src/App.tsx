// src/App.tsx
import { useState, useEffect } from 'react';
import { GymProvider, useGym } from './GymContext';
import { RoleSwitcher } from './components/Auth/RoleSwitcher';
import { Dashboard } from './components/Dashboard';
import { ClientesCRUD } from './components/Clientes/ClientesCRUD';
import { PlanesPricing } from './components/Planes/PlanesPricing';
import { TurnosGrid } from './components/Turnos/TurnosGrid';
import { PagosLog } from './components/Pagos/PagosLog';
import { MorososControl } from './components/Morosos/MorososControl';
import { ProyeccionesTab } from './components/Proyecciones/ProyeccionesTab';
import { AuditLogView } from './components/AuditLog/AuditLogView';
import { SocioPanel } from './components/SocioPanel/SocioPanel';
import { GoogleSignIn } from './components/Auth/GoogleSignIn';
import { NovedadesCRUD } from './components/Novedades/NovedadesCRUD';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SocioRegistrationForm } from './components/Auth/SocioRegistrationForm';
import { AuthorizeClientModal } from './components/Clientes/AuthorizeClientModal';
import { Footer } from './components/Common/Footer';
import logoKaha from './assets/logokaha.png';

import { 
  Dribbble, Landmark, LayoutDashboard, Users, CreditCard, 
  CalendarRange, ShieldAlert, LineChart, ShieldCheck,
  Menu, X, MapPin, Shield, Megaphone, Check, Bell, Trash2,
  CheckCircle2, AlertTriangle
} from 'lucide-react';

type TabID = 'DASHBOARD' | 'CLIENTES' | 'PLANES' | 'TURNOS' | 'PAGOS' | 'MOROSIDAD' | 'PROYECCIONES' | 'AUDITORIA' | 'NOVEDADES';

export default function App() {
  return (
    <GymProvider>
      <InnerApp />
    </GymProvider>
  );
}

function InnerApp() {
  const [activeTab, setActiveTab] = useState<TabID>('DASHBOARD');
  const [showAddPagoModal, setShowAddPagoModal] = useState(false);
  const [openTurnosModalId, setOpenTurnosModalId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [authorizingClientId, setAuthorizingClientId] = useState<string | null>(null);
  const [clientToOpenTurnosAfterAuth, setClientToOpenTurnosAfterAuth] = useState<string | null>(null);

  const handleStartAuthorization = (clientId: string) => {
    setAuthorizingClientId(clientId);
    setClientToOpenTurnosAfterAuth(clientId);
  };
  const { 
    rolActivo, googleUser, signOutGoogle, registrarPago, clientes,
    notificaciones, marcarNotificacionesLeidas, eliminarNotificacion,
    autorizarCliente, toasts, removeToast,
    pendingRegistrationUser, loading
  } = useGym();

  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');

  // Escape key closes notifications dropdown & sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotificationsDropdown(false);
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // --- MERCADO PAGO SUCCESS REDIRECT PROCESSING ---
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ clientName: string; amount: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get('mp_status');
    const clientId = params.get('clientId');
    const amountStr = params.get('amount');
    const preferenceId = params.get('preference_id');

    if (mpStatus === 'success' && clientId) {
      // Si la lista de clientes está vacía (cargando desde Supabase), esperamos a la siguiente renderización
      if (clientes.length === 0) return;

      const amount = Number(amountStr) || 0;
      const client = clientes.find(c => c.id === clientId);
      if (client) {
        // Build unique hash based on preference ID or fallback to current timestamp
        const hash = preferenceId ? `MP-${preferenceId}` : `MP-${Date.now()}`;
        
        // Execute the payment registration in context
        const pagoResult = registrarPago({
          cliente_id: clientId,
          cliente_nombre_completo: `${client.nombre} ${client.apellido}`,
          monto: amount,
          medio_pago: 'MERCADO_PAGO',
          mes_correspondiente: new Date().toISOString().slice(0, 7), // mes actual
          hash_transaccion: hash,
          registrado_por: client.email // socio pagó online
        }, client.email);

        if (pagoResult.success) {
          setPaymentSuccessData({
            clientName: `${client.nombre} ${client.apellido}`,
            amount: amount
          });
        }
      } else {
        console.warn(`[Mercado Pago] No se encontró el cliente con ID: ${clientId}`);
      }

      // Clean query parameters from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [clientes, registrarPago]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      const optionsTime: Intl.DateTimeFormatOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      };
      
      try {
        setTimeString(now.toLocaleTimeString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }));
        
        const rawDate = now.toLocaleDateString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        setDateString(`Buenos Aires, AR | ${rawDate}`);
      } catch (e) {
        setTimeString(now.toLocaleTimeString());
        setDateString(now.toLocaleDateString());
      }
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Block viewing if Google Sign In is not completed (placed after all hook declarations)
  if (pendingRegistrationUser) {
    return <SocioRegistrationForm />;
  }

  if (loading && googleUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" id="app-loading-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin"></div>
          <p className="text-slate-600 font-semibold text-xs font-sans">Cargando datos del gimnasio...</p>
        </div>
      </div>
    );
  }

  if (!googleUser) {
    return <GoogleSignIn />;
  }

  // Check if Google-logged-in user is a SOCIO and is pending authorization
  const socioAsociado = clientes.find(c => c.activo && c.email.toLowerCase().trim() === googleUser.email.toLowerCase().trim());
  const esPendiente = googleUser.role === 'SOCIO' && socioAsociado && socioAsociado.autorizado === false;

  if (esPendiente) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-xs select-none relative" id="pending-authorization-wrapper">
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
          {/* Decorative Background Gradient Element */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />
          
          {/* Header Section */}
          <div className="mb-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 shadow-sm animate-pulse">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Acceso en Revisión</h2>
            <p className="text-slate-500 text-xs mt-1">Tu cuenta requiere autorización de un administrador</p>
          </div>

          {/* User Details Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 flex items-center gap-3 text-left">
            {googleUser.picture ? (
              <img 
                src={googleUser.picture} 
                alt={googleUser.name} 
                className="w-12 h-12 rounded-full border border-slate-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white font-extrabold uppercase text-sm">
                {googleUser.name[0]}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="font-bold text-slate-800 text-xs truncate">{googleUser.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{googleUser.email}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Pendiente de Autorización
              </span>
            </div>
          </div>

          {/* Info message */}
          <div className="text-slate-600 text-xs leading-relaxed space-y-3 mb-8">
            <p>
              ¡Hola, <strong>{googleUser.name.split(' ')[0]}</strong>! Tus datos de inicio de sesión de Google se han guardado correctamente en nuestra base de datos.
            </p>
            <p className="bg-amber-50/50 border border-amber-100/50 p-3 rounded-lg text-[11px] text-amber-800 text-center">
              Por motivos de seguridad, un <strong>Administrador</strong> del gimnasio debe verificar y autorizar tu ficha antes de que puedas reservar clases, ver horarios y realizar pagos.
            </p>
          </div>

            {/* Actions */}
            <div className="space-y-3">
              <button 
                onClick={signOutGoogle}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer border border-transparent"
              >
                <X className="w-4 h-4" />
                Cerrar Sesión Google
              </button>
              <p className="text-[10px] text-slate-400 mt-2">
                ¿Eres profesor o admin? Cierra sesión e ingresa con tu correo autorizado.
              </p>
            </div>
        </div>
      </div>
    );
  }

  const ALL_TAB_ITEMS = [
    { id: 'DASHBOARD' as TabID, label: 'Dashboard', icon: LayoutDashboard, desc: 'Panel de Control General', roles: ['ADMIN', 'OPERADOR'] },
    { id: 'CLIENTES' as TabID, label: 'Socios', icon: Users, desc: 'Gestión Integral de Socios', roles: ['ADMIN', 'OPERADOR', 'PROFESOR'] },
    { id: 'PLANES' as TabID, label: 'Planes', icon: Dribbble, desc: 'Control de Membresías y Planes', roles: ['ADMIN', 'OPERADOR', 'PROFESOR'] },
    { id: 'TURNOS' as TabID, label: 'Cupos y Turnos', icon: CalendarRange, desc: 'Grilla de Horarios y Reservas', roles: ['ADMIN', 'OPERADOR', 'PROFESOR'] },
    { id: 'PAGOS' as TabID, label: 'Pagos e Ingresos', icon: Landmark, desc: 'Libro Contable y Facturación', roles: ['ADMIN', 'OPERADOR'] },
    { id: 'NOVEDADES' as TabID, label: 'Novedades', icon: Megaphone, desc: 'Gestión de Comunicados y Novedades', roles: ['ADMIN', 'OPERADOR', 'PROFESOR'] },
    { id: 'MOROSIDAD' as TabID, label: 'Control de Mora', icon: ShieldAlert, desc: 'Seguimiento de Deudas', roles: ['ADMIN', 'OPERADOR'] },
    { id: 'PROYECCIONES' as TabID, label: 'Previsiones', icon: LineChart, desc: 'Proyecciones Financieras', roles: ['ADMIN'] },
    { id: 'AUDITORIA' as TabID, label: 'Auditoría DB', icon: ShieldCheck, desc: 'Registro de Operaciones de Base', roles: ['ADMIN'] },
  ];

  const TAB_ITEMS = ALL_TAB_ITEMS.filter(t => t.roles.includes(rolActivo));

  // Si el tab activo no es accesible para el rol actual, redirigir al primero permitido
  const validTabIds = TAB_ITEMS.map(t => t.id);
  const resolvedActiveTab = validTabIds.includes(activeTab) ? activeTab : (TAB_ITEMS[0]?.id ?? 'CLIENTES');

  const currentTab = TAB_ITEMS.find(t => t.id === resolvedActiveTab) || TAB_ITEMS[0];

  const renderActiveTabContent = () => {
    switch (resolvedActiveTab) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            setActiveTab={(tab) => setActiveTab(tab as TabID)} 
            setOpenTurnosModalForId={setOpenTurnosModalId}
            onStartAuthorization={handleStartAuthorization}
          />
        );
      case 'CLIENTES':
        return (
          <ClientesCRUD 
            openTurnosModalForId={openTurnosModalId}
            setOpenTurnosModalForId={setOpenTurnosModalId}
            onStartAuthorization={handleStartAuthorization}
          />
        );
      case 'PLANES':
        return <PlanesPricing />;
      case 'TURNOS':
        return <TurnosGrid />;
      case 'PAGOS':
        return (
          <PagosLog 
            showAddPagoModal={showAddPagoModal} 
            setShowAddPagoModal={setShowAddPagoModal} 
          />
        );
      case 'NOVEDADES':
        return <NovedadesCRUD />;
      case 'MOROSIDAD':
        return <MorososControl />;
      case 'PROYECCIONES':
        return <ProyeccionesTab />;
      case 'AUDITORIA':
        return <AuditLogView />;
      default:
        return (
          <Dashboard 
            setActiveTab={(tab) => setActiveTab(tab as TabID)} 
            setOpenTurnosModalForId={setOpenTurnosModalId}
            onStartAuthorization={handleStartAuthorization}
          />
        );
    }
  };

  if (rolActivo === 'SOCIO') {
    return (
      <>
        <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased" id="app-wrapper-socio">
          <RoleSwitcher />
          <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
            <ErrorBoundary section="el Panel del Socio">
              <SocioPanel />
            </ErrorBoundary>
          </div>
        </div>
        {paymentSuccessData && (
          <PaymentSuccessModal 
            data={paymentSuccessData} 
            onClose={() => setPaymentSuccessData(null)} 
          />
        )}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900 font-sans antialiased" id="app-wrapper">
      
      {/* MOBILE HEADER BAR */}
      <div className="lg:hidden bg-white text-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-200 z-50 sticky top-0 shadow-xs">
        <div className="flex items-center gap-2">
          <img src={logoKaha} alt="KAHA GYM" className="w-8 h-8 rounded-xl object-contain shrink-0" />
          <h1 className="font-display text-zinc-900 font-bold tracking-tight text-sm">
            KAHA GYM <span className="text-[10px] text-zinc-400 font-semibold block -mt-1 uppercase tracking-widest">
              {rolActivo === 'PROFESOR' ? 'Panel Profesores' : 'Administración'}
            </span>
          </h1>
        </div>
        
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle navigation drawer"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* LEFT NAVIGATION SIDEBAR (GEOMETRIC CLEAN LIGHT BACKGROUND) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-[260px] bg-white text-slate-600 p-6 flex flex-col justify-between border-r border-slate-200 transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:h-screen lg:overflow-y-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} id="app-sidebar-nav">
        
        <div className="flex flex-col gap-6">
          {/* Logo / Brand */}
          <div className="mb-2 hidden lg:block">
            <div className="flex items-center gap-3">
              <img src={logoKaha} alt="KAHA GYM" className="w-9 h-9 rounded-xl object-contain shrink-0" />
              <div>
                <h1 className="font-display text-zinc-900 text-base font-bold tracking-tight leading-none" id="sidebar-logo-heading">
                  KAHA GYM
                </h1>
                <span className="text-zinc-400 text-[10px] font-semibold tracking-widest block uppercase mt-0.5" id="sidebar-logo-subtitle">
                  {rolActivo === 'PROFESOR' ? 'Panel Profesores' : 'Panel de Control'}
                </span>
              </div>
            </div>
          </div>

          {/* Nav List */}
          <nav className="flex flex-col gap-1" id="sidebar-navigation-items">
            {TAB_ITEMS.map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              const pendingCount = item.id === 'CLIENTES' 
                ? clientes.filter(c => c.activo && c.autorizado === false).length 
                : 0;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  title={item.desc}
                  className={`
                    w-full px-4 py-3 rounded-full flex items-center gap-3 text-xs font-semibold transition-all duration-150 outline-none cursor-pointer
                    ${isSelected
                      ? 'bg-zinc-900 text-white border border-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent'
                    }
                  `}
                  id={`tab-btn-sidebar-${item.id.toLowerCase()}`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isSelected ? 'text-lime-300' : 'text-zinc-400'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {pendingCount > 0 && (
                    <span className="bg-amber-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full animate-pulse tracking-wide shadow-sm">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* LOGGED CONTEXT CARD (Dynamic Google user) */}
        <div className="pt-3 border-t border-slate-200 mt-6 flex flex-col gap-2.5" id="sidebar-user-context-card">
          <div className="flex items-center gap-2.5">
            {googleUser?.picture ? (
              <img 
                src={googleUser.picture} 
                alt={googleUser.name} 
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs flex items-center justify-center border border-indigo-100">
                {googleUser?.name ? googleUser.name.slice(0, 2).toUpperCase() : 'G'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-800 truncate leading-none">
                {googleUser?.name || 'Usuario Google'}
              </p>
              <p className="text-[9px] text-slate-500 font-mono truncate mt-1 leading-none" title={googleUser?.email}>
                {googleUser?.email || 'N/A'}
              </p>
              {rolActivo === 'PROFESOR' && (
                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-violet-700 text-[8px] font-bold uppercase tracking-wide">
                  👩‍🏫 Profesor/a
                </span>
              )}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Verificado con Google SSO"></div>
          </div>
          
          <button 
            onClick={signOutGoogle}
            className="w-full py-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
            id="sidebar-signout-trigger-google"
          >
            Cerrar Sesión Google
          </button>
        </div>
      </aside>

      {/* BACKDROP FOR MOBILE DRAWER */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-[35] lg:hidden animate-fade-in"
        ></div>
      )}

      {/* RIGHT SIDE MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen" id="main-content-flow">
        
        {/* Floating Top Header: DB switcher & Roles */}
        <RoleSwitcher />

        {/* GEOMETRIC THEMED SUB-HEADER (Matching the clean header element) */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-row items-center justify-between gap-3 shadow-xs" id="sub-header-container">
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <img src={logoKaha} alt="KAHA GYM Logo" className="w-8 h-8 rounded-lg object-contain shrink-0 hidden sm:block shadow-2xs" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-0.5 font-mono">
                Entorno Seguro
              </span>
              <span className="font-display text-base sm:text-xl font-bold text-zinc-900 flex items-center gap-2 tracking-tight truncate" id="current-tab-label-header">
                {currentTab.desc}
              </span>
            </div>
          </div>

          {/* BELL NOTIFICATIONS TRIGGER */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                if (!showNotificationsDropdown) {
                  // Optional: mark as read automatically, or let the user click "Marcar leídas"
                }
              }}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-150 cursor-pointer outline-hidden border border-slate-200/50"
              id="admin-notifications-bell-trigger"
              aria-label="Notificaciones"
            >
              <Bell className="w-4.5 h-4.5" />
              {notificaciones.filter(n => !n.leido).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full border border-white animate-pulse"></span>
              )}
            </button>

            {showNotificationsDropdown && (
              <>
                {/* Backdrop click closer */}
                <div className="fixed inset-0 z-40" onClick={() => setShowNotificationsDropdown(false)}></div>
                
                {/* Dropdown Container */}
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 font-sans animate-scale-in max-h-[420px] overflow-y-auto" id="admin-notifications-dropdown">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-800">Alertas de Cobro ({notificaciones.filter(n => !n.leido).length} nuevas)</h4>
                    {notificaciones.length > 0 && (
                      <button
                        onClick={() => {
                          marcarNotificacionesLeidas();
                        }}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        Marcar todas leídas
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {notificaciones.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No hay notificaciones de cobro registradas.
                      </div>
                    ) : (
                      notificaciones.map(notif => {
                        const dateFormatted = new Date(notif.fecha).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) + ' - ' + new Date(notif.fecha).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short'
                        });

                        return (
                          <div 
                            key={notif.id} 
                            className={`flex justify-between items-start p-2.5 rounded-xl border text-[11px] leading-relaxed transition-all ${
                              notif.leido 
                                ? 'bg-slate-50 border-slate-100 text-slate-500' 
                                : 'bg-emerald-50/50 border-emerald-100 text-slate-800 font-medium shadow-2xs'
                            }`}
                          >
                            <div className="space-y-1 pr-2 flex-1 text-left">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${notif.leido ? 'bg-slate-300' : 'bg-emerald-500'}`}></span>
                                <span className="font-bold text-slate-700">{notif.titulo}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{notif.mensaje}</p>
                              <span className="text-[8px] text-slate-400 block font-mono font-medium">{dateFormatted}</span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminarNotificacion(notif.id);
                              }}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-slate-100 cursor-pointer shrink-0"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto flex flex-col justify-between">
          <ErrorBoundary key={activeTab} section={currentTab.label}>
            {renderActiveTabContent()}
          </ErrorBoundary>

          {/* FOOTER GENERAL */}
          <Footer />
        </main>
      </div>

      {paymentSuccessData && (
        <PaymentSuccessModal 
          data={paymentSuccessData} 
          onClose={() => setPaymentSuccessData(null)} 
        />
      )}
      {authorizingClientId && (
        <AuthorizeClientModal 
          clientId={authorizingClientId}
          onClose={() => {
            setAuthorizingClientId(null);
            setClientToOpenTurnosAfterAuth(null);
          }}
          onAuthorized={() => {
            setAuthorizingClientId(null);
            if (clientToOpenTurnosAfterAuth) {
              setOpenTurnosModalId(clientToOpenTurnosAfterAuth);
              setClientToOpenTurnosAfterAuth(null);
            }
          }}
        />
      )}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

interface PaymentSuccessModalProps {
  data: { clientName: string; amount: number };
  onClose: () => void;
}

function PaymentSuccessModal({ data, onClose }: PaymentSuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
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

        <h3 className="text-2xl font-black text-slate-800 tracking-tight">¡Pago Aprobado!</h3>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Tu transacción se ha procesado con éxito a través de Mercado Pago.
        </p>

        {/* Receipt display card */}
        <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 my-6 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-mono uppercase">Socio</span>
            <span className="font-bold text-slate-800">{data.clientName}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-mono uppercase">Medio de Pago</span>
            <span className="font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 text-[10px]">
              MERCADO PAGO
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-mono uppercase">Monto Abonado</span>
            <span className="font-black text-emerald-700 text-sm font-mono">
              ${data.amount.toLocaleString('es-AR')} ARS
            </span>
          </div>
          <div className="flex justify-between items-center text-xs pt-2.5 border-t border-slate-200">
            <span className="text-slate-400 font-mono uppercase">Estado Cuenta</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[9px] border border-emerald-100 uppercase tracking-wide">
              ✓ Al Día
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all shadow-md active:scale-98 cursor-pointer relative z-10"
        >
          Entendido, gracias
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: any[];
  onClose: (id: string) => void;
}

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2 sm:gap-3 max-w-[calc(100vw-1.5rem)] sm:max-w-sm w-full pointer-events-none" id="toasts-wrapper-overlay">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: any;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const isDelete = toast.type === 'delete';
  const isError = toast.type === 'error';
  const isAdd = toast.type === 'add';

  let bgColor = 'bg-white';
  let borderColor = 'border-slate-200';
  let textColor = 'text-slate-800';
  let Icon = CheckCircle2;
  let iconColor = 'text-emerald-600 bg-emerald-50';

  if (isDelete) {
    bgColor = 'bg-white';
    borderColor = 'border-rose-200';
    textColor = 'text-slate-800';
    Icon = Trash2;
    iconColor = 'text-rose-500 bg-rose-50';
  } else if (isError) {
    bgColor = 'bg-white';
    borderColor = 'border-amber-200';
    textColor = 'text-slate-800';
    Icon = AlertTriangle;
    iconColor = 'text-amber-500 bg-amber-50';
  } else if (isAdd) {
    bgColor = 'bg-white';
    borderColor = 'border-lime-200';
    textColor = 'text-slate-800';
    Icon = CheckCircle2;
    iconColor = 'text-lime-600 bg-lime-50';
  }

  return (
    <div className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl border ${borderColor} ${bgColor} shadow-xl animate-slide-in-right transition-all duration-300 w-full`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className={`text-xs font-semibold ${textColor}`}>{toast.message}</p>
      </div>
      <button 
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

