// src/components/Notifications/EmailReporteCierreMesAdminModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  Send, Copy, Check, Users, AlertCircle, 
  Sparkles, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle,
  FileText, PauseCircle, HeartHandshake, Mail, MessageSquare, ExternalLink, Calendar
} from 'lucide-react';
import { useGym } from '../../GymContext';
import { supabase } from '../../supabaseClient';
import { 
  obtenerMesCerrado, 
  nombreMesCerrado,
  obtenerSociosDeudaPerdonada,
  obtenerSociosPausados,
  obtenerSociosSinPagarConTurnos,
  generarReporteCierreMesTexto,
  generarReporteCierreMesHtml
} from '../../lib/reporteCierreMes';

interface EmailReporteCierreMesAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailReporteCierreMesAdminModal: React.FC<EmailReporteCierreMesAdminModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { clientes, planes, auditLogs, addAuditLog, addToast, googleUser } = useGym();
  
  const mesCerradoDefault = useMemo(() => obtenerMesCerrado(), []);
  const [mesSeleccionado, setMesSeleccionado] = useState(mesCerradoDefault);
  
  const defaultAdminEmails = googleUser?.email 
    ? `${googleUser.email}, admin@gimnasio.com.ar` 
    : 'totoarr17@gmail.com, jmferrariprofe@gmail.com';
    
  const [destinatariosAdmin, setDestinatariosAdmin] = useState(defaultAdminEmails);
  const [pestanaActiva, setPestanaActiva] = useState<'SIN_PAGAR' | 'PERDONADOS' | 'PAUSADOS' | 'TEXTO'>('SIN_PAGAR');
  
  const [copiadoReporte, setCopiadoReporte] = useState(false);
  const [copiadoSocioId, setCopiadoSocioId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);

  const nombreMes = useMemo(() => nombreMesCerrado(mesSeleccionado), [mesSeleccionado]);

  // 1. Deudas perdonadas
  const deudasPerdonadas = useMemo(() => {
    return obtenerSociosDeudaPerdonada(auditLogs, mesSeleccionado);
  }, [auditLogs, mesSeleccionado]);

  // 2. Socios Pausados
  const sociosPausados = useMemo(() => {
    return obtenerSociosPausados(clientes, mesSeleccionado);
  }, [clientes, mesSeleccionado]);

  // 3. Socios sin pagar con turnos fijos asignados
  const sociosSinPagar = useMemo(() => {
    return obtenerSociosSinPagarConTurnos(clientes, mesSeleccionado, planes);
  }, [clientes, mesSeleccionado, planes]);

  // Totales
  const totalPerdonado = useMemo(() => {
    return deudasPerdonadas.reduce((acc, s) => acc + s.monto, 0);
  }, [deudasPerdonadas]);

  const totalSinPagar = useMemo(() => {
    return sociosSinPagar.reduce((acc, s) => acc + s.cuota, 0);
  }, [sociosSinPagar]);

  // Textos y Asunto
  const asunto = `📋 [KAHA GYM] Resumen de Cierre de Mes: ${nombreMes}`;
  
  const textoReporte = useMemo(() => {
    return generarReporteCierreMesTexto({
      mesCerrado: mesSeleccionado,
      deudasPerdonadas,
      sociosPausados,
      sociosSinPagar
    });
  }, [mesSeleccionado, deudasPerdonadas, sociosPausados, sociosSinPagar]);

  if (!isOpen) return null;

  // Enviar automáticamente a administradores
  const handleEnviarAutomatico = async () => {
    const adminsList = destinatariosAdmin
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (adminsList.length === 0) {
      setResultadoEnvio({
        tipo: 'error',
        texto: 'Por favor, ingresá al menos un correo electrónico de administrador.'
      });
      return;
    }

    setEnviando(true);
    setResultadoEnvio(null);

    try {
      let enviadoOk = false;
      let detalleRes: any = null;

      // 1. Intentar endpoint backend local/server
      try {
        const res = await fetch('/api/send-admin-monthly-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asunto,
            cuerpo: textoReporte,
            titulo: `Resumen Ejecutivo de Cierre: ${nombreMes}`,
            destinatariosAdmin: adminsList
          })
        });

        if (res.ok) {
          detalleRes = await res.json().catch(() => ({}));
          enviadoOk = true;
        }
      } catch (errApi) {
        console.warn('API /api/send-admin-monthly-summary no respondió, probando fallback:', errApi);
      }

      // 2. Si no respondió Express, intentar vía Edge Function
      if (!enviadoOk && supabase) {
        try {
          const { data, error } = await supabase.functions.invoke('send-admin-delinquent-report', {
            body: {
              destinatariosAdmin: adminsList,
              asunto,
              sociosDetalle: sociosSinPagar
            }
          });
          if (!error) {
            detalleRes = data;
            enviadoOk = true;
          }
        } catch (edgeErr) {
          console.warn('Edge function fallback falló:', edgeErr);
        }
      }

      if (!enviadoOk) {
        throw new Error('No se pudo conectar con el servicio automatizado de correo.');
      }

      addAuditLog('REPORTE_CIERRE_MES_ADMIN_ENVIADO', {
        mes: mesSeleccionado,
        perdonados: deudasPerdonadas.length,
        pausados: sociosPausados.length,
        sin_pagar: sociosSinPagar.length,
        destinatarios: adminsList,
        fecha: new Date().toISOString()
      }, googleUser?.email);

      setResultadoEnvio({
        tipo: 'ok',
        texto: `¡Reporte enviado exitosamente a ${adminsList.join(', ')}!`
      });
      addToast('success', '¡Reporte mensual enviado con éxito a los administradores!');
    } catch (err: any) {
      console.error('Error al enviar reporte:', err);
      setResultadoEnvio({
        tipo: 'info',
        texto: `El servicio automatizado no está configurado directamente. Podés hacer click en "Abrir en Gmail / Mail" para enviarlo con 1 click.`
      });
    } finally {
      setEnviando(false);
    }
  };

  // Abrir en cliente de correo nativo / Gmail
  const handleAbrirEnClienteCorreo = () => {
    const adminsList = destinatariosAdmin
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .join(',');

    const subjectEncoded = encodeURIComponent(asunto);
    const bodyEncoded = encodeURIComponent(textoReporte);
    const mailtoUrl = `mailto:${encodeURIComponent(adminsList)}?subject=${subjectEncoded}&body=${bodyEncoded}`;
    
    if (mailtoUrl.length > 2000) {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(adminsList)}&su=${subjectEncoded}&body=${bodyEncoded}`, '_blank');
    } else {
      window.location.href = mailtoUrl;
    }

    addAuditLog('REPORTE_CIERRE_MES_ABIERTO_MAIL', {
      mes: mesSeleccionado,
      destinatarios: adminsList
    }, googleUser?.email);

    addToast('add', 'Abriendo cliente de correo con el reporte preparado.');
  };

  // Copiar reporte completo
  const handleCopiarReporte = async () => {
    try {
      await navigator.clipboard.writeText(textoReporte);
      setCopiadoReporte(true);
      setTimeout(() => setCopiadoReporte(false), 2500);
      addToast('success', 'Reporte copiado al portapapeles.');
    } catch {
      // Fallback
    }
  };

  // Copiar mensaje individual para consultar al socio
  const handleCopiarMensajeSocio = async (socio: any) => {
    const mensajeSocio = `¡Hola ${socio.nombre.split(' ')[0]}! ¿Cómo estás? Esperamos que andes muy bien. 💚

Te escribimos del equipo de KAHA para hacerte una consulta: al pasar en limpio los registros del mes que acaba de cerrar (${nombreMes}), vimos que no tenemos asentado el pago de tu cuota (${socio.planNombre}).

Si ya lo habías realizado:
• Si fue por transferencia / digital: por favor, ¿nos reenviarías el comprobante para que lo imputemos en el sistema y te quede al día?
• Si fue en efectivo: avisanos así lo chequeamos en caja.

Y si por algún motivo no pudiste abonarlo y necesitabas que te cubriéramos este mes, no te hagas ningún problema, ¡escribinos con total confianza! Para nosotros lo más importante es acompañarte y que no cortes tu entrenamiento. 🤝

Esperamos que todo ande excelente por ahí. ¡Nos vemos en el box!

Un saludo grande,
Equipo KAHA`;

    try {
      await navigator.clipboard.writeText(mensajeSocio);
      setCopiadoSocioId(socio.id);
      setTimeout(() => setCopiadoSocioId(null), 2500);
      addToast('success', `Mensaje copiado para ${socio.nombre}.`);
    } catch {
      // Fallback
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans"
      role="dialog"
      aria-labelledby="modal-cierre-title"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-950 via-zinc-950 to-teal-950 text-white flex justify-between items-center shrink-0 border-b border-emerald-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-cierre-title" className="text-base sm:text-lg font-bold tracking-tight">
                  Reporte de Cierre de Mes (Administradores)
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Días 1 a 5
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Pasa en limpio socios perdonados, pausados y turnos fijos impagos de {nombreMes}.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 sm:px-6 bg-zinc-50 border-b border-zinc-200 shrink-0">
          <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Deuda Perdonada</div>
              <div className="text-lg font-black text-emerald-950">{deudasPerdonadas.length} socios</div>
              <div className="text-[11px] text-emerald-700 font-mono font-bold">${totalPerdonado.toLocaleString('es-AR')}</div>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-3.5 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Socios Pausados</div>
              <div className="text-lg font-black text-amber-950">{sociosPausados.length} socios</div>
              <div className="text-[11px] text-amber-700">Cupos liberados en Turnera</div>
            </div>
          </div>

          <div className="bg-white border border-rose-200 rounded-2xl p-3.5 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Sin Pago / Asistieron</div>
              <div className="text-lg font-black text-rose-950">{sociosSinPagar.length} socios</div>
              <div className="text-[11px] text-rose-700 font-mono font-bold">${totalSinPagar.toLocaleString('es-AR')} est.</div>
            </div>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex border-b border-zinc-200 px-6 pt-3 gap-2 shrink-0 bg-white overflow-x-auto">
          <button
            onClick={() => setPestanaActiva('SIN_PAGAR')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              pestanaActiva === 'SIN_PAGAR'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Sin Pagar con Turnos ({sociosSinPagar.length})
          </button>

          <button
            onClick={() => setPestanaActiva('PERDONADOS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              pestanaActiva === 'PERDONADOS'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
            Deudas Perdonadas ({deudasPerdonadas.length})
          </button>

          <button
            onClick={() => setPestanaActiva('PAUSADOS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              pestanaActiva === 'PAUSADOS'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            Socios Pausados ({sociosPausados.length})
          </button>

          <button
            onClick={() => setPestanaActiva('TEXTO')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              pestanaActiva === 'TEXTO'
                ? 'border-zinc-800 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Vista Previa Mail Completo
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="p-6 overflow-y-auto grow space-y-4">
          
          {resultadoEnvio && (
            <div className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-medium border ${
              resultadoEnvio.tipo === 'ok' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : resultadoEnvio.tipo === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {resultadoEnvio.tipo === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {resultadoEnvio.tipo === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {resultadoEnvio.tipo === 'info' && <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />}
              <span>{resultadoEnvio.texto}</span>
            </div>
          )}

          {/* TAB 1: SIN PAGAR CON TURNOS */}
          {pestanaActiva === 'SIN_PAGAR' && (
            <div className="space-y-3">
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 leading-relaxed">
                <strong>Socios que asistieron o mantuvieron turno fijo sin registrar pago de {nombreMes}:</strong>
                <p className="mt-1 text-rose-800/90 text-[11px]">
                  Estos socios no registraron pago del mes que finalizó. Podés copiar el mensaje individual para consultarles amablemente si abonaron por transferencia o en efectivo, o si necesitaban cobertura este mes.
                </p>
              </div>

              {sociosSinPagar.length === 0 ? (
                <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-zinc-200 text-zinc-500 text-xs">
                  ¡Excelente! Todos los socios con turnos fijos asignados tienen su pago al día para {nombreMes}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sociosSinPagar.map((s, idx) => (
                    <div 
                      key={s.id}
                      className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-900">{idx + 1}. {s.nombre}</span>
                          {s.exencionCobro === 'POSTERGADO' && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300/50">
                              Tenía prórroga de 1 sem
                            </span>
                          )}
                          <span className="bg-zinc-100 text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {s.planNombre}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Cuota: <strong className="text-zinc-800 font-mono">${s.cuota.toLocaleString('es-AR')}</strong></span>
                          <span>Último pago: <strong className="text-zinc-700">{s.ultimoMesPagado}</strong></span>
                          {s.email && <span>Email: <strong className="text-zinc-700">{s.email}</strong></span>}
                          {s.telefono && <span>Tel: <strong className="text-zinc-700">{s.telefono}</strong></span>}
                        </div>
                        <div className="text-[11px] text-zinc-600 font-medium">
                          Turnos: <span className="text-zinc-800">{s.turnosFijos.join(', ')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopiarMensajeSocio(s)}
                          className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Copiar mensaje personalizado para este socio"
                        >
                          {copiadoSocioId === s.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Copiar Mensaje</span>
                            </>
                          )}
                        </button>

                        {s.telefono && (
                          <a
                            href={`https://wa.me/${s.telefono.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title="Abrir WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        )}

                        {s.email && (
                          <a
                            href={`mailto:${s.email}?subject=${encodeURIComponent('💚 Consulta sobre tu cuota de ' + nombreMes + ' — KAHA GYM')}`}
                            className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
                            title="Enviar Correo"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEUDAS PERDONADAS */}
          {pestanaActiva === 'PERDONADOS' && (
            <div className="space-y-3">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950">
                <strong>Socios con deuda perdonada o becas aplicadas durante {nombreMes}:</strong>
                <p className="mt-1 text-emerald-800 text-[11px]">
                  Total perdonado: <strong>${totalPerdonado.toLocaleString('es-AR')}</strong> distribuido en {deudasPerdonadas.length} socios.
                </p>
              </div>

              {deudasPerdonadas.length === 0 ? (
                <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-zinc-200 text-zinc-500 text-xs">
                  No se registraron exenciones ni deudas perdonadas en {nombreMes}.
                </div>
              ) : (
                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4 font-bold"># Socio</th>
                        <th className="py-2.5 px-4 font-bold">Monto Perdonado</th>
                        <th className="py-2.5 px-4 font-bold">Tipo / Motivo</th>
                        <th className="py-2.5 px-4 font-bold">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {deudasPerdonadas.map((s, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-4 font-semibold text-zinc-900">{idx + 1}. {s.nombre}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">
                            {s.monto > 0 ? `$${s.monto.toLocaleString('es-AR')}` : '$0 (Sin costo)'}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              s.tipo === 'BECADO' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {s.tipo === 'BECADO' ? 'Beca / Convenio' : 'Exención Directa'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-zinc-500 font-mono text-[11px]">{s.fecha || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOCIOS PAUSADOS */}
          {pestanaActiva === 'PAUSADOS' && (
            <div className="space-y-3">
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950">
                <strong>Socios con cuenta pausada / congelada durante {nombreMes}:</strong>
                <p className="mt-1 text-amber-800 text-[11px]">
                  Estos socios no generaron deuda este mes y sus cupos fueron liberados en la Turnera, conservando su prioridad en la Matriz.
                </p>
              </div>

              {sociosPausados.length === 0 ? (
                <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-zinc-200 text-zinc-500 text-xs">
                  No hubo socios en pausa durante {nombreMes}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sociosPausados.map((s, idx) => (
                    <div key={idx} className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 text-xs">{idx + 1}. {s.nombre}</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Pausado
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {s.telefono ? `Tel: ${s.telefono}` : 'Sin teléfono'} {s.email ? `• ${s.email}` : ''}
                      </div>
                      <div className="text-[11px] text-zinc-600 font-medium pt-1 border-t border-zinc-100">
                        Turnos en Matriz: <span className="text-zinc-800">{s.turnosFijos.length > 0 ? s.turnosFijos.join(', ') : 'Sin turnos'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VISTA PREVIA MAIL COMPLETO */}
          {pestanaActiva === 'TEXTO' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span className="font-bold">Cuerpo completo del correo a Administradores:</span>
                <button
                  onClick={handleCopiarReporte}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiadoReporte ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiadoReporte ? 'Copiado' : 'Copiar Texto'}</span>
                </button>
              </div>
              <textarea
                value={textoReporte}
                readOnly
                className="w-full h-80 font-mono text-xs bg-zinc-900 text-zinc-100 p-4 rounded-2xl border border-zinc-800 focus:outline-hidden resize-none leading-relaxed"
              />
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-5 sm:px-6 bg-zinc-50 border-t border-zinc-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-700 whitespace-nowrap">Enviar a:</span>
            <input
              type="text"
              value={destinatariosAdmin}
              onChange={(e) => setDestinatariosAdmin(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs w-full sm:w-80 bg-white focus:outline-emerald-500 font-sans"
              placeholder="admin@gimnasio.com.ar"
            />
          </div>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={handleAbrirEnClienteCorreo}
              className="px-3.5 py-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Abrir borrador en Gmail o Mail"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
              <span>Abrir en Gmail</span>
            </button>

            {/* BOTÓN DE ENVÍO AUTOMÁTICO */}
            <button
              onClick={handleEnviarAutomatico}
              disabled={enviando}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              id="btn-envio-automatico-reporte-cierre"
            >
              <Send className={`w-3.5 h-3.5 ${enviando ? 'animate-spin' : ''}`} />
              <span>{enviando ? 'Enviando Reporte...' : 'Enviar Reporte Automático'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
