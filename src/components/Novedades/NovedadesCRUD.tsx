// src/components/Novedades/NovedadesCRUD.tsx
import React, { useState } from 'react';
import { useGym } from '../../GymContext';
import { Novedad } from '../../types';
import { Megaphone, Plus, Check } from 'lucide-react';
import { NovedadFormModal } from './NovedadFormModal';
import { NovedadesList } from './NovedadesList';

export const NovedadesCRUD: React.FC = () => {
  const { novedades, updateNovedad, deleteNovedad } = useGym();
  
  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<Novedad | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingNovedad(null);
    setIsModalOpen(true);
  };

  const openEditModal = (nov: Novedad) => {
    setEditingNovedad(nov);
    setIsModalOpen(true);
  };

  const handleShowSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta novedad? Los socios ya no podrán verla.')) {
      deleteNovedad(id);
      handleShowSuccess('Novedad eliminada de la cartelera.');
    }
  };

  const handleToggleDestacada = (nov: Novedad) => {
    updateNovedad(nov.id, { destacado: !nov.destacado });
  };

  const filteredNovedades = novedades.filter(n => {
    if (filterCategory === 'TODAS') return true;
    return n.categoria === filterCategory;
  });

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
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer hover:scale-101 border-none"
        >
          <Plus className="w-4.5 h-4.5 text-white" />
          Publicar Novedad
        </button>
      </div>

      {/* SUCCESS NOTIFICATION */}
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
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
      <NovedadesList
        filteredNovedades={filteredNovedades}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onToggleDestacada={handleToggleDestacada}
        filterCategory={filterCategory}
      />

      {/* FORM MODAL PANEL */}
      <NovedadFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingNovedad={editingNovedad}
        onSuccess={handleShowSuccess}
      />

    </div>
  );
};
