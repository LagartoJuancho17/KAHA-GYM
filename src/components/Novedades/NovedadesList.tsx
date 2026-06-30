// src/components/Novedades/NovedadesList.tsx
import React from 'react';
import { Novedad } from '../../types';
import { Megaphone, Calendar, User, Star, Edit3, Trash2 } from 'lucide-react';

interface NovedadesListProps {
  filteredNovedades: Novedad[];
  onEdit: (nov: Novedad) => void;
  onDelete: (id: string) => void;
  onToggleDestacada: (nov: Novedad) => void;
  filterCategory: string;
}

export const NovedadesList: React.FC<NovedadesListProps> = ({
  filteredNovedades,
  onEdit,
  onDelete,
  onToggleDestacada,
  filterCategory
}) => {
  const getCategoryTheme = (category: Novedad['categoria']) => {
    switch (category) {
      case 'ARANCELES':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-100',
          dot: 'bg-emerald-500',
          label: 'Aranceles y Pagos'
        };
      case 'TURNOS':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-100',
          dot: 'bg-teal-500',
          label: 'Horarios y Turnos'
        };
      case 'EVENTOS':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-100',
          dot: 'bg-amber-500',
          label: 'Talleres y Eventos'
        };
      default:
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-100',
          dot: 'bg-sky-500',
          label: 'Información General'
        };
    }
  };

  if (filteredNovedades.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto font-sans">
        <div className="mx-auto w-12 h-12 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center mb-3">
          <Megaphone className="w-6 h-6" />
        </div>
        <h3 className="text-slate-800 font-sans font-bold text-sm">No hay novedades registradas</h3>
        <p className="text-slate-400 font-sans text-xs mt-1">
          {filterCategory === 'TODAS' 
            ? 'Publica una novedad para mantener informados a tus socios del gimnasio.' 
            : `No existen novedades publicadas bajo la categoría "${filterCategory}".`}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans">
      {filteredNovedades.map((nov) => {
        const theme = getCategoryTheme(nov.categoria);
        return (
          <div 
            key={nov.id} 
            className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${
              nov.destacado ? 'border-amber-200 ring-2 ring-amber-500/10' : 'border-slate-200'
            }`}
          >
            {nov.destacado && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white px-2.5 py-0.5 rounded-bl-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 font-mono">
                <Star className="w-2.5 h-2.5 fill-white" />
                Destacado
              </div>
            )}

            {/* TOP CARTELES */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 border rounded-md text-[9px] font-black uppercase tracking-wider font-mono ${theme.bg}`}>
                  {theme.label}
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {nov.fecha}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 leading-snug tracking-tight font-sans text-sm md:text-base">
                {nov.titulo}
              </h3>

              <p className="text-slate-600 text-xs font-sans whitespace-pre-line leading-relaxed">
                {nov.contenido}
              </p>
            </div>

            {/* BOTTOM ACCIONES */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium truncate max-w-[110px]">{nov.creado_por.split('@')[0]}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggleDestacada(nov)}
                  title={nov.destacado ? 'Quitar destacado' : 'Marcar destaque importante'}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer bg-transparent ${
                    nov.destacado 
                      ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' 
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Star className={`w-4 h-4 ${nov.destacado ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  onClick={() => onEdit(nov)}
                  title="Editar contenido"
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDelete(nov.id)}
                  title="Remover circular"
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
