// src/components/Clientes/ClientesCRUD.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { Plus, ChevronDown, Upload, Download, AlertCircle, Check, X } from 'lucide-react';

// Import subcomponents
import { ClientesFilter } from './ClientesFilter';
import { ClientesTable } from './ClientesTable';
import { ClienteFormModal } from './ClienteFormModal';
import { ClienteProfileModal } from './ClienteProfileModal';
import { ClienteDeleteModal } from './ClienteDeleteModal';
import { ClienteTurnosModal } from './ClienteTurnosModal';
import { ClienteCSVImportModal } from './ClienteCSVImportModal';

interface ClientesCRUDProps {
  editingClienteId?: string | null;
  setEditingClienteId?: (id: string | null) => void;
  showAddClienteModal?: boolean;
  setShowAddClienteModal?: (show: boolean) => void;
  openTurnosModalForId?: string | null;
  setOpenTurnosModalForId?: (id: string | null) => void;
}

export const ClientesCRUD: React.FC<ClientesCRUDProps> = ({
  editingClienteId: propEditingClienteId,
  setEditingClienteId: propSetEditingClienteId,
  showAddClienteModal: propShowAddClienteModal,
  setShowAddClienteModal: propSetShowAddClienteModal,
  openTurnosModalForId,
  setOpenTurnosModalForId
}) => {
  const { 
    clientes, planes, autorizarCliente, eliminarCliente
  } = useGym();

  const [localEditingId, setLocalEditingId] = useState<string | null>(null);
  const [localShowModal, setLocalShowModal] = useState(false);

  const editingClienteId = propEditingClienteId !== undefined ? propEditingClienteId : localEditingId;
  const setEditingClienteId = propSetEditingClienteId !== undefined ? propSetEditingClienteId : setLocalEditingId;

  const showAddClienteModal = propShowAddClienteModal !== undefined ? propShowAddClienteModal : localShowModal;
  const setShowAddClienteModal = propSetShowAddClienteModal !== undefined ? propSetShowAddClienteModal : setLocalShowModal;

  // New dropdown & modal states
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [clientForTurnosModal, setClientForTurnosModal] = useState<Cliente | null>(null);
  
  // --- FILTROS DE TABLA ---
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [verInactivos, setVerInactivos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const filasPorPagina = 20;

  const clientesPendientes = useMemo(() => {
    return clientes.filter(c => c.activo && c.autorizado === false);
  }, [clientes]);

  // --- PERFIL INDIVIDUAL VISOR ---
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  // --- DOUBLE VERIFICATION DELETE MODAL STATE ---
  const [clienteParaEliminar, setClienteParaEliminar] = useState<Cliente | null>(null);

  // --- IMPORTADOR CSV STATE ---
  const [showImportModal, setShowImportModal] = useState(false);

  React.useEffect(() => {
    if (openTurnosModalForId) {
      const found = clientes.find(c => c.id === openTurnosModalForId);
      if (found) {
        setClientForTurnosModal(found);
      }
      if (setOpenTurnosModalForId) {
        setOpenTurnosModalForId(null);
      }
    }
  }, [openTurnosModalForId, clientes, setOpenTurnosModalForId]);

  // Trigger Edit
  const handleStartEdit = (cl: Cliente) => {
    setEditingClienteId(cl.id);
    setShowAddClienteModal(true);
  };

  // --- FILTRADO PROCESADO ---
  const clientesFiltrados = useMemo(() => {
    let result = clientes;

    // Buscar
    if (buscar.trim()) {
      const bRaw = buscar.toLowerCase();
      result = result.filter(c => 
        c.nombre.toLowerCase().includes(bRaw) || 
        c.apellido.toLowerCase().includes(bRaw) || 
        c.email.toLowerCase().includes(bRaw)
      );
    }

    // Estado
    if (filtroEstado !== 'TODOS') {
      result = result.filter(c => c.estado === filtroEstado);
    }

    // Baja lógica toggle
    result = result.filter(c => c.activo === !verInactivos);

    return result;
  }, [clientes, buscar, filtroEstado, verInactivos]);

  // --- EXPORTAR LISTADO MÉTODOS ---
  const handleExportCSV = () => {
    const headers = ['Nombre', 'Apellido', 'Email', 'Telefono', 'Tipo', 'Estado', 'Deuda_Acumulada', 'Plan_Contratado'];
    
    const rows = clientesFiltrados.map(c => {
      const planNombre = planes.find(p => p.id === c.plan_id)?.nombre || 'Ninguno';
      return [
        c.nombre,
        c.apellido,
        c.email,
        c.telefono || '',
        c.tipo,
        c.estado,
        c.deuda_acumulada.toString(),
        planNombre
      ];
    });

    const csvContentRaw = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContentRaw);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Clientes_Gimnasio_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" id="clientes-crud-tab-panel">
      
      {/* SECCIÓN TITULO Y METRICS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Fichas de Socios</h2>
          <p className="text-zinc-500 font-sans text-sm">Gestiona la información y el estado financiero de tus alumnos</p>
        </div>

        <div className="flex items-center gap-2 text-sm justify-end w-full md:w-auto relative">
          {/* ADD CLIENT BUTTON */}
          <button
            onClick={() => {
              setEditingClienteId(null);
              setShowAddClienteModal(true);
            }}
            className="bg-black hover:bg-zinc-800 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
            id="add-client-modal-trigger"
          >
            <Plus className="w-4 h-4" />
            Nuevo Socio
          </button>

          {/* MORE OPTIONS DROPDOWN BUTTON */}
          <div className="relative">
            <button
              onClick={() => setShowHeaderDropdown(!showHeaderDropdown)}
              className="flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
              id="header-more-options-trigger"
            >
              <span>Más opciones</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {showHeaderDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHeaderDropdown(false)}></div>
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-50 animate-fade-in font-sans text-xs">
                  <button
                    onClick={() => {
                      setShowHeaderDropdown(false);
                      setShowImportModal(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                    Importar CSV
                  </button>
                  <button
                    onClick={() => {
                      setShowHeaderDropdown(false);
                      handleExportCSV();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center gap-2 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    Exportar listado
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SOLICITUDES PENDIENTES DE AUTORIZACIÓN */}
      {clientesPendientes.length > 0 && (
        <div className="bg-amber-50/60 backdrop-blur-xs border border-amber-200 p-5 rounded-2xl space-y-4 shadow-xs animate-fade-in" id="pending-authorizations-section">
          <div className="flex items-center justify-between border-b border-amber-200/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-250/50">
                <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 font-sans">Solicitudes de Acceso Pendientes</h3>
                <p className="text-[10px] text-amber-700/80 font-sans mt-0.5">Usuarios registrados por Google que requieren autorización para ser clientes activos</p>
              </div>
            </div>
            <span className="bg-amber-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
              {clientesPendientes.length} {clientesPendientes.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesPendientes.map(c => (
              <div key={c.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold uppercase text-[11px] shrink-0">
                    {c.nombre[0]}{c.apellido[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900 text-xs truncate leading-none mb-1">{c.apellido}, {c.nombre}</p>
                    <p className="text-[10px] text-zinc-500 truncate leading-none mb-2" title={c.email}>{c.email}</p>
                    <span className="text-[9px] text-zinc-400 font-sans bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-150">
                      Registrado: {new Date(c.creado_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => {
                      autorizarCliente(c.id);
                      setClientForTurnosModal(c);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-transparent shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Autorizar
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Estás seguro de rechazar y eliminar a ${c.nombre} ${c.apellido}?`)) {
                        eliminarCliente(c.id);
                      }
                    }}
                    className="bg-red-55 hover:bg-red-100 text-red-650 p-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
                    title="Rechazar solicitud"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTROS */}
      <ClientesFilter 
        buscar={buscar}
        setBuscar={setBuscar}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        verInactivos={verInactivos}
        setVerInactivos={setVerInactivos}
      />

      {/* TABLA PRINCIPAL */}
      <ClientesTable 
        clientesFiltrados={clientesFiltrados}
        onSelectCliente={(c) => setSelectedCliente(c)}
        onManageTurnos={(c) => setClientForTurnosModal(c)}
        onStartEdit={handleStartEdit}
        onDeleteClick={(c) => setClienteParaEliminar(c)}
        openRowMenuId={openRowMenuId}
        setOpenRowMenuId={setOpenRowMenuId}
        pagina={pagina}
        setPagina={setPagina}
        filasPorPagina={filasPorPagina}
      />

      {/* DETAIL MODAL */}
      <ClienteProfileModal 
        isOpen={!!selectedCliente}
        onClose={() => setSelectedCliente(null)}
        clienteId={selectedCliente?.id || null}
        onStartEdit={handleStartEdit}
        onDeleteClick={(c) => setClienteParaEliminar(c)}
      />

      {/* FORM MODAL */}
      <ClienteFormModal 
        isOpen={showAddClienteModal}
        onClose={() => {
          setShowAddClienteModal(false);
          setEditingClienteId(null);
        }}
        editingClienteId={editingClienteId}
      />

      {/* IMPORT MODAL */}
      <ClienteCSVImportModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <ClienteDeleteModal 
        isOpen={!!clienteParaEliminar}
        onClose={() => setClienteParaEliminar(null)}
        cliente={clienteParaEliminar}
        onConfirmDelete={(id) => {
          eliminarCliente(id);
          if (selectedCliente?.id === id) {
            setSelectedCliente(null);
          }
        }}
      />

      {/* TURNOS ASSIGNMENT MODAL */}
      <ClienteTurnosModal 
        isOpen={!!clientForTurnosModal}
        onClose={() => setClientForTurnosModal(null)}
        cliente={clientForTurnosModal}
      />

    </div>
  );
};
