// src/components/Novedades/NovedadFormModal.tsx
import React, { useState, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { Novedad } from '../../types';
import { Megaphone, AlertCircle, X } from 'lucide-react';

interface NovedadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingNovedad: Novedad | null;
  onSuccess: (msg: string) => void;
}

export const NovedadFormModal: React.FC<NovedadFormModalProps> = ({
  isOpen,
  onClose,
  editingNovedad,
  onSuccess
}) => {
  const { addNovedad, updateNovedad, googleUser } = useGym();

  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    categoria: 'INFORMACION' as Novedad['categoria'],
    destacado: false
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingNovedad) {
      setFormData({
        titulo: editingNovedad.titulo,
        contenido: editingNovedad.contenido,
        categoria: editingNovedad.categoria,
        destacado: editingNovedad.destacado
      });
    } else {
      setFormData({
        titulo: '',
        contenido: '',
        categoria: 'INFORMACION',
        destacado: false
      });
    }
    setErrorMsg(null);
  }, [editingNovedad, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.titulo.trim() || !formData.contenido.trim()) {
      setErrorMsg('Por favor completa el título y contenido de la novedad.');
      return;
    }

    const autor = googleUser?.email || 'admin@gimnasio.com.ar';

    if (editingNovedad) {
      const res = updateNovedad(editingNovedad.id, {
        titulo: formData.titulo,
        contenido: formData.contenido,
        categoria: formData.categoria,
        destacado: formData.destacado
      });
      if (res.success) {
        onSuccess('Novedad actualizada con éxito.');
        onClose();
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
        onSuccess('Novedad publicada con éxito.');
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs select-none animate-fade-in font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-scale-up">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <Megaphone className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight font-sans">
                {editingNovedad ? 'Modificar Circular' : 'Publicar Nueva Circular'}
              </h3>
              <p className="text-[10px] text-slate-400 font-sans">Publicación en la cartelera digital de alumnos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-800 flex items-center gap-1.5 font-sans">
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
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 box-border"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">Categoría</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value as Novedad['categoria'] }))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
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
                  <span className="block text-[11px] font-bold text-slate-800">Destacar circular</span>
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
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 leading-relaxed font-sans resize-none box-border"
            />
          </div>

          {/* Botonera */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold bg-white hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl border-none shadow-xs transition-all cursor-pointer"
            >
              {editingNovedad ? 'Guardar Cambios' : 'Publicar Ahora'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
