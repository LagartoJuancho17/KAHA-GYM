// src/components/Morosos/AdminBajasReviewModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, X, UserMinus, ShieldCheck, Mail, Search, 
  Check, CheckSquare, Square, MessageCircle, AlertCircle, 
  Clock, Sparkles, RefreshCw, Send
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
    clientes, planes, eliminarCliente, perdonarDeudaSocio,
    darDeBajaTurnosFijosMultiple, addAuditLog, addToast, googleUser 
  } = useGym();

  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dobleCheckConfig, setDobleCheckConfig] = useState<MorososDobleCheckConfig | null>(null);
  const [enviandoAvisos, setEnviandoAvisos] = useState(false);

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesNombre = hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  // Candidatos a baja de turno fijo: activos, con turnos fijos asignados y sin abonar el mes actual
  const candidatosBaja = useMemo(() => {
    return clientes.filter(c => {
      if (!c.activo) return false;
      if (!c.turnos_fijos || c.turnos_fijos.length === 0) return false;
      const noPago = !c.ultimo_mes_pagado || c.ultimo_mes_pagado < mesActual;
      return noPago;
    });
  }, [clientes, mesActual]);

  const filteredCandidatos = useMemo(() => {
    if (!searchText.trim()) return candidatosBaja;
    const q = searchText.toLowerCase();
    return candidatosBaja.filter(c => 
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.turnos_fijos.some(t => t.toLowerCase().includes(q))
    );
  }, [candidatosBaja, searchText]);

  // Socios que continúan pendientes de regularizar (no fueron perdonados ni eliminados)
  const pendientesAviso = useMemo(() => {
    return candidatosBaja.filter(c => c.exencion_cobro !== 'BECADO' && c.exencion_cobro !== 'PERDONADO');
  }, [candidatosBaja]);

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
    const selectedClients = candidatosBaja.filter(c => selectedIds.includes(c.id));
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

  const handleFinalizarRevision = async () => {
    if (pendientesAviso.length === 0) {
      addToast('success', 'Todos los casos fueron revisados (perdonados o eliminados).');
      onClose();
      return;
    }

    setEnviandoAvisos(true);
    try {
      const destinatarios = pendientesAviso
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
          const d = await res.json();
          if (d.ok) sent = true;
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

  const totalDeudaCandidatos = candidatosBaja.reduce((acc, c) => acc + (c.deuda_acumulada || 0), 0);

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
                Alumnos con turnos fijos asignados sin abonar la cuota de <span className="font-semibold text-white capitalize">{mesNombre}</span>. Podés perdonar la deuda (becar) o eliminar el usuario. Al finalizar, quienes no hayan sido perdonados recibirán un aviso automático por correo.
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

        {/* TOOLBAR & SEARCH */}
        <div className="p-4 sm:p-5 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por socio, email o turno..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-sans focus:outline-hidden focus:border-red-500"
              />
            </div>
            {candidatosBaja.length > 0 && (
              <button
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {selectedIds.length === filteredCandidatos.length && filteredCandidatos.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-red-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>Seleccionar ({selectedIds.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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

            {selectedIds.length > 0 && (
              <button
                onClick={handleEliminarMultiple}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Eliminar seleccionados ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* LISTADO DE CANDIDATOS */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredCandidatos.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-6">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-sm text-zinc-800">¡Al día! No hay socios con turnos fijos pendientes de baja</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Todos los alumnos con turnos fijos tienen su cuota abonada o cuentan con excepciones registradas.
              </p>
            </div>
          ) : (
            filteredCandidatos.map(c => {
              const pl = planes.find(p => p.id === c.plan_id);
              const isSelected = selectedIds.includes(c.id);
              const esBecado = c.exencion_cobro === 'BECADO' || c.exencion_cobro === 'PERDONADO';
              const cuota = precioPlanSocio(c, planes);
              const formatoDeuda = formatearDeudaVisual(c, cuota);
              const waPhone = normalizarTelefonoWhatsApp(c.telefono);

              return (
                <div 
                  key={c.id} 
                  className={`bg-white border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-2xs hover:shadow-xs ${
                    isSelected ? 'border-red-400 ring-2 ring-red-500/15 bg-red-50/20' : esBecado ? 'border-emerald-300 bg-emerald-50/20' : 'border-zinc-200'
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
                            Becado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                        <span>Plan: <strong className="text-zinc-700">{pl?.nombre || 'Base'}</strong></span>
                        <span>·</span>
                        {esBecado ? (
                          <span className="font-mono text-emerald-700 font-bold flex items-center gap-1.5">
                            Deuda: $0 
                            <span className="text-zinc-400 font-normal line-through text-xs">({formatoDeuda.textoTachado})</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">Becado</span>
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
                            className="bg-red-50 border border-red-200 text-red-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg"
                          >
                            {tf}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Acciones por fila */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 justify-end">
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

                    {/* Botón Perdonar Deuda */}
                    {!esBecado ? (
                      <button
                        onClick={() => perdonarDeudaSocio(c.id, googleUser?.email)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="Perdonar deuda (asigna deuda $0 y condición de Becado)"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Perdonar deuda</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-100/70 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Becado ($0)</span>
                      </span>
                    )}

                    {/* Botón Eliminar Usuario */}
                    <button
                      onClick={() => handleEliminarIndividual(c)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer border-none"
                      title="Eliminar usuario del sistema"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Eliminar usuario</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-zinc-500">
            Total en revisión: <strong className="text-zinc-900">{candidatosBaja.length} socios</strong> · Pendientes de regularizar: <strong className="text-red-700 font-bold">{pendientesAviso.length}</strong> · Deuda: <strong className="font-mono text-red-600">${totalDeudaCandidatos.toLocaleString('es-AR')}</strong>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handleFinalizarRevision}
              disabled={enviandoAvisos}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-none"
            >
              {enviandoAvisos ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando avisos...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Finalizar y Enviar Aviso ({pendientesAviso.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* MODAL DE DOBLE CHECKEO PARA BAJAS Y PRÓRROGAS */}
      <MorososDobleCheckModal
        config={dobleCheckConfig}
        onClose={() => setDobleCheckConfig(null)}
      />

    </div>
  );
};
