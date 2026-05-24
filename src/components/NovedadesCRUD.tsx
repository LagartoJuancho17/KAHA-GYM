// src/components/NovedadesCRUD.tsx
import React, { useState } from 'react';
import { useGym } from '../GymContext';
import { Novedad } from '../types';
import { 
  Sparkles, Plus, Trash2, Edit3, Check, X,
  Megaphone, AlertCircle, RefreshCw, Calendar, Tag, User, Star
} from 'lucide-react';

export const NovedadesCRUD: React.FC = () => {
  const { novedades, addNovedad, updateNovedad, deleteNovedad, googleUser } = useGym();
  
  // States for Novedad Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNovedadId, setEditingNovedadId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    categoria: 'INFORMACION' as Novedad['categoria'],
    destacado: false
  });

  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openAddModal = () => {
    setFormData({
      titulo: '',
      contenido: '',
      categoria: 'INFORMACION',
      destacado: false
    });
    setEditingNovedadId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (nov: Novedad) => {
    setFormData({
      titulo: nov.titulo,
      contenido: nov.contenido,
      categoria: nov.categoria,
      destacado: nov.destacado
    });
    setEditingNovedadId(nov.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!formData.titulo.trim() || !formData.contenido.trim()) {
      setErrorMsg('Por favor completa el título y contenido de la novedad.');
      return;
    }

    const autor = googleUser?.email || 'admin@gimnasio.com.ar';

    if (editingNovedadId) {
      const res = updateNovedad(editingNovedadId, {
        titulo: formData.titulo,
        contenido: formData.contenido,
        categoria: formData.categoria,
        destacado: formData.destacado
      });
      if (res.success) {
        setSuccessMsg('Novedad actualizada con éxito.');
        setIsModalOpen(false);
      } else {
        setErrorMsg(res.message);
      }
    } else {
      const res = addNovedad({
        titulo: formData.titulo,
        contenido: formData.contenido,
        categoria: formData.categoria,
        destacado: formData.destacado,
        creado_por: autor
      });
      if (res.success) {
        setSuccessMsg('Novedad publicada con éxito.');
        setIsModalOpen(false);
      } else {
        setErrorMsg(res.message);
      }
    }

    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta novedad? Los socios ya no podrán verla.')) {
      deleteNovedad(id);
      setSuccessMsg('Novedad eliminada de la cartelera.');
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleToggleDestacada = (nov: Novedad) => {
    updateNovedad(nov.id, { destacado: !nov.destacado });
  };

  const filteredNovedades = novedades.filter(n => {
    if (filterCategory === 'TODAS') return true;
    return n.categoria === filterCategory;
  });

  const getCategoryTheme = (category: Novedad['categoria']) => {
    switch (category) {
      case 'ARANCELES':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-150',
          dot: 'bg-emerald-500',
          label: 'Aranceles y Pagos'
        };
      case 'TURNOS':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-150',
          dot: 'bg-teal-500',
          label: 'Horarios y Turnos'
        };
      case 'EVENTOS':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-150',
          dot: 'bg-amber-500',
          label: 'Talleres y Eventos'
        };
      default:
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-150',
          dot: 'bg-sky-500',
          label: 'Información General'
        };
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" id="novedades-crud-tab-panel">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-slate-950 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-emerald-600" />
            Cartelera de Novedades y Circulares
          </h2>
          <p className="text-slate-500 font-sans text-sm">
            Publica avisos urgentes, actualizaciones tarifarias y comunicados generales que verán los socios en su portal particular.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer hover:scale-101"
        >
          <Plus className="w-4.5 h-4.5" />
          Publicar Novedad
        </button>
      </div>

      {/* SUCCESS / ERROR NOTIFICATION */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-150 rounded-xl text-xs flex items-center gap-2 font-sans">
          <Check className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
        {(['TODAS', 'ARANCELES', 'TURNOS', 'INFORMACION', 'EVENTOS'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterCategory === cat 
                ? 'bg-slate-900 text-white font-bold' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            {cat === 'TODAS' ? 'Todas las novedades' : cat}
          </button>
        ))}
      </div>

      {/* NOVEDADES CARTELERA GRID */}
      {filteredNovedades.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 max-w-md mx-auto">
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNovedades.map((nov) => {
            const theme = getCategoryTheme(nov.categoria);
            return (
              <div 
                key={nov.id} 
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${
                  nov.destacado ? 'border-amber-250 ring-2 ring-amber-500/10' : 'border-slate-205'
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
                    <span className="text-[10px] text-slate-450 font-mono flex items-center gap-1">
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
                      onClick={() => handleToggleDestacada(nov)}
                      title={nov.destacado ? 'Quitar destacado' : 'Marcar destaque importante'}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        nov.destacado 
                          ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' 
                          : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${nov.destacado ? 'fill-amber-500' : ''}`} />
                    </button>

                    <button
                      onClick={() => openEditModal(nov)}
                      title="Editar contenido"
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(nov.id)}
                      title="Remover circular"
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FORM MODAL PANEL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs select-none animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-205 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                  <Megaphone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-805 uppercase tracking-tight font-sans">
                    {editingNovedadId ? 'Modificar Circular' : 'Publicar Nueva Circular'}
                  </h3>
                  <p className="text-[10px] text-slate-450 font-sans">Publicación en la cartelera digital de alumnos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-[11px] text-rose-800 flex items-center gap-1.5 font-sans">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">Título de la Circular</label>
                <input
                  type="text"
                  placeholder="Ej: Reajuste del Costo de Planes en Junio"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full bg-white border border-slate-205 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">Categoría</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value as Novedad['categoria'] }))}
                    className="w-full bg-white border border-slate-205 rounded-xl p-2.5 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="INFORMACION">Información General</option>
                    <option value="ARANCELES">Aranceles y Planes</option>
                    <option value="TURNOS">Horarios y Turnos</option>
                    <option value="EVENTOS">Talleres y Eventos</option>
                  </select>
                </div>

                <div className="flex items-center justify-start sm:justify-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.destacado}
                      onChange={(e) => setFormData(prev => ({ ...prev, destacado: e.target.checked }))}
                      className="w-4.5 h-4.5 accent-emerald-600 rounded border-slate-300"
                    />
                    <div className="text-left">
                      <span className="block text-[11px] font-bold text-slate-850">Destacar circular</span>
                      <span className="block text-[9px] text-slate-400 font-normal">Mostrar pin amarillo prioritario</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">Detalles / Contenido del anuncio</label>
                <textarea
                  rows={5}
                  placeholder="Redacta las especificaciones exactas del anuncio aquí..."
                  value={formData.contenido}
                  onChange={(e) => setFormData(prev => ({ ...prev, contenido: e.target.value }))}
                  className="w-full bg-white border border-slate-205 rounded-xl p-3 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 leading-relaxed font-sans resize-none"
                />
              </div>

              {/* Botonera */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-250 text-slate-600 rounded-xl font-bold bg-white hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl border border-emerald-650 shadow-xs transition-all cursor-pointer"
                >
                  {editingNovedadId ? 'Guardar Cambios' : 'Publicar Ahora'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
