// src/components/Onboarding/OnboardingModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Calendar, CreditCard, MessageSquare, Dumbbell, 
  ChevronRight, ChevronLeft, CheckCircle2, ShieldCheck, DollarSign, Users, X
} from 'lucide-react';
import { RolUsuario } from '../../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rol: RolUsuario;
  nombreUsuario?: string;
}

interface StepContent {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  highlights: string[];
  gradient: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  rol,
  nombreUsuario
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSocio = rol === 'SOCIO';

  const socioSteps: StepContent[] = [
    {
      title: `¡Bienvenido a KAHA GYM, ${nombreUsuario || 'Socio'}! 👋`,
      subtitle: 'Tu plataforma de entrenamiento y gestión de clases',
      description: 'Diseñamos este espacio para que tengas control total de tu gimnasio desde tu celular o computadora.',
      icon: <Dumbbell className="w-10 h-10 text-emerald-500" />,
      badge: 'Bienvenida',
      highlights: [
        'Reserva tus clases con 1 clic',
        'Seguimiento en tiempo real de tu cuota',
        'Notificaciones de WhatsApp al instante'
      ],
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent'
    },
    {
      title: 'Reserva y Recupero de Turnos 📅',
      subtitle: 'Gestioná tus horarios y asistencias fácilmente',
      description: 'Consultá tus días fijos asignados o reservá turnos variables. Si no podés asistir a una clase, podés solicitar recupero dentro del plazo permitido.',
      icon: <Calendar className="w-10 h-10 text-violet-500" />,
      badge: 'Turnos',
      highlights: [
        'Visualizá el cupo disponible por horario',
        'Lista de espera automática si un turno está lleno',
        'Reintegrá tus créditos avisando con anticipación'
      ],
      gradient: 'from-violet-500/20 via-purple-500/10 to-transparent'
    },
    {
      title: 'Pagos y Estado de Cuenta 💳',
      subtitle: 'Transparencia total en tus aranceles',
      description: 'Revisá si tu cuota está al día, el desglose de tu plan contratado e informá transferencias de pago subiendo tu comprobante.',
      icon: <CreditCard className="w-10 h-10 text-amber-500" />,
      badge: 'Pagos',
      highlights: [
        'Estado en tiempo real: Al día o Con Deuda',
        'Avisos de vencimiento sin sorpresas',
        'Historial completo de pagos registrados'
      ],
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent'
    },
    {
      title: 'Avisos y Comunicación Directa 📱',
      subtitle: 'Enterate de las novedades al instante',
      description: 'Recibí alertas importantes sobre feriados, cortes de luz o avisos del profesor directo en tu WhatsApp o en el panel de novedades.',
      icon: <MessageSquare className="w-10 h-10 text-sky-500" />,
      badge: 'Novedades',
      highlights: [
        'Pizarra de novedades del gimnasio',
        'Contacto directo con los profesores',
        'Avisos automáticos de cualquier cambio'
      ],
      gradient: 'from-sky-500/20 via-blue-500/10 to-transparent'
    },
    {
      title: '¡Todo listo para empezar a entrenar! 🚀',
      subtitle: 'Que tengas un gran entrenamiento',
      description: 'Ya podés comenzar a navegar por tu panel de socio y aprovechar todas las herramientas de KAHA GYM.',
      icon: <Sparkles className="w-10 h-10 text-emerald-400 animate-bounce" />,
      badge: 'Listo',
      highlights: [
        'Navegá tus turnos en el menú principal',
        'Revisá la sección de Perfil para actualizar tu foto',
        '¡Cualquier duda consultanos!'
      ],
      gradient: 'from-emerald-500/30 via-teal-500/20 to-transparent'
    }
  ];

