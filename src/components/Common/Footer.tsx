// src/components/Common/Footer.tsx
import React from 'react';
import { MapPin } from 'lucide-react';
import logoKaha from '../../assets/logokaha.png';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 pt-6 pb-20 lg:pb-8 border-t border-slate-200 text-slate-500 font-sans text-xs" id="kaha-site-footer">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3 text-slate-700 font-medium text-center sm:text-left">
          <img src={logoKaha} alt="KAHA GYM Logo" className="w-8 h-8 rounded-xl object-contain shrink-0 shadow-xs" />
          <div>
            <span className="font-bold text-slate-900 block leading-tight">KAHA GYM — Sede Principal</span>
            <span className="text-[11px] text-slate-500 font-mono">Dirección: Ramón L. Falcón 5330, CABA</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* INSTAGRAM */}
          <a
            href="https://www.instagram.com/kaha.ft/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold transition-all border border-slate-200/60 shadow-2xs"
            title="Instagram @kaha.ft"
            id="footer-link-instagram"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" className="bi bi-instagram text-rose-600" viewBox="0 0 16 16">
              <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04 1.25.26 2.054.606 2.91.31.78.73 1.442 1.418 2.13.688.688 1.35 1.108 2.13 1.418.856.346 1.66.566 2.91.606.853.038 1.125.048 3.297.048 2.172 0 2.444-.01 3.298-.048 1.249-.04 2.053-.26 2.909-.606a4.0 4.0 0 0 0 2.13-1.418 4.0 4.0 0 0 0 1.418-2.13c.346-.856.566-1.66.606-2.91.038-.853.048-1.125.048-3.297 0-2.172-.01-2.444-.048-3.298-.04-1.249-.26-2.053-.606-2.909a4.0 4.0 0 0 0-1.418-2.13A4.0 4.0 0 0 0 13.2.42c-.856-.346-1.66-.566-2.91-.606C9.444.01 9.172 0 7.999 0zm-.08 1.441c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.844-.039 1.096-.047 3.232-.047zM8 3.892a4.108 4.108 0 1 0 0 8.216 4.108 4.108 0 0 0 0-8.216zm0 6.775a2.667 2.667 0 1 1 0-5.334 2.667 2.667 0 0 1 0 5.334zm5.23-6.937a.96.96 0 1 1-1.92 0 .96.96 0 0 1 1.92 0z"/>
            </svg>
            <span>Instagram</span>
          </a>

          {/* WHATSAPP */}
          <a
            href="https://wa.me/541178402722"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold transition-all border border-emerald-200/70 shadow-2xs"
            title="WhatsApp KAHA GYM"
            id="footer-link-whatsapp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" className="bi bi-whatsapp text-emerald-600" viewBox="0 0 16 16">
              <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
            </svg>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
