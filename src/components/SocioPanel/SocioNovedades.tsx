// src/components/SocioPanel/SocioNovedades.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Megaphone, Award, User, Search } from 'lucide-react';

export const SocioNovedades: React.FC = () => {
  const { novedades } = useGym();
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [buscarText, setBuscarText] = useState<string>('');

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { TODAS: novedades.length };
    novedades.forEach(n => {
      counts[n.categoria] = (counts[n.categoria] || 0) + 1;
    });
    return counts;
  }, [novedades]);

  const filteredNovedades = useMemo(() => {
    return novedades
      .filter(n => {
        if (filterCategory !== 'TODAS' && n.categoria !== filterCategory) return false;
        if (buscarText.trim()) {
          const q = buscarText.toLowerCase();
          return n.titulo.toLowerCase().includes(q) || n.contenido.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.destacado && !b.destacado) return -1;
        if (!a.destacado && b.destacado) return 1;
        return b.fecha.localeCompare(a.fecha);
      });
  }, [novedades, filterCategory, buscarText]);

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6.5 lg:p-8 shadow-sm space-y-6 animate-fade-in" id="socio-novedades-cartelera">
      
      {/* HEADER */}
      <div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2 mb-2 pb-3 border-b border-slate-100">
          <Megaphone className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
          CARTELERA OFICIAL DE SOCIOS Y CIRCULARES
        </h3>
        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
          Mantente informado con las novedades vigentes, reajustes de tarifas, avisos de mantenimiento y anuncios excepcionales publicados por el equipo administrativo.
        </p>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pb-2 border-b border-slate-100">
        <div className="flex flex-wrap gap-1.5">
          {(['TODAS', 'ARANCELES', 'TURNOS', 'INFORMACION', 'EVENTOS'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                filterCategory === cat 
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span>{cat === 'TODAS' ? 'Todas' : cat}</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                filterCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {categoryCounts[cat] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar en la cartelera..."
            value={buscarText}
            onChange={(e) => setBuscarText(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-sans focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {filteredNovedades.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50 border border-slate-100 rounded-2xl p-6">
          No hay publicaciones ni comunicados que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredNovedades.map((nov) => {
            const isArancel = nov.categoria === 'ARANCELES';
            const isTurno = nov.categoria === 'TURNOS';
            const isEvento = nov.categoria === 'EVENTOS';

            // Per-category color scheme
            let cardBg = 'bg-gradient-to-br from-sky-50 to-sky-100/60 border-sky-200';
            let badgeCls = 'bg-sky-500/15 text-sky-800 border-sky-300';
            let titleCls = 'text-sky-950';
            let bodyCls = 'text-sky-900/80';
            let footerCls = 'border-sky-200/60 text-sky-600/70';
            let accentBar = 'bg-sky-500';
            let labelTxt = 'Información General';

            if (isArancel) {
              cardBg = 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 border-emerald-200';
              badgeCls = 'bg-emerald-500/15 text-emerald-800 border-emerald-300';
              titleCls = 'text-emerald-950';
              bodyCls = 'text-emerald-900/80';
              footerCls = 'border-emerald-200/60 text-emerald-600/70';
              accentBar = 'bg-emerald-500';
              labelTxt = 'Aranceles y Pagos';
            } else if (isTurno) {
              cardBg = 'bg-gradient-to-br from-teal-50 to-teal-100/60 border-teal-200';
              badgeCls = 'bg-teal-500/15 text-teal-800 border-teal-300';
              titleCls = 'text-teal-950';
              bodyCls = 'text-teal-900/80';
              footerCls = 'border-teal-200/60 text-teal-700/70';
              accentBar = 'bg-teal-500';
              labelTxt = 'Horarios y Turnos';
            } else if (isEvento) {
              cardBg = 'bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-200';
              badgeCls = 'bg-amber-500/15 text-amber-800 border-amber-300';
              titleCls = 'text-amber-950';
              bodyCls = 'text-amber-900/80';
              footerCls = 'border-amber-200/60 text-amber-700/70';
              accentBar = 'bg-amber-500';
              labelTxt = 'Talleres y Eventos';
            }

            return (
              <div
                key={nov.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 relative overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${cardBg} ${
                  nov.destacado ? 'ring-2 ring-amber-400/40' : ''
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentBar}`}></div>

                {nov.destacado && (
                  <span className="absolute top-0 right-0 bg-amber-500 text-white px-2.5 py-0.5 rounded-bl-xl text-[8px] font-black uppercase tracking-widest font-mono flex items-center gap-1">
                    <Award className="w-3 h-3 text-white" />
                    DESTACADO
                  </span>
                )}

                <div className="space-y-3 pl-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 border rounded-md text-[8.5px] font-black uppercase tracking-wider font-mono ${badgeCls}`}>
                      {labelTxt}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{nov.fecha}</span>
                  </div>

                  <h4 className={`font-bold leading-snug tracking-tight text-sm md:text-base font-sans mt-1 ${titleCls}`}>
                    {nov.titulo}
                  </h4>

                  <p className={`text-xs font-sans whitespace-pre-line leading-relaxed ${bodyCls}`}>
                    {nov.contenido}
                  </p>
                </div>

                <div className={`pt-3 border-t flex items-center gap-1 text-[9.5px] font-sans mt-auto pl-2 ${footerCls}`}>
                  <User className="w-3 h-3" />
                  <span>Publicado por la administración</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
