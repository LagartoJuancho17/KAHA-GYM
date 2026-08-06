// src/components/SocioPanel/SocioPanel.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { 
  AlertTriangle, Megaphone, Award, QrCode, Barcode, CreditCard, 
  Loader2, Home, User, CalendarDays, Receipt, LogOut, PartyPopper, X
} from 'lucide-react';

import { SocioHeader } from './SocioHeader';
import { SocioReservas } from './SocioReservas';
import { SocioCalendario } from './SocioCalendario';
import { SocioPerfil } from './SocioPerfil';
import { SocioPagos } from './SocioPagos';
import { SocioNovedades } from './SocioNovedades';
import { SocioPaymentChoiceModal } from './SocioPaymentChoiceModal';
import { Footer } from '../Common/Footer';

export const SocioPanel: React.FC = () => {
  const { 
    clientes, planes, selectedSocioId, googleUser,
    novedades, setRolActivo, signOutGoogle, loading
  } = useGym();

  const [activeTabSection, setActiveTabSection] = useState<'HOME' | 'PERFIL' | 'RESERVAS' | 'PAGOS' | 'NOVEDADES'>('HOME');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mercado Pago states
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentChoiceModal, setShowPaymentChoiceModal] = useState(false);
  // Feature 3: Month-start payment reminder popup
  const [showMonthStartPopup, setShowMonthStartPopup] = useState(false);

  // Find simulated/logged in user
  const socio = useMemo(() => {
    return clientes.find(c => c.id === selectedSocioId && c.activo) || null;
  }, [clientes, selectedSocioId]);

  // Plan matching
  const planSocio = useMemo(() => {
    if (!socio) return null;
    return planes.find(p => p.id === socio.plan_id) || null;
  }, [planes, socio]);

  const hasDebt = useMemo(() => {
    if (!socio) return false;
    return socio.deuda_acumulada > 0 || socio.estado === 'CON_DEUDA' || socio.estado === 'MOROSO';
  }, [socio]);

  // Fix 2b: Current month hasn't been paid yet
  const currentCalendarMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const isCurrentMonthUnpaid = useMemo(() => {
    if (!socio) return false;
    return !socio.ultimo_mes_pagado || socio.ultimo_mes_pagado < currentCalendarMonth;
  }, [socio, currentCalendarMonth]);

  const canPayAdvance = useMemo(() => {
    if (!socio || hasDebt) return false;
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (lastDay - now.getDate()) < 5;
  }, [socio, hasDebt]);

  const canPay = hasDebt || canPayAdvance || isCurrentMonthUnpaid;

  // Feature 3: Show month-start popup when current month is unpaid
  // Controlled via localStorage so user can dismiss it and it won't re-show in same session
  useEffect(() => {
    if (!socio || !isCurrentMonthUnpaid) return;
    const dismissedKey = `kaha-month-popup-dismissed-${currentCalendarMonth}-${socio.id}`;
    const wasDismissed = localStorage.getItem(dismissedKey) === 'true';
    if (!wasDismissed) {
      // Small delay so it doesn't flash on initial load
      const timer = setTimeout(() => setShowMonthStartPopup(true), 800);
      return () => clearTimeout(timer);
    }
  }, [socio, isCurrentMonthUnpaid, currentCalendarMonth]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-3xl" id="socio-panel-loading">
        <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-emerald-600 animate-spin"></div>
        <p className="text-slate-500 font-semibold text-xs mt-4">Sincronizando información de membresía...</p>
      </div>
    );
  }

  if (!socio) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center max-w-md mx-auto my-12 shadow-sm relative font-sans overflow-hidden" id="socio-panel-no-selected">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-400 via-amber-400 to-rose-500" />
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-base font-bold text-slate-800 tracking-tight">Sin sesión de socio activa</h3>
        <p className="text-slate-500 text-xs mt-3 leading-relaxed max-w-xs mx-auto">
          Iniciá sesión con tu cuenta de Google o seleccioná un socio desde el selector en la barra superior para ver tu panel.
        </p>
        <div className="mt-8 flex flex-col gap-2.5">
          {googleUser && (
            <button 
              onClick={signOutGoogle}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-transparent shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión Google
            </button>
          )}
          {googleUser?.role !== 'SOCIO' && (
            <button 
              onClick={() => setRolActivo('ADMIN')}
              className="w-full py-2 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200 shadow-sm"
            >
              Volver a Vista Admin
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none font-sans" id="socio-premium-webapp">
      {/* SaaS WEBAPP TOP NAVIGATION HEADER */}
      <SocioHeader 
        activeTabSection={activeTabSection}
        setActiveTabSection={setActiveTabSection}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        isDropdownOpen={isDropdownOpen}
        setIsDropdownOpen={setIsDropdownOpen}
        socio={socio}
      />

      {/* ERROR & SUCCESS STATUS BANNER */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl font-semibold flex items-center gap-2.5 animate-flash-success shadow-xs text-xs">
          <span className="w-5 h-5 text-emerald-600 shrink-0 bg-emerald-100 p-1 rounded-full border border-emerald-200 flex items-center justify-center">✓</span>
          <span className="font-sans leading-none">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl font-semibold flex items-center gap-2.5 shadow-xs text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 bg-rose-100 p-1 rounded-full border border-rose-200" />
          <span className="font-sans leading-none">{errorMessage}</span>
        </div>
      )}

      {/* RENDER DYNAMIC SECTION BASED ON ACTIVE SELECTION */}
      {activeTabSection === 'HOME' && (
        <div className="space-y-6 animate-fade-in" id="socio-section-home">
          {/* Novedades preview */}
          {novedades.length > 0 && (
            <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-3xl p-6.5 relative overflow-hidden shadow-md space-y-4" id="home-novedades-preview">
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
                  className="text-[10px] font-bold text-white bg-emerald-600/80 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl hover:bg-emerald-500/95 transition-all cursor-pointer border-none"
                >
                  Ver Cartelera Completa
                </button>
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {novedades.slice(0, 2).map((nov) => (
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
                ))}
              </div>
            </div>
          )}

          {/* Reservas list inside Home */}
          <SocioReservas 
            socio={socio} 
            setActiveTabSection={setActiveTabSection}
            setSuccessMessage={setSuccessMessage}
            setErrorMessage={setErrorMessage}
          />

          {/* Bento grid and member info details */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6" id="socio-bento-dashboard">
            {/* Card B: Plan Vigente — now FIRST */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px] shadow-sm hover:border-slate-300 transition-all text-xs" id="socio-card-plan">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded-full tracking-wider uppercase font-bold">
                    Plan Vigente
                  </span>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight mt-2.5">
                    {planSocio ? planSocio.nombre : 'Abono Individual'}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-semibold">
                    {planSocio ? `Gimnasio completo con acceso a ${planSocio.dias_por_semana} clases semanales.` : 'Sin especificación de plan contratado.'}
                  </p>
                  {planSocio && (
                    <p className="font-mono text-emerald-700 font-extrabold text-[15px] mt-2.5">
                      ${planSocio.precio.toLocaleString('es-AR')} ARS <span className="text-[10px] text-slate-400 font-normal">/mes</span>
                    </p>
                  )}
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sky-600">
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

              {canPay && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    onClick={() => setShowPaymentChoiceModal(true)}
                    disabled={isPaying}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-xs border-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPaying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>
                      {isPaying 
                        ? 'Procesando Pago...' 
                        : hasDebt 
                        ? 'Pagar Deuda Pendiente (Mercado Pago / Transferencia)' 
                        : isCurrentMonthUnpaid
                        ? `Abonar mes de ${new Date().toLocaleString('es-AR', { month: 'long' })} (Mercado Pago / Transferencia)`
                        : 'Pagar por Adelantado - Próximo Mes (Mercado Pago / Transferencia)'}
                    </span>
                  </button>
                  {paymentError && (
                    <p className="text-[10px] text-rose-600 font-semibold mt-1 text-center bg-rose-50 border border-rose-100 p-1.5 rounded-lg">
                      {paymentError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Card A: Membresía / Credential Pass — now SECOND */}
            <div className="bg-gradient-to-tr from-slate-50 via-white to-emerald-50/20 border border-slate-200 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px] shadow-sm transition-all hover:border-emerald-400 group text-xs" id="socio-card-member">
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-emerald-500 to-sky-400 rounded-full blur-2xl opacity-10 group-hover:opacity-15 transition-opacity -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200/50 text-emerald-700 font-mono text-[8px] uppercase tracking-wider font-extrabold">
                    <Award className="w-3 h-3" />
                    Membresía KAHA
                  </div>
                  <h2 className="text-sm font-black text-slate-800 mt-2 tracking-tight">CREDENTIAL PASS</h2>
                </div>
                <div className="text-slate-400 group-hover:text-emerald-600 transition-colors">
                  <QrCode className="w-7 h-7" />
                </div>
              </div>

              <div className="py-2">
                <p className="text-[9px] text-slate-400 font-mono select-all tracking-wider">MEMBER NO: {socio.id.toUpperCase()}</p>
                <p className="text-lg font-black text-slate-800 tracking-wider uppercase mt-0.5">{socio.nombre} {socio.apellido}</p>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${socio.estado === 'ACTIVO' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                    {socio.estado === 'ACTIVO' ? 'ACTIVO / ACCESO HABILITADO' : 'SUSPENDIDO'}
                  </span>
                </div>
                <div className="opacity-60 group-hover:opacity-90 transition-opacity flex items-center shrink-0">
                  <Barcode className="w-14 h-6 text-slate-500" />
                </div>
              </div>
            </div>
          </section>

          {/* Soporte card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5" id="socio-soporte-home">
            <div className="flex-1 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-mono text-[8px] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Soporte KAHA GYM
              </div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight">¿Necesitás ayuda o cambiar un turno fijo?</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium max-w-lg">
                Nuestro equipo está disponible para resolver cualquier consulta sobre tu membresía, turnos o pagos. Escribinos directamente por WhatsApp.
              </p>
            </div>
            <a
              href={`https://wa.me/541178402722?text=${encodeURIComponent(`Hola KAHA GYM, soy el socio ${socio.nombre} ${socio.apellido}. Me contacto desde mi portal de cliente.`)}`}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
              Conversar por WhatsApp
            </a>
          </div>
        </div>
      )}

      {activeTabSection === 'PERFIL' && (
        <SocioPerfil 
          socio={socio}
          setShowPaymentChoiceModal={setShowPaymentChoiceModal}
          isPaying={isPaying}
          paymentError={paymentError}
          setSuccessMessage={setSuccessMessage}
        />
      )}

      {activeTabSection === 'RESERVAS' && (
        <SocioCalendario 
          socio={socio}
          setSuccessMessage={setSuccessMessage}
          setErrorMessage={setErrorMessage}
        />
      )}

      {activeTabSection === 'PAGOS' && (
        <SocioPagos socio={socio} />
      )}

      {activeTabSection === 'NOVEDADES' && (
        <SocioNovedades />
      )}

      {/* FOOTER GENERAL */}
      <Footer />

      {/* Floating WhatsApp Button */}
      <div className="fixed bottom-24 right-5 z-50 flex items-center gap-2 group text-xs" id="floating-social-container">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 text-slate-800 px-3 py-1.5 rounded-2xl shadow-lg text-[10.5px] font-bold tracking-tight opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none select-none font-sans flex items-center gap-2 border-emerald-100 mr-1">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>¿Consultas? Chateá con nosotros</span>
        </div>
        
        <a
          href={`https://wa.me/541178402722?text=${encodeURIComponent(`Hola KAHA GYM, soy el socio ${socio.nombre} ${socio.apellido}. Me contacto desde mi portal de cliente.`)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center w-13 h-13 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/35 transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-hidden relative shrink-0"
          aria-label="Contactar por WhatsApp"
          id="floating-whatsapp-btn"
        >
          <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping opacity-60 pointer-events-none"></span>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" className="bi bi-whatsapp relative z-10 text-white" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
          </svg>
        </a>
      </div>

      {/* BOTTOM NAV BAR */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-white/98 backdrop-blur-xl border-t border-slate-200 shadow-[0_-2px_20px_rgba(0,0,0,0.06)] flex items-center justify-around px-1"
        id="socio-bottom-navbar"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', height: '64px' }}
      >
        {/* CARTELERA */}
        <button
          onClick={() => setActiveTabSection('NOVEDADES')}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-[52px] border-none bg-transparent relative"
          id="bottom-nav-novedades"
        >
          <Megaphone className={`w-5 h-5 transition-colors ${activeTabSection === 'NOVEDADES' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className={`text-[9px] font-bold uppercase tracking-wider font-sans transition-colors ${activeTabSection === 'NOVEDADES' ? 'text-emerald-600' : 'text-slate-400'}`}>Cartelera</span>
          {activeTabSection === 'NOVEDADES' && <span className="absolute bottom-0 inset-x-3 h-0.5 bg-emerald-500 rounded-full" />}
          {novedades.some(n => n.destacado) && activeTabSection !== 'NOVEDADES' && (
            <span className="absolute top-1.5 right-2.5 w-2 h-2 bg-amber-500 rounded-full border border-white"></span>
          )}
        </button>

        {/* CONTROL DE CUPOS (RESERVAS) */}
        <button
          onClick={() => setActiveTabSection('RESERVAS')}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-[52px] border-none bg-transparent relative"
          id="bottom-nav-reservas"
        >
          <CalendarDays className={`w-5 h-5 transition-colors ${activeTabSection === 'RESERVAS' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className={`text-[9px] font-bold uppercase tracking-wider font-sans transition-colors ${activeTabSection === 'RESERVAS' ? 'text-emerald-600' : 'text-slate-400'}`}>Cupos</span>
          {activeTabSection === 'RESERVAS' && <span className="absolute bottom-0 inset-x-3 h-0.5 bg-emerald-500 rounded-full" />}
        </button>

        {/* HOME CENTRAL BUTTON */}
        <button
          onClick={() => setActiveTabSection('HOME')}
          className="flex flex-col items-center gap-0.5 -mt-6 cursor-pointer border-none bg-transparent"
          id="bottom-nav-home"
          aria-label="Ir al inicio"
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 ${
            activeTabSection === 'HOME'
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 ring-4 ring-emerald-500/25 shadow-emerald-500/40'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-600/30'
          }`}>
            <Home className="w-6 h-6 text-white" />
          </div>
          <span className={`text-[9px] font-black uppercase tracking-wider mt-0.5 font-sans transition-colors ${
            activeTabSection === 'HOME' ? 'text-emerald-600' : 'text-slate-500'
          }`}>Home</span>
        </button>

        {/* PLAN VIGENTE (PAGOS) */}
        <button
          onClick={() => setActiveTabSection('PAGOS')}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-[52px] border-none bg-transparent relative"
          id="bottom-nav-pagos"
        >
          <Receipt className={`w-5 h-5 transition-colors ${activeTabSection === 'PAGOS' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className={`text-[9px] font-bold uppercase tracking-wider font-sans transition-colors ${activeTabSection === 'PAGOS' ? 'text-emerald-600' : 'text-slate-400'}`}>Plan</span>
          {activeTabSection === 'PAGOS' && <span className="absolute bottom-0 inset-x-3 h-0.5 bg-emerald-500 rounded-full" />}
        </button>

        {/* MEMBRESÍA (PERFIL) */}
        <button
          onClick={() => setActiveTabSection('PERFIL')}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer min-w-[52px] border-none bg-transparent relative"
          id="bottom-nav-perfil"
        >
          <User className={`w-5 h-5 transition-colors ${activeTabSection === 'PERFIL' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className={`text-[9px] font-bold uppercase tracking-wider font-sans transition-colors ${activeTabSection === 'PERFIL' ? 'text-emerald-600' : 'text-slate-400'}`}>Membresía</span>
          {activeTabSection === 'PERFIL' && <span className="absolute bottom-0 inset-x-3 h-0.5 bg-emerald-500 rounded-full" />}
        </button>
      </nav>

      {/* Bottom navbar spacing */}
      <div className="h-20" aria-hidden="true" />

      {/* CHOICE MODAL FOR PAYMENT METHOD */}
      {showPaymentChoiceModal && (
        <SocioPaymentChoiceModal 
          socio={socio}
          onClose={() => setShowPaymentChoiceModal(false)}
          setPaymentError={setPaymentError}
          isPaying={isPaying}
          setIsPaying={setIsPaying}
        />
      )}

      {/* FEATURE 3: MONTH-START PAYMENT REMINDER POPUP */}
      {showMonthStartPopup && socio && isCurrentMonthUnpaid && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in font-sans"
          id="month-start-popup-overlay"
        >
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-scale-up">
            {/* Decorative top gradient */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 rounded-t-3xl" />
            
            {/* Close button */}
            <button
              onClick={() => {
                setShowMonthStartPopup(false);
                const dismissedKey = `kaha-month-popup-dismissed-${currentCalendarMonth}-${socio.id}`;
                localStorage.setItem(dismissedKey, 'true');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-7 pt-8 space-y-5">
              {/* Icon + heading */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                  <PartyPopper className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest">
                    ¡Nuevo mes!
                  </p>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5 capitalize">
                    Ya empezó {new Date().toLocaleString('es-AR', { month: 'long' })} 🎉
                  </h3>
                </div>
              </div>

              {/* Body */}
              <p className="text-slate-600 text-sm leading-relaxed font-sans">
                Ya comenzó el nuevo mes. Podés abonar tu cuota ahora para tener todo en orden y seguir disfrutando de tus clases sin interrupciones.
              </p>

              {/* CTAs */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={() => {
                    setShowMonthStartPopup(false);
                    setShowPaymentChoiceModal(true);
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-3 px-5 rounded-2xl text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer shadow-md shadow-emerald-500/30 border-none"
                  id="month-popup-pay-btn"
                >
                  <CreditCard className="w-4.5 h-4.5" />
                  Ir a abonar ahora →
                </button>
                <button
                  onClick={() => {
                    setShowMonthStartPopup(false);
                    const dismissedKey = `kaha-month-popup-dismissed-${currentCalendarMonth}-${socio.id}`;
                    localStorage.setItem(dismissedKey, 'true');
                  }}
                  className="w-full py-2.5 px-5 rounded-2xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-all cursor-pointer border border-slate-200 bg-transparent"
                  id="month-popup-dismiss-btn"
                >
                  Continuar sin pagar aún
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};
