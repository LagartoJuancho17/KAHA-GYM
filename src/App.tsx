// src/App.tsx
import { useState, useEffect } from 'react';
import { GymProvider, useGym } from './GymContext';
import { RoleSwitcher } from './components/RoleSwitcher';
import { Dashboard } from './components/Dashboard';
import { ClientesCRUD } from './components/ClientesCRUD';
import { PlanesPricing } from './components/PlanesPricing';
import { TurnosGrid } from './components/TurnosGrid';
import { PagosLog } from './components/PagosLog';
import { MorososControl } from './components/MorososControl';
import { ProyeccionesTab } from './components/ProyeccionesTab';
import { AuditLogView } from './components/AuditLogView';
import { SocioPanel } from './components/SocioPanel';
import { GoogleSignIn } from './components/GoogleSignIn';
import { NovedadesCRUD } from './components/NovedadesCRUD';

import { 
  Dribbble, Landmark, LayoutDashboard, Users, CreditCard, 
  CalendarRange, ShieldAlert, LineChart, ShieldCheck,
  Menu, X, MapPin, Shield, Megaphone
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { rolActivo, googleUser, signOutGoogle } = useGym();

  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');

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
  if (!googleUser) {
    return <GoogleSignIn />;
  }

  const TAB_ITEMS = [
    { id: 'DASHBOARD' as TabID, label: 'Dashboard', icon: LayoutDashboard, desc: 'Panel de Control General' },
    { id: 'CLIENTES' as TabID, label: 'Socios', icon: Users, desc: 'Gestión Integral de Socios' },
    { id: 'PLANES' as TabID, label: 'Planes', icon: Dribbble, desc: 'Control de Membresías y Planes' },
    { id: 'TURNOS' as TabID, label: 'Cupos y Turnos', icon: CalendarRange, desc: 'Grilla de Horarios y Reservas' },
    { id: 'PAGOS' as TabID, label: 'Pagos e Ingresos', icon: Landmark, desc: 'Libro Contable y Facturación' },
    { id: 'NOVEDADES' as TabID, label: 'Novedades', icon: Megaphone, desc: 'Gestión de Comunicados y Novedades' },
    { id: 'MOROSIDAD' as TabID, label: 'Control de Mora', icon: ShieldAlert, desc: 'Seguimiento de Deudas' },
    { id: 'PROYECCIONES' as TabID, label: 'Previsiones', icon: LineChart, desc: 'Proyecciones Financieras' },
    { id: 'AUDITORIA' as TabID, label: 'Auditoría DB', icon: ShieldCheck, desc: 'Registro de Operaciones de Base' },
  ];

  const currentTab = TAB_ITEMS.find(t => t.id === activeTab) || TAB_ITEMS[0];

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return <Dashboard setActiveTab={(tab) => setActiveTab(tab as TabID)} />;
      case 'CLIENTES':
        return <ClientesCRUD />;
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
        return <Dashboard setActiveTab={(tab) => setActiveTab(tab as TabID)} />;
    }
  };

  if (rolActivo === 'SOCIO') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased" id="app-wrapper-socio">
        <RoleSwitcher />
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <SocioPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900 font-sans antialiased" id="app-wrapper">
      
      {/* MOBILE HEADER BAR */}
      <div className="lg:hidden bg-white text-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-200 z-50 sticky top-0 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <Shield className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <h1 className="text-slate-900 font-extrabold tracking-tight text-sm">
            KAHA GYM <span className="text-[10px] text-emerald-600 font-semibold block -mt-1">Administración</span>
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
          {/* Logo / Brand block matching the exact style of APOLO GYM */}
          <div className="mb-2 hidden lg:block">
            <h1 className="text-slate-900 text-xl font-extrabold tracking-tight" id="sidebar-logo-heading">
              KAHA GYM 
              <span className="text-emerald-600 text-xs font-semibold tracking-wider block uppercase mt-0.5" id="sidebar-logo-subtitle">
                Administración
              </span>
            </h1>
          </div>

          {/* Nav List */}
          <nav className="flex flex-col gap-1" id="sidebar-navigation-items">
            {TAB_ITEMS.map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full px-4 py-3 rounded-lg flex items-center gap-3 text-xs font-semibold transition-all duration-150 outline-hidden cursor-pointer
                    ${isSelected 
                      ? 'bg-emerald-50 text-emerald-850 border border-emerald-100 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }
                  `}
                  id={`tab-btn-sidebar-${item.id.toLowerCase()}`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
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
                className="w-9 h-9 rounded-full object-cover border border-slate-205"
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
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Verificado con Google SSO"></div>
          </div>
          
          <button 
            onClick={signOutGoogle}
            className="w-full py-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-655 border border-slate-200 hover:border-red-200 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
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
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-35 lg:hidden animate-fade-in"
        ></div>
      )}

      {/* RIGHT SIDE MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen" id="main-content-flow">
        
        {/* Floating Top Header: DB switcher & Roles */}
        <RoleSwitcher />

        {/* GEOMETRIC THEMED SUB-HEADER (Matching the clean header element) */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs" id="sub-header-container">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-0.5 font-mono">
              Entorno Seguro
            </span>
            <span className="text-base font-bold text-slate-800 flex items-center gap-2 tracking-tight" id="current-tab-label-header">
              {currentTab.desc}
            </span>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderActiveTabContent()}
        </main>
      </div>

    </div>
  );
}

