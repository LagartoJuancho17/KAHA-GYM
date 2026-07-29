import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Novedad } from '../../types';
import { Megaphone, Plus, Check, Search } from 'lucide-react';
import { NovedadFormModal } from './NovedadFormModal';
import { NovedadesList } from './NovedadesList';

export const NovedadesCRUD: React.FC = () => {
  const { novedades, updateNovedad, deleteNovedad } = useGym();
  
  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<Novedad | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [buscarText, setBuscarText] = useState<string>('');
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

  // Category counts
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
    <div className="space-y-6 p-3 sm:p-6 max-w-7xl mx-auto overflow-x-hidden" id="novedades-crud-tab-panel">
      
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
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs flex items-center gap-2 font-sans">
          <Check className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center pb-2 border-b border-slate-200">
        <div className="flex flex-wrap gap-2">
          {(['TODAS', 'ARANCELES', 'TURNOS', 'INFORMACION', 'EVENTOS'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                filterCategory === cat 
                  ? 'bg-slate-900 text-white font-bold' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <span>{cat === 'TODAS' ? 'Todas' : cat}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                filterCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {categoryCounts[cat] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar avisos..."
            value={buscarText}
            onChange={(e) => setBuscarText(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-sans focus:outline-none focus:border-slate-400 transition-all"
          />
        </div>
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
