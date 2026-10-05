// src/components/Turnos/TurnoExportModal.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { Cliente, Turno } from '../../types';
import { 
  Download, Copy, Check, X, Calendar, Moon, Sun, 
  ChevronLeft, ChevronRight, Eye, Sparkles, Layers, Share2, ExternalLink
} from 'lucide-react';
import { hoyArgentina, semanaOffsetInicial, etiquetaSemanaRelativa } from '../../lib/fechas';
import { esperaDelTurno } from '../../lib/listaEspera';
import { estaSuspendido } from '../../lib/ocupacion';

interface TurnoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'SEMANAL' | 'FIJA';
}

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const;
const DIAS_LABELS: Record<string, string> = {
  LUNES: 'LUNES',
  MARTES: 'MARTES',
  MIERCOLES: 'MIÉRCOLES',
  JUEVES: 'JUEVES',
  VIERNES: 'VIERNES'
};

const HORAS = [
  '07:30', '08:30', '09:30', '10:30', '11:30', '12:00',
  '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

export const TurnoExportModal: React.FC<TurnoExportModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'SEMANAL'
}) => {
  const { turnos, clientes, recuperos, waitlistReservas, sociosPrioritarios } = useGym();

  const [mode, setMode] = useState<'SEMANAL' | 'FIJA'>(initialMode);
  const [weekOffset, setWeekOffset] = useState<number>(() => semanaOffsetInicial());
  const [theme, setTheme] = useState<'DARK' | 'LIGHT'>('DARK');
  const [showProfesor, setShowProfesor] = useState<boolean>(true);
  const [showDesglose, setShowDesglose] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [canShareFiles, setCanShareFiles] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mobile and Web Share detection
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);
      setIsMobileDevice(Boolean(mobile));

      if (typeof File !== 'undefined' && typeof navigator.canShare === 'function') {
        try {
          const testFile = new File([''], 'test.png', { type: 'image/png' });
          setCanShareFiles(navigator.canShare({ files: [testFile] }));
        } catch {
          setCanShareFiles(false);
        }
      }
    }
  }, []);

  // Sync mode if initialMode changes when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setWeekOffset(semanaOffsetInicial());
      setCopied(false);
    }
  }, [isOpen, initialMode]);

  // Compute dates for the selected week
  const weekDates = useMemo(() => {
    const [y, m, d] = hoyArgentina().split('-').map(Number);
    const today = new Date(y, m - 1, d);
    const currentDay = today.getDay();
    const datesMap: Record<string, string> = {};
    const DAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

    const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
    const mondayDate = new Date(today);
    mondayDate.setDate(today.getDate() + mondayDiff + (weekOffset * 7));

    for (let i = 1; i <= 5; i++) {
      const date = new Date(mondayDate);
      date.setDate(mondayDate.getDate() + (i - 1));
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      datesMap[DAYS[i]] = `${yyyy}-${mm}-${dd}`;
    }
    return datesMap;
  }, [weekOffset]);

  // Label for the week
  const weekLabel = useMemo(() => {
    const lunes = weekDates['LUNES'];
    const viernes = weekDates['VIERNES'];
    if (!lunes || !viernes) return '';
    const [yL, mL, dL] = lunes.split('-').map(Number);
    const [yV, mV, dV] = viernes.split('-').map(Number);
    const dateL = new Date(yL, mL - 1, dL);
    const dateV = new Date(yV, mV - 1, dV);
    const opt: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return `${dateL.toLocaleDateString('es-AR', opt)} al ${dateV.toLocaleDateString('es-AR', opt)}`;
  }, [weekDates]);

  // Real-time slot calculation helper
  const getCellRealtimeData = (turnoId: string, fecha: string) => {
    const turno = turnos.find(t => t.id === turnoId);
    if (!turno) return { fijos: [], fijosActivos: [], suspendidos: [], variables: [], recuperos: [], waitlist: [], total: 0, cupo: 0, profesor: '' };

    const fijos = (turno.asignados_ids || []).map(id => clientes.find(c => c.id === id)).filter(Boolean) as Cliente[];
    const suspendidos = fijos.filter(c => estaSuspendido(c, turno.id, fecha));
    const fijosActivos = fijos.filter(c => !suspendidos.some(s => s.id === c.id));
    const fijoIds = new Set(turno.asignados_ids || []);
    const vars = clientes.filter(c => c.activo && !fijoIds.has(c.id) && (c.reservas_individuales || []).some(r => r.turno_id === turno.id && r.fecha === fecha));
    const recs = recuperos.filter(r => (r.estado === 'PENDIENTE' || r.estado === 'COMPLETADO') && r.turno_recupero_id === turno.id && r.fecha_recupero === fecha);
    const waitlist = esperaDelTurno(waitlistReservas, turno.id, fecha, sociosPrioritarios, { clientes, turnos });

    return {
      turno,
      fijos,
      suspendidos,
      fijosActivos,
      variables: vars,
      recuperos: recs,
      waitlist,
      total: fijosActivos.length + vars.length + recs.length,
      cupo: turno.cupo_maximo,
      profesor: turno.profesor || ''
    };
  };

  // Render on canvas whenever state changes
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina 2x scale for ultra crisp text and high-res export
    const scale = 2;
    const logicalW = 1440;
    const logicalH = 1180;

    canvas.width = logicalW * scale;
    canvas.height = logicalH * scale;

    ctx.save();
    ctx.scale(scale, scale);

    const isDark = theme === 'DARK';

    // 1. Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, logicalH);
    if (isDark) {
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#05070c');
    } else {
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(1, '#f1f5f9');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, logicalW, logicalH);

    // 2. Header Box
    const headerY = 32;
    const headerH = 110;
    const paddingX = 40;
    const contentW = logicalW - paddingX * 2;

    ctx.fillStyle = isDark ? '#111827' : '#ffffff';
    ctx.strokeStyle = isDark ? '#1f293d' : '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawRoundedRect(ctx, paddingX, headerY, contentW, headerH, 16);
    ctx.fill();
    ctx.stroke();

    // Brand Pill
    const pillX = paddingX + 24;
    const pillY = headerY + 20;
    ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
    ctx.beginPath();
    drawRoundedRect(ctx, pillX, pillY, 160, 26, 13);
    ctx.fill();

    // Green dot
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(pillX + 16, pillY + 13, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDark ? '#a3e635' : '#15803d';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('KAHA BOX & GYM', pillX + 28, pillY + 17);

    // Title
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    const mainTitle = mode === 'SEMANAL' 
      ? 'TURNERA SEMANAL — TIEMPO REAL' 
      : 'MATRIZ FIJA SEMANAL — HORARIOS HABITUALES';
    ctx.fillText(mainTitle, pillX, pillY + 54);

    // Subtitle
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '500 13px system-ui, -apple-system, sans-serif';
    const subTitle = mode === 'SEMANAL'
      ? `Semana del ${weekLabel} · Todos los horarios activos y cupos en tiempo real`
      : 'Grilla semanal de asistencia fija regular y cupos máximos por horario';
    ctx.fillText(subTitle, pillX, pillY + 76);

    // Right-side badge in header
    const rightBadgeW = 200;
    const rightBadgeX = paddingX + contentW - rightBadgeW - 24;
    const rightBadgeY = headerY + 30;
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawRoundedRect(ctx, rightBadgeX, rightBadgeY, rightBadgeW, 52, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUNES A VIERNES', rightBadgeX + rightBadgeW / 2, rightBadgeY + 22);

    ctx.fillStyle = isDark ? '#e2e8f0' : '#334155';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('13 HORARIOS COMPLETOS', rightBadgeX + rightBadgeW / 2, rightBadgeY + 40);
    ctx.textAlign = 'left';

    // 3. Table Layout
    const tableY = headerY + headerH + 18;
    const thHeight = 46;
    const colHoraW = 100;
    const colDayW = (contentW - colHoraW) / 5; // 5 days: 252px each
    const rowH = 64;

    // Table Header Background
    ctx.fillStyle = isDark ? '#0f172a' : '#1e293b';
    ctx.beginPath();
    drawRoundedRect(ctx, paddingX, tableY, contentW, thHeight, 12);
    ctx.fill();

    // Table Header Titles
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';

    // Header: Hora
    ctx.fillText('HORA', paddingX + colHoraW / 2, tableY + 28);

    // Header: Days
    DIAS.forEach((dia, idx) => {
      const colX = paddingX + colHoraW + idx * colDayW;
      const label = DIAS_LABELS[dia];
      const dateStr = weekDates[dia];
      const dateText = mode === 'SEMANAL' && dateStr 
        ? `${dateStr.split('-')[2]}/${dateStr.split('-')[1]}`
        : '';

      if (dateText) {
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(label, colX + colDayW / 2, tableY + 20);
        ctx.font = '500 10px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(dateText, colX + colDayW / 2, tableY + 34);
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
        ctx.fillText(label, colX + colDayW / 2, tableY + 28);
      }
    });

    // 4. Grid Rows
    HORAS.forEach((hora, rowIdx) => {
      const currentY = tableY + thHeight + 8 + rowIdx * (rowH + 3);

      // Hour Cell Box
      ctx.fillStyle = isDark ? '#141d2e' : '#f1f5f9';
      ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      drawRoundedRect(ctx, paddingX, currentY, colHoraW - 4, rowH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hora, paddingX + (colHoraW - 4) / 2, currentY + rowH / 2 + 5);

      // Day Cells
      DIAS.forEach((dia, colIdx) => {
        const cellX = paddingX + colHoraW + colIdx * colDayW + 3;
        const cellW = colDayW - 6;

        const idTurno = `${dia}-${hora}`;
        const fechaStr = weekDates[dia];

        // Rules for inactive hours
        const noSeDicta =
          (hora === '15:00' && dia !== 'MARTES' && dia !== 'JUEVES' && dia !== 'VIERNES') ||
          (hora === '11:30' && dia !== 'LUNES' && dia !== 'MIERCOLES' && dia !== 'VIERNES') ||
          (hora === '12:00' && dia === 'MIERCOLES');

        if (noSeDicta) {
          // Inactive slot
          ctx.fillStyle = isDark ? '#0c101a' : '#f8fafc';
          ctx.strokeStyle = isDark ? '#182030' : '#f1f5f9';
          ctx.beginPath();
          drawRoundedRect(ctx, cellX, currentY, cellW, rowH, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
          ctx.font = 'bold 16px system-ui, sans-serif';
          ctx.fillText('—', cellX + cellW / 2, currentY + rowH / 2 + 5);
          return;
        }

        // Active slot data
        let totalCount = 0;
        let cupoMax = 0;
        let profesor = '';
        let subline = '';

        if (mode === 'SEMANAL') {
          const rtData = getCellRealtimeData(idTurno, fechaStr);
          totalCount = rtData.total;
          cupoMax = rtData.cupo;
          profesor = rtData.profesor;
          if (showDesglose) {
            subline = `F:${rtData.fijosActivos.length} · V:${rtData.variables.length} · R:${rtData.recuperos.length}${rtData.waitlist.length > 0 ? ` · W:${rtData.waitlist.length}` : ''}`;
          } else {
            subline = `Vacantes: ${Math.max(0, cupoMax - totalCount)}`;
          }
        } else {
          const slotTurno = turnos.find(t => t.id === idTurno);
          totalCount = slotTurno ? slotTurno.asignados_ids.length : 0;
          cupoMax = slotTurno ? slotTurno.cupo_maximo : 0;
          profesor = slotTurno?.profesor || '';
          subline = `Vacantes: ${Math.max(0, cupoMax - totalCount)}`;
        }

        const ratio = cupoMax > 0 ? (totalCount / cupoMax) * 100 : 0;

        // Theme colors for cells
        let cellBg = '';
        let cellBorder = '';
        let textPri = '';
        let textSec = '';

        if (isDark) {
          if (ratio < 70) {
            cellBg = '#062d22';
            cellBorder = '#059669';
            textPri = '#a7f3d0';
            textSec = '#6ee7b7';
          } else if (ratio < 90) {
            cellBg = '#381e05';
            cellBorder = '#d97706';
            textPri = '#fde68a';
            textSec = '#fcd34d';
          } else {
            cellBg = '#400918';
            cellBorder = '#e11d48';
            textPri = '#fecdd3';
            textSec = '#fda4af';
          }
        } else {
          if (ratio < 70) {
            cellBg = '#ecfdf5';
            cellBorder = '#a7f3d0';
            textPri = '#065f46';
            textSec = '#047857';
          } else if (ratio < 90) {
            cellBg = '#fffbeb';
            cellBorder = '#fde68a';
            textPri = '#92400e';
            textSec = '#b45309';
          } else {
            cellBg = '#fff1f2';
            cellBorder = '#fecdd3';
            textPri = '#9f1239';
            textSec = '#be123c';
          }
        }

        ctx.fillStyle = cellBg;
        ctx.strokeStyle = cellBorder;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        drawRoundedRect(ctx, cellX, currentY, cellW, rowH, 8);
        ctx.fill();
        ctx.stroke();

        // Line 1: Primary Count
        ctx.fillStyle = textPri;
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        const labelMain = mode === 'SEMANAL'
          ? `${totalCount} / ${cupoMax} ocupados`
          : `${totalCount} / ${cupoMax} fijos`;
        ctx.fillText(labelMain, cellX + cellW / 2, currentY + 20);

        // Line 2: Subline (Desglose o Vacantes)
        ctx.fillStyle = textSec;
        ctx.font = 'bold 9.5px monospace';
        ctx.fillText(subline, cellX + cellW / 2, currentY + 35);

        // Line 3: Coach name if exists and toggle enabled
        if (showProfesor && profesor) {
          ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
          ctx.font = 'bold 9.5px system-ui, sans-serif';
          ctx.fillText(`👤 ${profesor}`, cellX + cellW / 2, currentY + 50);
        }
      });
    });

    // 5. Footer & Legend
    const footerY = tableY + thHeight + 8 + HORAS.length * (rowH + 3) + 12;

    // Legend items
    const legends = [
      { color: '#10b981', label: 'Libre (<70% ocupado)' },
      { color: '#f59e0b', label: 'Saturación (70% a 89%)' },
      { color: '#ef4444', label: 'Completo (≥90%)' }
    ];

    let legX = paddingX + 10;
    legends.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(legX + 6, footerY + 12, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legX + 18, footerY + 16);
      legX += ctx.measureText(item.label).width + 36;
    });

    // Right footer text
    ctx.textAlign = 'right';
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '500 11px system-ui, sans-serif';
    const fechaHoraGen = new Date().toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    ctx.fillText(`Generado el ${fechaHoraGen} hs · KAHA GYM Sistema Oficial`, paddingX + contentW - 10, footerY + 16);

    ctx.restore();

    // Generate blob preview URL for real <img> tag (essential for mobile long-press)
    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    }, 'image/png');
  }, [isOpen, mode, weekOffset, theme, showProfesor, showDesglose, weekDates, weekLabel, turnos, clientes, recuperos, waitlistReservas, sociosPrioritarios]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  // Universal Download / Share Handler for Desktop and Mobile (iOS / Android)
  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);

    const fileName = mode === 'SEMANAL' 
      ? `kaha-gym-turnera-semanal-${weekDates['LUNES'] || 'semana'}.png`
      : 'kaha-gym-matriz-fija-semanal.png';

    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
      if (!blob) throw new Error('No se pudo generar la imagen');

      // 1. Web Share API (Primary and native on iOS Safari & Android Chrome)
      if (typeof File !== 'undefined' && typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Turnera KAHA GYM',
              text: mode === 'SEMANAL' ? `Turnera Semanal KAHA GYM (${weekLabel})` : 'Matriz Fija Semanal KAHA GYM'
            });
            return;
          }
        } catch (shareErr: any) {
          // If the user cancelled or swiped down the share sheet, exit smoothly
          if (shareErr?.name === 'AbortError') return;
          console.warn('Web Share intentó y falló, continuando con fallback de descarga:', shareErr);
        }
      }

      // 2. Blob URL Download (Standard for Desktop Chrome, Firefox, Edge, Safari Desktop)
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = blobUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up after small delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch (err: any) {
      console.error('Error al descargar o compartir imagen:', err);

      // 3. Fallback: Open image in new window/tab so user can long-press to save
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const w = window.open('');
        if (w) {
          w.document.write(`<title>Turnera KAHA GYM</title><body style="margin:0;background:#090d16;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;"><img src="${dataUrl}" style="max-width:100%;height:auto;display:block;" alt="Turnera KAHA GYM"/><p style="color:#fff;font-family:sans-serif;text-align:center;padding:16px;font-size:14px;">Mantené presionada la imagen para Guardar en Fotos o Compartir</p></body>`);
        }
      } catch (fallbackErr) {
        console.error('Fallback failed:', fallbackErr);
      }
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  const handleCopyClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async blob => {
        if (!blob) return;
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } else {
          // Fallback: download if clipboard API unavailable
          handleDownload();
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Clipboard write error:', err);
      handleDownload();
    }
  };

  const handleOpenFullscreen = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    } else if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const w = window.open('');
      if (w) {
        w.document.write(`<title>Turnera KAHA GYM</title><body style="margin:0;background:#090d16;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;"><img src="${dataUrl}" style="max-width:100%;height:auto;" alt="Turnera"/><p style="color:#fff;font-family:sans-serif;padding:12px;font-size:13px;">Mantené presionada la imagen para Guardar o Compartir</p></body>`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-5 backdrop-blur-md font-sans text-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* MODAL HEADER */}
        <div className="bg-zinc-950 text-white p-3.5 sm:p-5 flex justify-between items-center shrink-0 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              {isMobileDevice ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isMobileDevice ? 'Guardar / Compartir Turnera' : 'Descargar Turnera en Imagen'}
              </h3>
              <p className="text-zinc-400 text-[11px] sm:text-xs mt-0.5 hidden xs:block">
                Grilla completa con los 13 horarios sin cortes, lista para WhatsApp o imprimir
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-2 rounded-lg transition-colors cursor-pointer border border-zinc-800"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL CONTROLS / OPTIONS */}
        <div className="p-3 sm:p-4 bg-zinc-50 border-b border-zinc-200 flex flex-col md:flex-row gap-2.5 sm:gap-4 items-stretch md:items-center justify-between shrink-0 overflow-x-auto">
          
          {/* MODO TOGGLE (SEMANAL vs FIJA) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-zinc-500 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider">Tipo:</span>
            <div className="bg-zinc-200/80 p-0.5 rounded-lg flex gap-1 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setMode('SEMANAL')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md font-bold text-[11px] sm:text-xs transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                  mode === 'SEMANAL'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Semanal (Tiempo Real)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('FIJA')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md font-bold text-[11px] sm:text-xs transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                  mode === 'FIJA'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span>Matriz Fija</span>
              </button>
            </div>
          </div>

          {/* WEEK SELECTOR (WHEN IN SEMANAL MODE) */}
          {mode === 'SEMANAL' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-500 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider">Semana:</span>
              <div className="flex items-center bg-white border border-zinc-200 rounded-lg p-0.5 sm:p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-600 cursor-pointer border-none bg-transparent"
                  title="Semana anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono font-bold text-zinc-800 text-[11px] sm:text-xs min-w-[110px] sm:min-w-[130px] text-center">
                  {weekLabel || 'Cargando...'}
                </span>
                <button
                  type="button"
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="p-1 hover:bg-zinc-100 rounded text-zinc-600 cursor-pointer border-none bg-transparent"
                  title="Semana siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {weekOffset !== semanaOffsetInicial() && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(semanaOffsetInicial())}
                  className="text-xs text-emerald-600 hover:underline font-bold cursor-pointer border-none bg-transparent"
                >
                  Actual
                </button>
              )}
            </div>
          )}

          {/* THEME & DETAILS TOGGLES */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* TEMA */}
            <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-0.5 sm:p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setTheme('DARK')}
                className={`px-2 py-1 rounded-md text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer border-none ${
                  theme === 'DARK' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Oscuro</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('LIGHT')}
                className={`px-2 py-1 rounded-md text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer border-none ${
                  theme === 'LIGHT' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Claro</span>
              </button>
            </div>

            {/* MOSTRAR PROFESORES */}
            <label className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-700 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showProfesor}
                onChange={e => setShowProfesor(e.target.checked)}
                className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Profs</span>
            </label>

            {/* DESGLOSE F/V/R */}
            {mode === 'SEMANAL' && (
              <label className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-700 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showDesglose}
                  onChange={e => setShowDesglose(e.target.checked)}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>F/V/R</span>
              </label>
            )}
          </div>
        </div>

        {/* MODAL BODY: LIVE PREVIEW CONTAINER */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-zinc-900/95 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl bg-black/40 p-2 sm:p-3 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col items-center">
            <div className="flex items-center justify-between w-full pb-2 px-1 text-zinc-400 font-sans text-[11px]">
              <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Vista previa completa (13 horarios):
              </span>
              <button
                type="button"
                onClick={handleOpenFullscreen}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Ver completa</span>
              </button>
            </div>

            {/* PREVIEW IMAGE CONTAINER (USING REAL <img> FOR MOBILE TOUCH/SAVE SUPPORT) */}
            <div className="w-full overflow-auto max-h-[46vh] sm:max-h-[52vh] rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center p-2 relative">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Turnera KAHA GYM" 
                  className="max-w-full h-auto rounded-lg shadow-lg block select-none cursor-pointer"
                  style={{ maxHeight: '44vh' }}
                  title="Mantené presionada la imagen para Guardar o Compartir"
                />
              ) : (
                <div className="py-16 text-zinc-500 font-medium text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Generando imagen de alta resolución...</span>
                </div>
              )}

              {/* Hidden Canvas used for rendering in memory */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* MOBILE TOUCH HINT BANNER */}
            <div className="w-full mt-2.5 py-1.5 px-3 bg-emerald-950/70 border border-emerald-800/60 rounded-lg text-emerald-300 text-[10.5px] sm:text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span>📱</span>
                <span>
                  <strong>Tip en celular:</strong> Podés tocar el botón verde abajo o <strong>mantener presionada la imagen</strong> arriba para guardarla directamente en tu galería de fotos.
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER WITH ACTIONS */}
        <div className="p-3 sm:p-4 bg-white border-t border-zinc-200 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between shrink-0">
          <div className="text-[11px] sm:text-xs text-zinc-500 font-medium hidden md:block">
            💡 Podés descargar el archivo o copiarlo directamente para pegar con <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded text-[10px] font-mono font-bold">Ctrl+V</kbd> en WhatsApp Web.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl font-bold transition-all cursor-pointer bg-white text-xs"
            >
              Cerrar
            </button>

            {!isMobileDevice && (
              <button
                type="button"
                onClick={handleCopyClipboard}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-300 shadow-2xs text-xs"
                title="Copiar imagen directamente al portapapeles"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-zinc-700" />}
                <span>{copied ? '¡Copiada!' : 'Copiar Imagen'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border-none shadow-sm disabled:opacity-50 text-xs sm:text-xs"
              id="btn-confirm-download-turnera"
            >
              {isMobileDevice && canShareFiles ? (
                <>
                  <Share2 className="w-4 h-4 text-emerald-100" />
                  <span>{downloading ? 'Procesando...' : 'Guardar / Compartir (Celular)'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-emerald-100" />
                  <span>{downloading ? 'Generando...' : 'Descargar Imagen PNG'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
