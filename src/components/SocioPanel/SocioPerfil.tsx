// src/components/SocioPanel/SocioPerfil.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { Mail, User, Phone, Check, MapPin, CreditCard, Info, Loader2, Camera } from 'lucide-react';

interface SocioPerfilProps {
  socio: Cliente;
  setShowPaymentChoiceModal: (show: boolean) => void;
  isPaying: boolean;
  paymentError: string | null;
  setSuccessMessage: (msg: string | null) => void;
}

export const SocioPerfil: React.FC<SocioPerfilProps> = ({
  socio,
  setShowPaymentChoiceModal,
  isPaying,
  paymentError,
  setSuccessMessage
}) => {
  const { planes } = useGym();
  const [phoneInput, setPhoneInput] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(socio.foto_url);

  useEffect(() => {
    setPhoneInput(socio.telefono || '');
    setFotoUrl(socio.foto_url);
  }, [socio]);

  const planSocio = useMemo(() => {
    return planes.find(p => p.id === socio.plan_id) || null;
  }, [planes, socio]);

  const handleSavePhone = () => {
    setIsEditingPhone(false);
    socio.telefono = phoneInput; // Update ref locally
    setSuccessMessage("Información de contacto guardada!");
    setTimeout(() => setSuccessMessage(null), 2550);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setFotoUrl(result);
      socio.foto_url = result;
      setSuccessMessage("¡Foto de perfil actualizada exitosamente!");
      setTimeout(() => setSuccessMessage(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="socio-section-perfil">
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.2),transparent_50%)]"></div>
          <div className="absolute bottom-3 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-mono text-[9px] uppercase tracking-wider font-extrabold shadow-sm">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span>Portal Autenticado</span>
          </div>
        </div>

        {/* Profile info block */}
        <div className="px-6 lg:px-8 pb-8 pt-0 relative" id="socio-profile-offset-header">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-10 relative z-10 border-b border-slate-100 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4.5">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-md border-4 border-white overflow-hidden">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt={`${socio.nombre} ${socio.apellido}`} className="w-full h-full object-cover" />
                  ) : (
                    <span>{socio.nombre[0]}</span>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 bg-slate-900 hover:bg-emerald-600 text-white p-1.5 rounded-full border-2 border-white cursor-pointer shadow-md transition-all group-hover:scale-110 flex items-center justify-center" title="Cambiar foto de perfil">
                  <Camera className="w-3.5 h-3.5" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                    {socio.nombre} {socio.apellido}
                  </h2>
                  <span className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                    Socio Activo
                  </span>
                  <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
                    {socio.codigo_socio || socio.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{socio.email}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Grid details */}
          <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs font-sans">
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
                          className={`w-full text-xs pl-10 pr-3.5 py-3 rounded-xl outline-hidden font-mono transition-all bg-white border ${
                            isEditingPhone 
                              ? 'border-emerald-400 text-slate-800 shadow-inner' 
                              : 'border-slate-200 text-slate-500 cursor-not-allowed bg-slate-100/85'
                          }`}
                        />
                      </div>
                      {isEditingPhone ? (
                        <button
                          onClick={handleSavePhone}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4.5 py-3 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 border-none"
                        >
                          <Check className="w-4 h-4" />
                          Guardar
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsEditingPhone(true)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 font-bold px-4.5 py-3 rounded-xl text-xs transition-colors cursor-pointer shrink-0 bg-white"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic leading-snug">
                      Indispensable para el envío automático de confirmaciones y alertas de disponibilidad por WhatsApp.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-3">Sede Registrada</h3>
                <a 
                  href="https://maps.app.goo.gl/H7dHcgqtfwbygpEY6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-2xl flex items-start gap-4 transition-all group block cursor-pointer"
                  title="Abrir ubicación en Google Maps"
                  id="socio-profile-maps-link"
                >
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-emerald-600 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                      KAHA Gimnasio - Sede Principal
                      <span className="text-[10px] text-emerald-600 font-mono font-normal underline">Abrir Maps ↗</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-semibold group-hover:text-slate-900">
                      Ramón L. Falcón 5330, Ciudad Autónoma de Buenos Aires, Argentina.
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1 font-mono">
                      Horarios: Lunes a Viernes 07:00 hs - 22:00 hs
                    </p>
                  </div>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-3">Condiciones de Membresía</h3>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                  <div className="p-5 space-y-3.5">
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold">Estado de Cuenta:</span>
                      <span className={`font-mono font-bold px-2.5 py-0.5 rounded text-[10px] ${
                        socio.estado === 'ACTIVO' 
                          ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' 
                          : 'bg-rose-50 border border-rose-100 text-rose-700'
                      }`}>
                        {socio.estado === 'ACTIVO' ? 'ACTIVO / AL DÍA' : 'CON DEUDA / INHABILITADO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold">Plan Asignado:</span>
                      <span className="font-bold text-slate-800 text-[11px]">
                        {planSocio ? planSocio.nombre : 'Plan KAHA Semanal'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold">Valor del Plan:</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {planSocio ? `$${planSocio.precio.toLocaleString('es-AR')} ARS` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold">Deuda Acumulada:</span>
                      <span className={`font-bold font-mono text-[11px] ${socio.deuda_acumulada > 0 ? 'text-rose-700 font-extrabold' : 'text-slate-800'}`}>
                        ${socio.deuda_acumulada.toLocaleString('es-AR')} ARS
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                      <span className="text-slate-500 font-semibold">ID Unico Cuenta:</span>
                      <span className="font-mono text-slate-500 text-[10px] select-all tracking-tight bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate">
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
                      <p className="text-[10px] text-rose-800 leading-relaxed font-semibold flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                        <span>
                          Registrás una deuda de ${socio.deuda_acumulada.toLocaleString('es-AR')} ARS. Podés abonar de forma directa y 100% segura mediante Mercado Pago con el botón ubicado en tu plan vigente.
                        </span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-emerald-800 leading-relaxed font-semibold flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                        <span>
                          Para solicitar cambios permanentes en el tipo de tu membresía o cancelaciones, por favor contactate con administración vía WhatsApp.
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {socio.deuda_acumulada > 0 && (
                <div className="pt-2 flex flex-col gap-2">
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
                    <span>{isPaying ? 'Procesando Pago...' : 'Pagar Cuota (Mercado Pago / Transferencia)'}</span>
                  </button>
                  {paymentError && (
                    <p className="text-[10px] text-rose-700 font-semibold mt-1 text-center bg-rose-50 border border-rose-100 p-1.5 rounded-lg">
                      {paymentError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
