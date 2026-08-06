// src/components/GoogleSignIn.tsx
import React, { useState, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { Mail, ArrowRight, AlertCircle, ShieldCheck, Lock, ChevronLeft } from 'lucide-react';
import logoKaha from '../../assets/logokaha.png';

// Decodes Google's credential JWT securely on the client-side
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

export const GoogleSignIn: React.FC = () => {
  const { signInWithGoogle } = useGym();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [btnLoaded, setBtnLoaded] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Load custom client ID from localStorage or environment
  const clientId = localStorage.getItem('gym_google_client_id') || 
                   ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) || 
                   '476950168779-qoejj8elncpaetpc8elreo5dmkgubedv.apps.googleusercontent.com';

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const renderGoogleButton = () => {
      const google = (window as any).google;

      if (google && google.accounts && google.accounts.id) {
        const btnContainer = document.getElementById('google-real-btn-container');
        if (btnContainer) {
          clearInterval(interval);
          try {
            google.accounts.id.initialize({
              client_id: clientId,
              callback: (response: any) => {
                setLoading(true);
                const payload = decodeJwt(response.credential);
                if (payload) {
                  setTimeout(async () => {
                    await signInWithGoogle(payload.email, payload.name || payload.given_name, payload.picture);
                    setLoading(false);
                  }, 800);
                } else {
                  setErrorMsg('Error al decodificar la respuesta segura de Google.');
                  setLoading(false);
                }
              },
              auto_select: false,
            });

            btnContainer.innerHTML = '';
            google.accounts.id.renderButton(btnContainer, {
              theme: 'filled_blue',
              size: 'large',
              text: 'signin_with',
              shape: 'pill',
              width: '320',
              logo_alignment: 'left'
            });
            setBtnLoaded(true);
          } catch (error) {
            console.error("Failed to render Google login button:", error);
          }
        }
      }
    };

    interval = setInterval(renderGoogleButton, 800);
    renderGoogleButton();

    return () => {
      clearInterval(interval);
      const btnContainer = document.getElementById('google-real-btn-container');
      if (btnContainer) {
        btnContainer.innerHTML = '';
      }
    };
  }, [clientId]);

  const handleCustomEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!customEmail.trim() || !customEmail.includes('@')) {
      setErrorMsg('Ingresá un correo electrónico válido.');
      return;
    }

    setLoading(true);
    try {
      const mailClean = customEmail.trim().toLowerCase();
      const defaultName = mailClean.split('@')[0];
      await signInWithGoogle(mailClean, defaultName);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al iniciar sesión con el correo ingresado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-xs select-none relative" id="google-signin-wrapper">
      
      {/* Soft background radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.12),transparent_70%)] pointer-events-none"></div>

      {/* CARD WITH GREEN EMERALD GLOW */}
      <div className="w-full max-w-md bg-white border border-emerald-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500/20 relative z-10 space-y-6 animate-scale-in">
        
        {/* BRAND HEADER WITH WHITE BACKGROUND LOGO */}
        <div className="text-center space-y-3">
          <div className="flex flex-col justify-center items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/90 shadow-md p-2.5 flex items-center justify-center ring-4 ring-emerald-500/10">
              <img src={logoKaha} alt="KAHA GYM Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-center space-y-0.5">
              <h1 className="font-display text-2xl font-black text-zinc-900 tracking-tight">
                KAHA GYM
              </h1>
              <p className="text-emerald-600 text-[10px] uppercase font-mono tracking-widest font-bold">
                Gestión Integral de Gimnasio
              </p>
            </div>
          </div>

          <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
            Iniciá sesión para acceder a tu panel de socio, profesor o administrador.
          </p>
        </div>

        {/* LOADING STATE OR LOGIN OPTIONS */}
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 p-6">
            <div className="relative">
              <div className="w-11 h-11 rounded-full border-3 border-emerald-200 border-t-emerald-600 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="text-center space-y-0.5">
              <p className="text-zinc-900 font-bold text-xs">Verificando cuenta...</p>
              <p className="text-slate-500 text-[10px]">Iniciando sesión segura</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            
            {/* GOOGLE SIGN-IN SECTION WITH GREEN BACKGROUND */}
            <div className="bg-gradient-to-b from-emerald-50/80 to-teal-50/60 border border-emerald-200 rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 shadow-xs">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
                <Lock className="w-3 h-3 text-emerald-600" /> Acceso Rápido con Google
              </span>

              {/* GRADIENT EMERALD GOOGLE BUTTON CONTAINER */}
              <div className="relative w-full max-w-[320px] mx-auto group">
                {/* Visual Gradient Button */}
                <div className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 group-hover:from-emerald-500 group-hover:to-teal-500 text-white font-extrabold rounded-full text-xs flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/30 transition-all duration-300 pointer-events-none border border-emerald-400/40 tracking-wide uppercase">
                  <div className="w-6 h-6 bg-white rounded-full p-1 flex items-center justify-center shrink-0 shadow-xs">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </div>
                  <span>Acceder con Google</span>
                </div>

                {/* Real Google SDK Button Overlay (Transparent over gradient button) */}
                <div 
                  key="google-real-btn-container-key"
                  id="google-real-btn-container" 
                  className="absolute inset-0 opacity-0 cursor-pointer overflow-hidden flex items-center justify-center"
                ></div>
              </div>

              {!btnLoaded && (
                <div className="text-emerald-700 text-xs flex items-center gap-2 py-2 font-medium">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-300 border-t-emerald-600 animate-spin"></div>
                  <span>Cargando botón de Google...</span>
                </div>
              )}
            </div>

            {/* CUSTOM EMAIL BUTTON OR FORM */}
            {!showEmailForm ? (
              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-between border border-slate-200 transition-all cursor-pointer shadow-xs group"
              >
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span>Ingresar con correo o Hotmail</span>
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <form onSubmit={handleCustomEmailSubmit} className="space-y-3 bg-slate-50/80 p-4 border border-slate-200 rounded-2xl animate-scale-in">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" /> Correo Electrónico
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" /> Volver
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="ejemplo@hotmail.com / gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden text-zinc-900 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Continuar con este Correo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ERROR & SUCCESS MESSAGES */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[11px] font-semibold text-center flex items-center gap-2 justify-center">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-[11px] font-semibold text-center">
                {successMsg}
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="pt-2 text-center border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Autenticación Encriptada
          </span>
          <span className="font-mono">KAHA GYM © 2026</span>
        </div>

      </div>
    </div>
  );
};