  const adminSteps: StepContent[] = [
    {
      title: `¡Bienvenido al Panel de Gestión! ⚡`,
      subtitle: 'Control integral y caja dividida de KAHA GYM',
      description: 'Gestioná socios, turnos, profesores, cobros y cajas de forma ágil y centralizada.',
      icon: <ShieldCheck className="w-10 h-10 text-emerald-500" />,
      badge: 'Administración',
      highlights: [
        'Gestión de Socios en tiempo real',
        'Caja Juanchi, Caja Rulo y Caja Final automática',
        'Integración con WhatsApp y Supabase'
      ],
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent'
    },
    {
      title: 'Turnera y Asistencia en Tiempo Real 📅',
      subtitle: 'Monitoreá los cupos y la asignación de profes',
      description: 'Asigná profesores a cada turno (Juanchi, Rulo, Lucas, Denise), cambiá la capacidad máxima de cupos y registrá inasistencias o recuperos.',
      icon: <Users className="w-10 h-10 text-violet-500" />,
      badge: 'Turnera',
      highlights: [
        'Filtro dinámico de turnos por día y hora',
        'Botonera de avisos por WhatsApp a alumnos del turno',
        'Filtro de socios por profesor (solo o combinados)'
      ],
      gradient: 'from-violet-500/20 via-purple-500/10 to-transparent'
    },
    {
      title: 'Caja Dividida y Cobros 💰',
      subtitle: 'Caja Juanchi + Caja Rulo = Caja Final',
      description: 'Registrá pagos en efectivo, transferencias y Mercado Pago. El sistema calcula automáticamente la rendición individual y el total consolidado.',
      icon: <DollarSign className="w-10 h-10 text-amber-500" />,
      badge: 'Finanzas',
      highlights: [
        'Resumen de Caja Juanchi y Caja Rulo en tiempo real',
        'Aprobación / Rechazo de transferencias en revisión',
        'Filtros por mes, medio de pago y estado moroso'
      ],
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent'
    },
    {
      title: '¡Operación Lista! 🚀',
      subtitle: 'Todo configurado para la administración',
      description: 'Podés volver a abrir esta guía tutorial en cualquier momento desde el botón de ayuda en la barra superior.',
      icon: <Sparkles className="w-10 h-10 text-emerald-400 animate-bounce" />,
      badge: 'Comenzar',
      highlights: [
        'Accedé al menú de navegación lateral',
        'Configurá aranceles y planes de socios',
        '¡Éxitos en la jornada de entrenamiento!'
      ],
      gradient: 'from-emerald-500/30 via-teal-500/20 to-transparent'
    }
  ];

  const steps = isSocio ? socioSteps : adminSteps;
  const current = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md animate-fade-in select-none" id="onboarding-modal-overlay">
      <div className="relative w-full max-w-lg bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        
        {/* TOP ACCENT GRADIENT HEADER */}
        <div className={`h-32 bg-gradient-to-br ${current.gradient} relative flex items-center justify-between px-6 border-b border-zinc-100 transition-all duration-500`}>
          <div className="w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-sm border border-white shadow-md flex items-center justify-center">
            {current.icon}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-wider rounded-full shadow-xs">
              {current.badge}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-zinc-500 hover:text-zinc-900 border border-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar onboarding"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEP BODY */}
        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">
              {current.title}
            </h2>
            <p className="text-xs font-semibold text-emerald-600">
              {current.subtitle}
            </p>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            {current.description}
          </p>

          {/* HIGHLIGHT BULLETS */}
          <div className="bg-zinc-50/80 border border-zinc-200/80 rounded-2xl p-4 space-y-2.5">
            {current.highlights.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-zinc-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* PROGRESS INDICATOR DOTS */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    i === currentStep 
                      ? 'w-6 bg-emerald-600' 
                      : 'w-2 bg-zinc-200 hover:bg-zinc-300'
                  }`}
                  title={`Ir al paso ${i + 1}`}
                />
              ))}
            </div>
            <span className="text-[11px] font-bold text-zinc-400 font-mono">
              Paso {currentStep + 1} de {steps.length}
            </span>
          </div>

          {/* FOOTER BUTTONS */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                Omitir tutorial
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>{currentStep === steps.length - 1 ? 'Comenzar Experiencia' : 'Siguiente'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
