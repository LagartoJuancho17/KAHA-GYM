// src/components/Morosos/RondaRecordatoriosModal.tsx
import React, { useMemo, useState } from 'react';
import { useGym } from '../../GymContext';
import {
  X, MessageCircle, Check, Undo2, PhoneOff, Copy, AlertTriangle, Send, CreditCard
} from 'lucide-react';
import { armarRonda, ItemRonda, ACCION_RONDA, ACCION_RONDA_DESHECHA } from '../../lib/rondaRecordatorios';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const RondaRecordatoriosModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { clientes, planes, pagos, auditLogs, addAuditLog, googleUser, addToast } = useGym();
  const [copiado, setCopiado] = useState<string | null>(null);

  const ronda = useMemo(
    () => armarRonda({ clientes, planes, pagos, logs: auditLogs }),
    [clientes, planes, pagos, auditLogs]
  );

  if (!isOpen) return null;

  const hechos = ronda.yaContactados.length;
  const conWhatsApp = ronda.pendientes.length + hechos;
  const porcentaje = conWhatsApp > 0 ? Math.round((hechos / conWhatsApp) * 100) : 0;

  const marcar = (item: ItemRonda) => {
    addAuditLog(ACCION_RONDA, {
      cliente_id: item.cliente_id,
      cliente: `${item.nombre} ${item.apellido}`,
      mes: ronda.mes,
      motivo: item.motivo,
      deuda: item.deuda
    }, googleUser?.email);
  };

  const desmarcar = (item: ItemRonda) => {
    addAuditLog(ACCION_RONDA_DESHECHA, {
      cliente_id: item.cliente_id,
      cliente: `${item.nombre} ${item.apellido}`,
      mes: ronda.mes
    }, googleUser?.email);
    addToast('success', `${item.nombre} vuelve a la lista. Marcalo de nuevo cuando le escribas.`);
  };

  const copiar = async (item: ItemRonda) => {
    try {
      await navigator.clipboard.writeText(item.mensaje);
      setCopiado(item.cliente_id);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      addToast('error', 'No se pudo copiar. Seleccioná el texto a mano.');
    }
  };

  const Fila: React.FC<{ item: ItemRonda; hecho: boolean }> = ({ item, hecho }) => (
    <div
      className={`border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
        hecho ? 'bg-zinc-50 border-zinc-200' : 'bg-white border-zinc-200 hover:border-zinc-300'
      }`}
      id={`ronda-item-${item.cliente_id}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-bold text-xs ${hecho ? 'text-zinc-500' : 'text-zinc-900'}`}>
            {item.apellido}, {item.nombre}
          </span>
          <span
            className="font-mono text-[11px] font-bold text-rose-700"
            title={item.deudaEsCuotaDelMes ? 'Cuota del mes sin pagar (todavía no imputada a la deuda acumulada)' : 'Deuda acumulada'}
          >
            ${item.deuda.toLocaleString('es-AR')}{item.deudaEsCuotaDelMes ? ' (mes)' : ''}
          </span>
          <span className="font-mono text-[10px] text-zinc-400">{item.telefono}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => copiar(item)}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer border-none bg-transparent"
          title="Copiar el mensaje"
        >
          {copiado === item.cliente_id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {hecho ? (
          <button
            type="button"
            onClick={() => desmarcar(item)}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Volver a ponerlo en la lista"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Deshacer</span>
          </button>
        ) : (
          <a
            href={item.urlWhatsApp}
            target="_blank"
            rel="noreferrer"
            onClick={() => marcar(item)}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            id={`ronda-enviar-${item.cliente_id}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Abrir chat</span>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs font-sans text-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">

        <div className="bg-zinc-900 text-white p-5 sm:p-6 flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-800 rounded-xl border border-zinc-700 text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">Ronda de recordatorios</h3>
              <p className="text-[11px] text-zinc-400">
                {ronda.motivo === 'AVISO_VENCIMIENTO'
                  ? `Aviso con la fecha límite: todavía están en plazo.`
                  : `Pasó el día 10: el mensaje avisa que el turno quedó liberado.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progreso */}
        <div className="px-5 sm:px-6 py-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 mb-1.5">
            <span>{hechos} de {conWhatsApp} avisados</span>
            <span className="font-mono">{porcentaje}%</span>
          </div>
          <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${porcentaje}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {conWhatsApp === 0 && ronda.sinWhatsApp.length === 0 && ronda.sinPlan.length === 0 && (
            <div className="text-center py-10 text-zinc-500">
              <Check className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-sm text-zinc-800">No hay nadie debiendo.</p>
            </div>
          )}

          {ronda.pendientes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Faltan avisar ({ronda.pendientes.length})
              </p>
              {ronda.pendientes.map(i => <Fila key={i.cliente_id} item={i} hecho={false} />)}
            </div>
          )}

          {ronda.sinWhatsApp.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <PhoneOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-950">
                  <p className="font-bold">Sin WhatsApp usable ({ronda.sinWhatsApp.length})</p>
                  <p className="text-amber-900">
                    Deben plata pero el teléfono cargado no sirve para mandarles. Hay que arreglarles la ficha o llamarlos.
                  </p>
                </div>
              </div>
              {ronda.sinWhatsApp.map(c => (
                <div key={c.cliente_id} className="border border-zinc-200 rounded-xl p-3 flex items-center justify-between gap-3 bg-white">
                  <span className="font-bold text-xs text-zinc-900">{c.apellido}, {c.nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-rose-700">
                      ${c.deuda.toLocaleString('es-AR')}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">{c.telefono || 'sin teléfono'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ronda.sinPlan.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-xl p-3">
                <CreditCard className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-sky-950">
                  <p className="font-bold">Sin plan asignado ({ronda.sinPlan.length})</p>
                  <p className="text-sky-900">
                    No se les manda nada porque su cuota es $0: no deben plata. Pero están activos sin plan,
                    así que el gimnasio no les está facturando. Asignales plan desde Socios.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ronda.sinPlan.map(c => (
                  <span key={c.cliente_id} className="px-2 py-1 rounded-lg bg-white border border-zinc-200 text-[11px] font-semibold text-zinc-700">
                    {c.apellido ? `${c.apellido}, ` : ''}{c.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ronda.yaContactados.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Ya avisados este mes ({ronda.yaContactados.length})
              </p>
              {ronda.yaContactados.map(i => <Fila key={i.cliente_id} item={i} hecho={true} />)}
            </div>
          )}
        </div>

        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-start gap-2 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-600 flex-1">
            Al apretar "Abrir chat" se abre WhatsApp con el mensaje escrito y el socio queda marcado.
            La app no puede saber si después apretaste enviar, así que si te arrepentís usá "Deshacer".
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border-none shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
