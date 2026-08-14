// src/components/Notifications/NotificationManager.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, BellOff, BellRing, X, Check } from 'lucide-react';
import { useGym } from '../../GymContext';
import type { Turno } from '../../types';

const DAY_MAP: Record<string, number> = {
  'DOMINGO': 0,
  'LUNES': 1,
  'MARTES': 2,
  'MIERCOLES': 3,
  'JUEVES': 4,
  'VIERNES': 5,
  'SABADO': 6,
};

const DAY_NAMES_ES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

const NOTIFICATION_STORAGE_KEY = 'kaha-notifications-enabled';
const LAST_NOTIFICATION_KEY = 'kaha-last-notification';
const NOTIFICATION_PROMPT_DISMISSED_KEY = 'kaha-notification-prompt-dismissed';

/**
 * NotificationManager
 * - Requests notification permission from the user (non-intrusively)
 * - Schedules local reminders based on the socio's turnos_fijos
 * - Shows a reminder notification on training days at 7:00 AM
 */
export const NotificationManager: React.FC<{
  socioId: string;
  turnosFijos: string[];
  turnos: Turno[];
}> = ({ socioId, turnosFijos, turnos }) => {

  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if notifications are supported and get permission state
  useEffect(() => {
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }
    setPermissionState(Notification.permission);

    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (stored === 'true' && Notification.permission === 'granted') {
      setIsEnabled(true);
    }

    // Show the prompt banner if user hasn't dismissed it and hasn't enabled notifications
    const dismissed = localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
    if (!dismissed && Notification.permission !== 'granted' && turnosFijos.length > 0) {
      // Delay slightly so it doesn't appear immediately on load
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [turnosFijos.length]);

  // Get the turno details for the socio's fixed shifts
  const getTurnosInfo = useCallback(() => {
    return turnosFijos.map(tfId => {
      const turno = turnos.find(t => t.id === tfId);
      if (turno) {
        return { dia: turno.dia, hora: turno.hora, id: turno.id };
      }
      // Parse from the ID format "LUNES-10:30"
      const parts = tfId.split('-');
      const dia = parts[0];
      const hora = parts.slice(1).join(':');
      return { dia, hora, id: tfId };
    });
  }, [turnosFijos, turnos]);

  // Check if today is a training day and send notification if needed
  const checkAndNotify = useCallback(() => {
    if (!isEnabled || Notification.permission !== 'granted') return;

    const now = new Date();
    const todayDayNum = now.getDay();
    const todayStr = now.toISOString().split('T')[0];

    // Check if we already sent a notification today
    const lastNotif = localStorage.getItem(`${LAST_NOTIFICATION_KEY}-${socioId}`);
    if (lastNotif === todayStr) return;

    const turnosInfo = getTurnosInfo();
    const todayTurnos = turnosInfo.filter(t => DAY_MAP[t.dia] === todayDayNum);

    if (todayTurnos.length > 0) {
      const horasStr = todayTurnos.map(t => t.hora.slice(0, 5)).join(' y ');
      const dayName = DAY_NAMES_ES[todayDayNum];

      // Only notify between 6:00 AM and 10:00 PM
      const hours = now.getHours();
      if (hours >= 6 && hours <= 22) {
        const notification = new Notification('🏋️ ¡Hoy tenés clase en KAHA!', {
          body: `${dayName} — Tu turno es a las ${horasStr} hs. ¡No te olvides!`,
          icon: '/favicon.png',
          badge: '/favicon-32x32.png',
          tag: 'kaha-training-reminder',
          renotify: true,
          vibrate: [200, 100, 200],
        } as NotificationOptions);

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        localStorage.setItem(`${LAST_NOTIFICATION_KEY}-${socioId}`, todayStr);
      }
    }
  }, [isEnabled, socioId, getTurnosInfo]);

  // Set up interval to check for notifications
  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Check immediately on enable
    checkAndNotify();

    // Then check every 30 minutes
    intervalRef.current = setInterval(checkAndNotify, 30 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEnabled, checkAndNotify]);

  // Handle enabling notifications
  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) return;

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === 'granted') {
        setIsEnabled(true);
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'true');
        setShowPrompt(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);

        // Send a test notification
        new Notification('✅ ¡Recordatorios activados!', {
          body: 'Vas a recibir recordatorios antes de cada clase en KAHA GYM.',
          icon: '/favicon.png',
          tag: 'kaha-setup-complete',
        });
      } else {
        setIsEnabled(false);
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
      }
    } catch (err) {
      console.warn('[KAHA Notifications] Error:', err);
    }
  };

  // Handle disabling notifications
  const handleDisableNotifications = () => {
    setIsEnabled(false);
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'false');
  };

  // Dismiss the prompt banner
  const handleDismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, 'true');
  };

  // Don't render anything if notifications are not supported or no turnos fijos
  if (permissionState === 'unsupported') return null;

  return (
    <>
      {/* Floating notification prompt banner */}
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md animate-in slide-in-from-bottom">
          <div 
            className="rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-2xl shadow-emerald-900/10"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                <BellRing size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">
                  🔔 ¿Querés que te recuerde tus días de entreno?
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Recibí una notificación cada día que tengas clase para que no te olvides.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleEnableNotifications}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-95 cursor-pointer"
                    id="notification-enable-btn"
                  >
                    <Bell size={14} />
                    ¡Sí, activar!
                  </button>
                  <button
                    onClick={handleDismissPrompt}
                    className="flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                    id="notification-dismiss-btn"
                  >
                    Ahora no
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismissPrompt}
                className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                id="notification-close-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-4 left-4 right-4 z-[9999] mx-auto max-w-sm">
          <div className="rounded-2xl border border-emerald-200/50 bg-emerald-500 p-3 shadow-2xl shadow-emerald-900/20 flex items-center gap-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Check size={16} />
            </div>
            <div>
              <p className="font-bold text-sm">¡Recordatorios activados!</p>
              <p className="text-xs text-emerald-100">Te avisaremos cada día de clase.</p>
            </div>
          </div>
        </div>
      )}

      {/* Small toggle button in the header area - rendered via portal or prop */}
      {isEnabled && Notification.permission === 'granted' && (
        <div className="fixed bottom-4 right-4 z-[50]">
          <button
            onClick={handleDisableNotifications}
            className="group flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-600 shadow-lg backdrop-blur-sm transition-all hover:bg-red-50 hover:text-red-500 hover:border-red-200 cursor-pointer"
            title="Desactivar recordatorios"
            id="notification-toggle-btn"
          >
            <Bell size={14} className="group-hover:hidden" />
            <BellOff size={14} className="hidden group-hover:block" />
            <span className="hidden sm:inline group-hover:hidden">Recordatorios ON</span>
            <span className="hidden sm:inline hidden group-hover:inline">Desactivar</span>
          </button>
        </div>
      )}

      {/* Re-enable button when dismissed but permission available */}
      {!isEnabled && !showPrompt && Notification.permission !== 'denied' && turnosFijos.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[50]">
          <button
            onClick={handleEnableNotifications}
            className="flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 shadow-lg backdrop-blur-sm transition-all hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 cursor-pointer"
            title="Activar recordatorios de clase"
            id="notification-reenable-btn"
          >
            <BellOff size={14} />
            <span className="hidden sm:inline">Recordatorios</span>
          </button>
        </div>
      )}
    </>
  );
};

export default NotificationManager;
