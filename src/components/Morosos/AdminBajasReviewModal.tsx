// src/components/Morosos/AdminBajasReviewModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, X, UserMinus, ShieldCheck, Mail, Search, 
  Check, CheckSquare, Square, MessageCircle, AlertCircle, 
  Clock, Sparkles, RefreshCw, Send, RotateCcw, Loader2, PauseCircle 
} from 'lucide-react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { MorososDobleCheckModal, MorososDobleCheckConfig } from './MorososDobleCheckModal';
import { generarMensajeWhatsAppRecordatorio } from '../../lib/recordatorioDeuda';
import { normalizarTelefonoWhatsApp } from '../../lib/telefono';
import { formatearDeudaVisual, precioPlanSocio } from '../../lib/calculoDeuda';
import { supabase } from '../../supabaseClient';

interface AdminBajasReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEmailModal: () => void;
}

export const AdminBajasReviewModal: React.FC<AdminBajasReviewModalProps> = ({ 
  isOpen, onClose, onOpenEmailModal 
}) => {
  const { 
    clientes, planes, eliminarCliente, perdonarDeudaSocio, revertirPerdonDeuda,
    prorrogarDeudaSocio, pausarSocio,
    addAuditLog, addToast, googleUser 
  } = useGym();

  const [tabActiva, setTabActiva] = useState<'PENDIENTES' | 'EXENTOS'>('PENDIENTES');
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dobleCheckConfig, setDobleCheckConfig] = useState<MorososDobleCheckConfig | null>(null);
  const [enviandoAvisos, setEnviandoAvisos] = useState(false);

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesNombre = hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  // Candidatos a baja de turno fijo: activos, con turnos fijos asignados, sin abonar y sin exención activa
  const candidatosPendientes = useMemo(() => {
    return clientes.filter(c => {
      if (!c.activo) return false;
      if (!c.turnos_fijos || c.turnos_fijos.length === 0) return false;
      if (c.exencion_cobro === 'BECADO' || c.exencion_cobro === 'PERDONADO' || c.exencion_cobro === 'POSTERGADO' || c.exencion_cobro === 'SUSPENDIDO') return false;
      const noPago = !c.ultimo_mes_pagado || c.ultimo_mes_pagado < mesActual;
      return noPago;
    });
  }, [clientes, mesActual]);

  // Alumnos con turnos fijos asignados que cuentan con excepción (Becados, Prorrogados o Pausados)
  const sociosExentos = useMemo(() => {
    return clientes.filter(c => {
      if (!c.activo) return false;
      if (!c.turnos_fijos || c.turnos_fijos.length === 0) return false;
      return c.exencion_cobro === 'BECADO' || c.exencion_cobro === 'PERDONADO' || c.exencion_cobro === 'POSTERGADO' || c.exencion_cobro === 'SUSPENDIDO';
    });
  }, [clientes]);

  const listaActual = tabActiva === 'PENDIENTES' ? candidatosPendientes : sociosExentos;

  const filteredCandidatos = useMemo(() => {
    if (!searchText.trim()) return listaActual;
    const q = searchText.toLowerCase();
    return listaActual.filter(c => 
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.turnos_fijos.some(t => t.toLowerCase().includes(q))
    );
  }, [listaActual, searchText]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredCandidatos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCandidatos.map(c => c.id));
    }
  };

  const handleToggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleEliminarIndividual = (c: Cliente) => {
    setDobleCheckConfig({
      tipo: 'BAJA_SOCIO',
      titulo: 'Eliminar Socio Permanentemente',
      subtitulo: `Esta acción dará de baja a ${c.nombre} ${c.apellido} y liberará todos sus turnos fijos asignados.`,
      cliente: c,
      onConfirm: () => {
        eliminarCliente(c.id);
        setSelectedIds(prev => prev.filter(id => id !== c.id));
      }
    });
  };

  const handleEliminarMultiple = () => {
    if (selectedIds.length === 0) return;
    const selectedClients = listaActual.filter(c => selectedIds.includes(c.id));
    setDobleCheckConfig({
      tipo: 'BAJA_MASIVA_TURNOS',
      titulo: `Eliminar ${selectedIds.length} Socios Seleccionados`,
      subtitulo: 'Se darán de baja y liberarán todos los cupos de los socios marcados.',
      clientesMultiples: selectedClients,
      onConfirm: () => {
        selectedIds.forEach(id => eliminarCliente(id));
        setSelectedIds([]);
        addToast('delete', `Se eliminaron ${selectedIds.length} socio(s) y se liberaron sus turnos.`);
      }
    });
  };

  const handlePerdonarDeuda = (clienteId: string) => {
    perdonarDeudaSocio(clienteId, googleUser?.email);
    setSelectedIds(prev => prev.filter(id => id !== clienteId));
  };

  const handleProrrogarDeuda = (clienteId: string) => {
    prorrogarDeudaSocio(clienteId, googleUser?.email);
    setSelectedIds(prev => prev.filter(id => id !== clienteId));
  };

  const handlePausarSocio = (clienteId: string) => {
    pausarSocio(clienteId, googleUser?.email);
    setSelectedIds(prev => prev.filter(id => id !== clienteId));
  };

  const handleRevertirExencion = (clienteId: string) => {
    revertirPerdonDeuda(clienteId, googleUser?.email);
    setSelectedIds(prev => prev.filter(id => id !== clienteId));
  };

  const handlePerdonarMultiple = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => perdonarDeudaSocio(id, googleUser?.email));
    addToast('success', `Se perdonó la deuda a ${selectedIds.length} socio(s) (Estado: Becado).`);
    setSelectedIds([]);
  };

  const handleProrrogarMultiple = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => prorrogarDeudaSocio(id, googleUser?.email));
    addToast('success', `Se prorrogó la deuda 1 semana a ${selectedIds.length} socio(s).`);
    setSelectedIds([]);
  };

  const handlePausarMultiple = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => pausarSocio(id, googleUser?.email));
    addToast('success', `Se pausó la membresía a ${selectedIds.length} socio(s).`);
    setSelectedIds([]);
  };

  const handleFinalizarRevision = async () => {
    if (candidatosPendientes.length === 0) {
      addToast('success', 'Todos los casos fueron revisados (perdonados, prorrogados, pausados o eliminados).');
      onClose();
      return;
    }

    setEnviandoAvisos(true);
    try {
      const destinatarios = candidatosPendientes
        .filter(c => c.email && c.email.includes('@') && !c.email.endsWith('@example.com'))
        .map(c => ({
          email: c.email.trim(),
          nombre: `${c.nombre} ${c.apellido}`.trim(),
          id: c.id
        }));

      const asunto = '⚠️ Aviso importante sobre tus turnos fijos en KAHA GYM';
      const mensaje = `¡Hola!

Te escribimos desde la administración de KAHA GYM porque registramos que aún no fue abonada tu cuota mensual.

Queremos avisarte que tus turnos fijos asignados desaparecerán automáticamente en breves si no te contactás con nosotros para configurar una postergación o si abonás tu deuda.

Si tuviste alguna dificultad económica o necesitás unos días más, por favor avisanos a la brevedad respondiendo a este mensaje o escribiéndonos por WhatsApp para poder conservar tu lugar y buscar la mejor alternativa juntos. 🤝

¡Queremos que sigas entrenando con nosotros!
Equipo KAHA 💚`;

      let sent = false;
      // 1. Intentar API local
      try {
        const res = await fetch('/api/send-monthly-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asunto, mensaje, destinatarios })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) sent = true;
        }
      } catch (e) {
        console.warn('API local no disponible, intentando Supabase Edge Function:', e);
      }

      // 2. Intentar Supabase Edge Function
      if (!sent && supabase) {
        try {
          const { error } = await supabase.functions.invoke('send-monthly-email', {
            body: { asunto, mensaje, destinatarios }
          });
          if (!error) sent = true;
        } catch (e) {
          console.warn('Supabase function send-monthly-email fallo:', e);
        }
      }

      const fechaStr = new Date().toLocaleString('es-AR');
      addAuditLog('AVISO_BAJA_TURNOS_FIJOS_ENVIADO', {
        cantidad: destinatarios.length,
        destinatarios: destinatarios.map(d => d.email),
        mes: mesActual,
        fecha: fechaStr
      }, googleUser?.email);

      addToast('success', `Avisos automáticos enviados a ${destinatarios.length} socio(s) pendientes de regularizar.`);
    } catch (err: any) {
      console.error('Error al enviar avisos automáticos:', err);
      addToast('error', 'No se pudieron despachar todos los avisos por email.');
    } finally {
      setEnviandoAvisos(false);
      onClose();
    }
  };

  const totalDeudaCandidatos = candidatosPendientes.reduce((acc, c) => acc + (c.deuda_acumulada || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden text-zinc-800 font-sans animate-scale-up">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-red-950 via-zinc-950 to-zinc-900 text-white flex justify-between items-start relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(239,68,68,0.2),transparent_60%)] pointer-events-none" />
          <div className="relative z-10 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-base sm:text-lg text-white">
                  Revisión de Bajas de Turno Fijo (Día 10+)
                </h3>
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                  Acción Manual Admin
                </span>
              </div>
              <p className="text-zinc-300 text-xs mt-1">
                Alumnos con turnos fijos asignados sin abonar la cuota de <span className="font-semibold text-white capitalize">{mesNombre}</span>. Podés perdonar la deuda (becar), prorrogar la deuda 1 semana, pausar al socio o eliminar el usuario. Al finalizar, quienes no hayan sido perdonados, prorrogados ni pausados recibirán un aviso automático por correo.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PESTAÑAS PENDIENTES / EXENTOS */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTabActiva('PENDIENTES'); setSelectedIds([]); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                tabActiva === 'PENDIENTES'
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${tabActiva === 'PENDIENTES' ? 'text-amber-400' : 'text-amber-600'}`} />
              <span>Pendientes de Regularizar ({candidatosPendientes.length})</span>
            </button>

            <button
              onClick={() => { setTabActiva('EXENTOS'); setSelectedIds([]); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                tabActiva === 'EXENTOS'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border-emerald-200'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${tabActiva === 'EXENTOS' ? 'text-white' : 'text-emerald-600'}`} />
              <span>Socios Exentos / Protegidos ({sociosExentos.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenEmailModal();
              }}
              className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>Enviar Reporte a Admins</span>
            </button>
          </div>
        </div>

        {/* TOOLBAR & SEARCH */}
        <div className="p-4 sm:p-5 bg-white border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={tabActiva === 'PENDIENTES' ? 'Buscar pendiente por socio, email o turno...' : 'Buscar protegido/exento por socio, email...'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans focus:outline-hidden focus:border-zinc-900"
              />
            </div>
            {filteredCandidatos.length > 0 && (
              <button
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-none"
              >
                {selectedIds.length === filteredCandidatos.length && selectedIds.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-red-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>Seleccionar ({selectedIds.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {selectedIds.length > 0 && tabActiva === 'PENDIENTES' && (
              <>
                <button
                  onClick={handlePerdonarMultiple}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer border-none"
                  title="Perdonar deuda a todos los seleccionados"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Perdonar ({selectedIds.length})</span>
                </button>

                <button
                  onClick={handleProrrogarMultiple}
                  className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer border-none"
                  title="Prorrogar deuda 1 semana a todos los seleccionados"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Prorrogar 1 sem ({selectedIds.length})</span>
                </button>

                <button
                  onClick={handlePausarMultiple}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer border-none"
                  title="Pausar socios seleccionados"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Pausar ({selectedIds.length})</span>
                </button>

                <button
                  onClick={handleEliminarMultiple}
                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer border-none"
                  title="Eliminar socios seleccionados"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Eliminar ({selectedIds.length})</span>
                </button>
              </>
            )}
            {selectedIds.length > 0 && tabActiva === 'EXENTOS' && (
              <button
                onClick={() => {
                  selectedIds.forEach(id => revertirPerdonDeuda(id, googleUser?.email));
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer border-none"
                title="Restablecer condición normal a los seleccionados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* LISTADO DE CANDIDATOS */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredCandidatos.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-6">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-sm text-zinc-800">
                {tabActiva === 'PENDIENTES' 
                  ? '¡Al día! No hay socios con turnos fijos pendientes de regularizar' 
                  : 'No hay socios con turnos fijos registrados bajo condición de exención o prórroga'}
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                {tabActiva === 'PENDIENTES'
                  ? 'Todos los alumnos con turnos fijos tienen su cuota abonada o cuentan con excepciones, prórrogas o pausas registradas.'
                  : 'Los socios perdonados, prorrogados o pausados aparecerán en esta sección y no se les enviará intimación de baja.'}
              </p>
            </div>
          ) : (
            filteredCandidatos.map(c => {
              const pl = planes.find(p => p.id === c.plan_id);
              const isSelected = selectedIds.includes(c.id);
              const esBecado = c.exencion_cobro === 'BECADO' || c.exencion_cobro === 'PERDONADO';
              const esPostergado = c.exencion_cobro === 'POSTERGADO';
              const esSuspendido = c.exencion_cobro === 'SUSPENDIDO';
              const esExento = esBecado || esPostergado || esSuspendido;
              const cuota = precioPlanSocio(c, planes);
              const formatoDeuda = formatearDeudaVisual(c, cuota);
              const waPhone = normalizarTelefonoWhatsApp(c.telefono);

              return (
                <div 
                  key={c.id} 
                  className={`bg-white border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-2xs hover:shadow-xs ${
                    isSelected ? 'border-red-400 ring-2 ring-red-500/15 bg-red-50/20' : esExento ? 'border-emerald-300 bg-emerald-50/20' : 'border-zinc-200'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleSelectId(c.id)}
                      className="mt-1 text-zinc-400 hover:text-zinc-700 cursor-pointer border-none bg-transparent"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-300" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-950">{c.apellido}, {c.nombre}</span>
                        {c.codigo_socio && (
                          <span className="text-[10px] font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded font-semibold">
                            {c.codigo_socio}
                          </span>
                        )}
                        {esBecado && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                            Becado (Deuda $0)
                          </span>
                        )}
                        {esPostergado && (
                          <span className="bg-cyan-100 text-cyan-800 border border-cyan-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-cyan-700" />
                            Prorrogado 1 sem
                          </span>
                        )}
                        {esSuspendido && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase flex items-center gap-1">
                            <PauseCircle className="w-2.5 h-2.5 text-amber-700" />
                            Socio Pausado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                        <span>Plan: <strong className="text-zinc-700">{pl?.nombre || 'Base'}</strong></span>
                        <span>·</span>
                        {esBecado ? (
                          <span className="font-mono text-emerald-700 font-bold flex items-center gap-1.5">
                            Deuda actual: <span className="bg-emerald-100 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded">$0</span>
                            <span className="text-zinc-400 font-normal line-through decoration-rose-500 decoration-2 text-xs">({formatoDeuda.textoTachado})</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">Becado</span>
                          </span>
                        ) : esPostergado ? (
                          <span className="font-mono text-cyan-800 font-bold flex items-center gap-1.5">
                            <span>Deuda: ${c.deuda_acumulada.toLocaleString('es-AR')}</span>
                            <span className="bg-cyan-100 text-cyan-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">Prórroga activa</span>
                          </span>
                        ) : esSuspendido ? (
                          <span className="font-mono text-amber-800 font-bold flex items-center gap-1.5">
                            <span>Deuda: ${c.deuda_acumulada.toLocaleString('es-AR')}</span>
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">Pausa activa</span>
                          </span>
                        ) : (
                          <span className="font-mono text-red-600 font-bold">Deuda: {formatoDeuda.textoVisible}</span>
                        )}
                        <span>·</span>
                        <span className="text-zinc-400 truncate">{c.email}</span>
                      </div>

                      {/* Turnos fijos chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase font-mono">Turnos Fijos:</span>
                        {c.turnos_fijos.map(tf => (
                          <span 
                            key={tf}
                            className={`border text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                              esExento 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-red-50 border border-red-200 text-red-800'
                            }`}
                          >
                            {tf}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Acciones por fila */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 justify-end flex-wrap">
                    {/* Botón WhatsApp corregido con normalización internacional (549) */}
                    {waPhone && (
                      <a
                        href={`https://wa.me/${waPhone}?text=${encodeURIComponent(generarMensajeWhatsAppRecordatorio(c.nombre))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                        title="Enviar recordatorio por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}

                    {!esExento ? (
                      <>
                        {/* 1. Perdonar deuda */}
                        <button
                          onClick={() => handlePerdonarDeuda(c.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs border-none"
                          title="Perdonar deuda (pone deuda en $0 y asigna condición de Becado)"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Perdonar deuda</span>
                        </button>

                        {/* 2. Prorrogar deuda 1 semana */}
                        <button
                          onClick={() => handleProrrogarDeuda(c.id)}
                          className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Prorrogar deuda por 1 semana (conserva turnos y no envía aviso de baja)"
                        >
                          <Clock className="w-3.5 h-3.5 text-cyan-700" />
                          <span>Prorrogar 1 sem</span>
                        </button>

                        {/* 3. Pausar socio */}
                        <button
                          onClick={() => handlePausarSocio(c.id)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Pausar socio (suspensión momentánea de cobro)"
                        >
                          <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                          <span>Pausar socio</span>
                        </button>

                        {/* 4. Eliminar usuario */}
                        <button
                          onClick={() => handleEliminarIndividual(c)}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer border-none"
                          title="Eliminar usuario del sistema y liberar turnos fijos asignados"
                        >
                          <UserMinus className="w-3.5 h-3.5 text-white" />
                          <span>Eliminar usuario</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRevertirExencion(c.id)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Restablecer condición normal (quitar exención/prórroga/pausa)"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        <span>Restablecer condición</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs">
          <div className="text-zinc-600 text-center sm:text-left space-y-0.5">
            <p>
              Pendientes de regularizar: <strong className="text-zinc-950 font-bold">{candidatosPendientes.length} socios</strong>
              {' · '}
              Deuda total adeudada: <strong className="text-red-700 font-mono font-bold">${totalDeudaCandidatos.toLocaleString('es-AR')}</strong>
            </p>
            <p className="text-[11px] text-zinc-400">
              {sociosExentos.length > 0 && `${sociosExentos.length} socio(s) protegidos/exentos (becados, prórrogas o pausados) fuera de revisión de baja.`}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <button
              onClick={handleFinalizarRevision}
              disabled={enviandoAvisos || candidatosPendientes.length === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer border-none"
              title="Finalizar revisión y despachar email de advertencia de baja a todos los no perdonados"
            >
              {enviandoAvisos ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
              <span>
                {enviandoAvisos 
                  ? 'Enviando avisos...' 
                  : `Finalizar y Enviar Aviso (${candidatosPendientes.length})`}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* MODAL DE DOBLE CONFIRMACIÓN */}
      {dobleCheckConfig && (
        <MorososDobleCheckModal
          config={dobleCheckConfig}
          onClose={() => setDobleCheckConfig(null)}
        />
      )}
    </div>
  );
};
