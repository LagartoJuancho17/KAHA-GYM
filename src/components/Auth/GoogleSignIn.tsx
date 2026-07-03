// src/components/GoogleSignIn.tsx
import React, { useState, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { Shield, Lock, Sparkles, AlertCircle } from 'lucide-react';

// Evita re-inicializar Google Identity Services (genera warnings de "initialize() called multiple times")
let gsiInitialized = false;

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

  // Load custom client ID from localStorage or environment
  const clientId = localStorage.getItem('gym_google_client_id') || 
                   ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) || 
                   '476950168779-qoejj8elncpaetpc8elreo5dmkgubedv.apps.googleusercontent.com'; // Default client ID

  // Dynamically initialize and render Google Identity Services button
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const renderGoogleButton = () => {
      const google = (window as any).google;
      console.log("🔍 Google Client SDK check:", {
        googleExists: !!google,
        accountsExists: !!(google && google.accounts),
        idExists: !!(google && google.accounts && google.accounts.id),
        containerExists: !!document.getElementById('google-real-btn-container')
      });

      if (google && google.accounts && google.accounts.id) {
        const btnContainer = document.getElementById('google-real-btn-container');
        if (btnContainer) {
          clearInterval(interval);
          try {
            console.log("🚀 Initializing Google accounts API...");
            google.accounts.id.initialize({
              client_id: clientId,
              callback: (response: any) => {
                setLoading(true);
                const payload = decodeJwt(response.credential);
                if (payload) {
                  setTimeout(() => {
                    signInWithGoogle(payload.email, payload.name || payload.given_name, payload.picture);
                    setLoading(false);
                  }, 800);
                } else {
                  setErrorMsg('Error al decodificar la respuesta segura de Google.');
                  setLoading(false);
                }
              },
              auto_select: false,
            });

            console.log("🎨 Rendering Google Sign-In button into container...");
            btnContainer.innerHTML = ''; // Clean old button
            google.accounts.id.renderButton(btnContainer, {
              theme: 'filled_blue',
              size: 'large',
              text: 'signin_with',
              shape: 'pill',
              width: '320',
              logo_alignment: 'left'
            });
            setBtnLoaded(true);
            console.log("✅ Google Sign-In button successfully loaded and state updated.");
          } catch (error) {
            console.error("❌ Failed to render Google login button:", error);
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-xs select-none relative" id="google-signin-wrapper">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.05),transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(14,165,233,0.05),transparent_50%)] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative z-10 space-y-6 animate-fade-in">
        
        {/* BRAND HEADER */}
        <div className="text-center space-y-2">

          <div className="flex flex-col justify-center items-center gap-3 mt-2">
            <div className="w-14 h-14 rounded-2xl bg-lime-300 flex items-center justify-center shadow-sm">
              <Shield className="w-7 h-7 text-zinc-900" />
            </div>
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-zinc-900 tracking-tight">KAHA GYM</h2>
              <p className="text-zinc-400 text-[10px] uppercase font-mono tracking-widest mt-0.5">Servicio de Autenticación</p>
            </div>
          </div>
          <p className="text-slate-600 text-xs mt-3">
            Para continuar, inicia sesión con tu dirección de Google. El sistema detectará automáticamente si eres **Socio**, **Profesor** o **Admin**.
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-green-600 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.48 1 0 6.48 0 13s5.48 12 12.24 12c7.06 0 11.758-4.965 11.758-11.965 0-.807-.087-1.427-.193-1.75H12.24z"/>
                </svg>
              </div>
            </div>
            <p className="text-slate-800 font-bold text-center text-xs">Verificando sesión segura con Google...</p>
            <p className="text-slate-500 text-[9px] font-mono tracking-wider">accounts.google.com/o/oauth2/v2/auth</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* REAL GOOGLE BUTTON CONTAINER */}
            <div className="flex flex-col items-center justify-center py-4 px-2 bg-slate-50 border border-slate-200 rounded-2xl gap-3">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Botón Oficial de Google</span>
              
              <div 
                key="google-real-btn-container-key"
                id="google-real-btn-container" 
                className="min-h-[44px] flex items-center justify-center"
              ></div>

              {!btnLoaded && (
                <div className="text-slate-600 text-xs flex items-center gap-2 py-2">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-green-500 animate-spin text-green-500"></div>
                  <span>Cargando componente de Google...</span>
                </div>
              )}

              <p className="text-slate-500 text-[10px] text-center px-4 leading-relaxed">
                Abre un flujo seguro en ventana flotante autenticado por servidores de Google.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[11px] font-semibold text-center flex items-center gap-2 justify-center">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl text-[11px] font-semibold text-center">
                {successMsg}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
