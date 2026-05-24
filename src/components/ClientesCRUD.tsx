// src/components/ClientesCRUD.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../GymContext';
import { Cliente, TipoCliente, EstadoCliente } from '../types';
import { 
  Plus, Search, Edit2, UserMinus, UserCheck, Eye, Download, Upload, 
  X, AlertCircle, FileSpreadsheet, Check, ArrowRight, User, Trash2
} from 'lucide-react';

interface ClientesCRUDProps {
  editingClienteId?: string | null;
  setEditingClienteId?: (id: string | null) => void;
  showAddClienteModal?: boolean;
  setShowAddClienteModal?: (show: boolean) => void;
}

export const ClientesCRUD: React.FC<ClientesCRUDProps> = ({
  editingClienteId: propEditingClienteId,
  setEditingClienteId: propSetEditingClienteId,
  showAddClienteModal: propShowAddClienteModal,
  setShowAddClienteModal: propSetShowAddClienteModal
}) => {
  const { 
    clientes, planes, pagos, turnos, addCliente, updateCliente, 
    bajaLogicaCliente, altaCliente, eliminarCliente, importarClientesCSV, rolActivo 
  } = useGym();

  const [localEditingId, setLocalEditingId] = useState<string | null>(null);
  const [localShowModal, setLocalShowModal] = useState(false);

  const editingClienteId = propEditingClienteId !== undefined ? propEditingClienteId : localEditingId;
  const setEditingClienteId = propSetEditingClienteId !== undefined ? propSetEditingClienteId : setLocalEditingId;

  const showAddClienteModal = propShowAddClienteModal !== undefined ? propShowAddClienteModal : localShowModal;
  const setShowAddClienteModal = propSetShowAddClienteModal !== undefined ? propSetShowAddClienteModal : setLocalShowModal;

  // --- FILTROS DE TABLA ---
  const [buscar, setBuscar] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [verInactivos, setVerInactivos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const filasPorPagina = 20;

  // --- REGISTRO / EDICION STATE ---
  const [clienteForm, setClienteForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    tipo: 'FLEXIBLE' as TipoCliente,
    plan_id: planes[0]?.id || ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // --- PERFIL INDIVIDUAL VISOR ---
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  // --- DOUBLE VERIFICATION DELETE MODAL STATE ---
  const [clienteParaEliminar, setClienteParaEliminar] = useState<Cliente | null>(null);
  const [confirmCheck, setConfirmCheck] = useState<boolean>(false);
  const [confirmText, setConfirmText] = useState<string>('');

  // --- IMPORTADOR CSV STATE ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({
    nombre: -1,
    apellido: -1,
    email: -1,
    telefono: -1,
    tipo: -1,
    plan_nombre: -1
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<{ procesados: number; insertados: number; errores: string[] } | null>(null);

  // Reset Form
  const resetForm = () => {
    setClienteForm({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      tipo: 'FLEXIBLE',
      plan_id: planes[0]?.id || ''
    });
    setFormError('');
    setFormSuccess('');
  };

  // Trigger Edit
  const handleStartEdit = (cl: Cliente) => {
    setEditingClienteId(cl.id);
    setClienteForm({
      nombre: cl.nombre,
      apellido: cl.apellido,
      email: cl.email,
      telefono: cl.telefono,
      tipo: cl.tipo,
      plan_id: cl.plan_id
    });
  };

  // Submit Add / Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!clienteForm.nombre || !clienteForm.apellido || !clienteForm.email) {
      setFormError('Nombre, Apellido y Email son requeridos.');
      return;
    }

    if (editingClienteId) {
      const res = updateCliente(editingClienteId, clienteForm);
      if (res.success) {
        setFormSuccess(res.message);
        setTimeout(() => {
          setEditingClienteId(null);
          resetForm();
        }, 1200);
      } else {
        setFormError(res.message);
      }
    } else {
      const res = addCliente(clienteForm);
      if (res.success) {
        setFormSuccess(res.message);
        setTimeout(() => {
          setShowAddClienteModal(false);
          resetForm();
        }, 1200);
      } else {
        setFormError(res.message);
      }
    }
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

    // Tipo
    if (filtroTipo !== 'TODOS') {
      result = result.filter(c => c.tipo === filtroTipo);
    }

    // Estado
    if (filtroEstado !== 'TODOS') {
      result = result.filter(c => c.estado === filtroEstado);
    }

    // Baja lógica toggle
    result = result.filter(c => c.activo === !verInactivos);

    return result;
  }, [clientes, buscar, filtroTipo, filtroEstado, verInactivos]);

  // PAGINACIÓN
  const totalPaginas = Math.ceil(clientesFiltrados.length / filasPorPagina) || 1;
  const clientesPaginados = useMemo(() => {
    const inicio = (pagina - 1) * filasPorPagina;
    return clientesFiltrados.slice(inicio, inicio + filasPorPagina);
  }, [clientesFiltrados, pagina]);

  // --- EXPORTAR LISTADO MÉTODOS ---
  const handleExportCSV = () => {
    // Columnas: Nombre, Apellido, Email, Celular, Tipo, Estado, Deuda, Plan
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

  // --- IMPORTADOR EXTRACCION PARSER ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);

      // Simple parsing lines
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
        setCsvHeaders(headers);

        const rows = lines.slice(1).map(l => {
          // Parse complex CSV splits ignoring commas inside quotes
          const matched = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || l.split(',');
          return matched.map(val => val.replace(/^["']|["']$/g, '').trim());
        });
        
        setCsvRows(rows);

        // Pre-detectar campos automáticamente
        const tempMapping = {
          nombre: -1,
          apellido: -1,
          email: -1,
          telefono: -1,
          tipo: -1,
          plan_nombre: -1
        };

        headers.forEach((h, idx) => {
          const lH = h.toLowerCase();
          if (lH.includes('nom') || lH.includes('name')) tempMapping.nombre = idx;
          if (lH.includes('ape') || lH.includes('sur')) tempMapping.apellido = idx;
          if (lH.includes('mail') || lH.includes('correo')) tempMapping.email = idx;
          if (lH.includes('tel') || lH.includes('cel') || lH.includes('phone')) tempMapping.telefono = idx;
          if (lH.includes('tipo') || lH.includes('type')) tempMapping.tipo = idx;
          if (lH.includes('plan')) tempMapping.plan_nombre = idx;
        });

        setMapping(tempMapping);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateMapping = (field: keyof typeof mapping, indexString: string) => {
    const val = parseInt(indexString);
    setMapping(prev => ({ ...prev, [field]: val }));
  };

  // Generar preview
  const handleGeneratePreview = () => {
    if (mapping.nombre === -1 || mapping.apellido === -1 || mapping.email === -1) {
      alert('Debes mapear como mínimo los campos Nombre, Apellido y Email.');
      return;
    }

    const prev: any[] = [];
    csvRows.slice(0, 10).forEach(row => {
      if (row.length === 0) return;
      prev.push({
        nombre: row[mapping.nombre] || '',
        apellido: row[mapping.apellido] || '',
        email: row[mapping.email] || '',
        telefono: mapping.telefono !== -1 ? row[mapping.telefono] : '',
        tipo: mapping.tipo !== -1 ? row[mapping.tipo] : 'FLEXIBLE',
        plan_nombre: mapping.plan_nombre !== -1 ? row[mapping.plan_nombre] : planes[0]?.nombre
      });
    });
    setPreviewData(prev);
  };

  // Confirmar Importación Total
  const handleExecuteImport = () => {
    const finalDataToImport = csvRows.map(row => {
      return {
        nombre: row[mapping.nombre] || '',
        apellido: row[mapping.apellido] || '',
        email: row[mapping.email] || '',
        telefono: mapping.telefono !== -1 ? row[mapping.telefono] : '',
        tipo: (mapping.tipo !== -1 ? (row[mapping.tipo]?.toUpperCase() === 'FIJO' ? 'FIJO' : 'FLEXIBLE') : 'FLEXIBLE') as TipoCliente,
        plan_nombre: mapping.plan_nombre !== -1 ? row[mapping.plan_nombre] : planes[0]?.nombre,
      };
    });

    const report = importarClientesCSV(finalDataToImport);
    setImportReport(report);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" id="clientes-crud-tab-panel">
      
      {/* SECCIÓN TITULO Y METRICS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Fichas de Socios</h2>
          <p className="text-zinc-500 font-sans text-sm">Gestiona la información y el estado financiero de tus alumnos</p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm justify-end w-full md:w-auto">
          {/* IMPORT BUTTON */}
          <button
            onClick={() => {
              setImportReport(null);
              setCsvRows([]);
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm"
            id="csv-import-modal-trigger"
          >
            <Upload className="w-4 h-4 text-zinc-500" />
            Importar CSV
          </button>

          {/* EXPORT BUTTON */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm"
            id="csv-export-trigger"
          >
            <Download className="w-4 h-4 text-zinc-500" />
            Exportar listado
          </button>

          {/* ADD CLIENT BUTTON */}
          <button
            onClick={() => {
              resetForm();
              setEditingClienteId(null);
              setShowAddClienteModal(true);
            }}
            className="bg-black hover:bg-zinc-800 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            id="add-client-modal-trigger"
          >
            <Plus className="w-4 h-4" />
            Nuevo Socio
          </button>
        </div>
      </div>

      {/* COMPONENTE DE BUSQUEDA Y FILTRADO RAPIDO */}
      <div className="bg-white border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between" id="filter-bar-container">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por Nombre, Apellido o Email..."
            value={buscar}
            onChange={(e) => {
              setBuscar(e.target.value);
              setPagina(1);
            }}
            className="pl-9 pr-4 py-2 w-full border border-zinc-200 rounded-lg text-xs font-sans outline-hidden focus:border-zinc-500"
            id="search-input-box"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* TIPO */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 font-sans font-medium">Tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => {
                setFiltroTipo(e.target.value);
                setPagina(1);
              }}
              className="border border-zinc-200 rounded-md py-1 px-2 outline-hidden text-zinc-700 bg-white"
              id="filter-type-select"
            >
              <option value="TODOS">Todos</option>
              <option value="FIJO">Fijos</option>
              <option value="FLEXIBLE">Flexibles</option>
            </select>
          </div>

          {/* ESTADO */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 font-sans font-medium">Estado:</span>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPagina(1);
              }}
              className="border border-zinc-200 rounded-md py-1 px-2 outline-hidden text-zinc-700 bg-white"
              id="filter-status-select"
            >
              <option value="TODOS">Todos</option>
              <option value="ACTIVO">Al Día</option>
              <option value="CON_DEUDA">Con Deuda</option>
              <option value="MOROSO">Morosos</option>
            </select>
          </div>

          {/* BAJA LOGICA TOGGLE */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-sans select-none border-l border-zinc-200 pl-3">
            <input
              type="checkbox"
              checked={verInactivos}
              onChange={(e) => {
                setVerInactivos(e.target.checked);
                setPagina(1);
              }}
              className="rounded-sm border-zinc-300 text-black focus:ring-black h-4 w-4"
              id="ver-inactivos-checkbox"
            />
            <span className="text-zinc-600 font-medium font-sans">Ver Socios Inactivos / Bajas</span>
          </label>
        </div>
      </div>

      {/* GRILLA DE SOCIOS TABLA PRINCIPAL */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 font-sans font-medium uppercase tracking-wider border-b border-zinc-200">
                <th className="p-4">Socio</th>
                <th className="p-4">Email / Celular</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Plan sugerido</th>
                <th className="p-4">Deuda</th>
                <th className="p-4">Último Mes Pago</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clientesPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400 font-sans">
                    Ningún socio coincide con los filtros aplicados actualmente.
                  </td>
                </tr>
              ) : (
                clientesPaginados.map(c => {
                  const plan = planes.find(p => p.id === c.plan_id);
                  
                  // Badge color mapping
                  // verde=activo al día, amarillo=con deuda, rojo=moroso, gris=inactivo
                  let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  let estadoLabel = 'Al Día';
                  
                  if (!c.activo || c.estado === 'INACTIVO') {
                    badgeClass = 'bg-zinc-100 text-zinc-600 border-zinc-200';
                    estadoLabel = 'Inactivo';
                  } else if (c.estado === 'CON_DEUDA') {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                    estadoLabel = 'Con Deuda';
                  } else if (c.estado === 'MOROSO') {
                    badgeClass = 'bg-red-50 text-red-600 border-red-100';
                    estadoLabel = 'Moroso';
                  }

                  return (
                    <tr key={c.id} className="hover:bg-zinc-50 transition-colors font-sans border-b border-zinc-150" id={`row-cliente-${c.id}`}>
                      <td className="p-4 cursor-pointer" onClick={() => setSelectedCliente(c)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 font-bold uppercase text-[10px] border border-zinc-200">
                            {c.nombre[0]}{c.apellido[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-950 text-xs flex items-center gap-2">
                              {c.apellido}, {c.nombre}
                              <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold border ${badgeClass}`}>
                                {estadoLabel}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">ID: {c.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => setSelectedCliente(c)}>
                        <div className="text-zinc-600 font-medium">{c.email}</div>
                        <div className="text-zinc-400 text-[10px]">{c.telefono || 'Sin celular'}</div>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => setSelectedCliente(c)}>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          c.tipo === 'FIJO' ? 'bg-zinc-90 w-fit text-black bg-zinc-100 border border-zinc-200' : 'bg-blue-50 text-blue-800'
                        }`}>
                          {c.tipo}
                        </span>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => setSelectedCliente(c)}>
                        <span className="font-semibold text-zinc-800">{plan ? plan.nombre : 'Plan Genérico'}</span>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => setSelectedCliente(c)}>
                        <span className={`font-mono font-bold ${c.deuda_acumulada > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                          ${c.deuda_acumulada.toLocaleString('es-AR')}
                        </span>
                      </td>
                      <td className="p-4 cursor-pointer font-mono text-zinc-600" onClick={() => setSelectedCliente(c)}>{c.ultimo_mes_pagado || 'Sin pagos'}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* VER DETALLE */}
                          <button
                            onClick={() => setSelectedCliente(c)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 rounded-md border border-zinc-200/50 transition-colors"
                            title="Ver Perfil Individual"
                            id={`btn-view-${c.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* EDITAR */}
                          <button
                            onClick={() => {
                              handleStartEdit(c);
                              setShowAddClienteModal(true);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-emerald-600 bg-zinc-50 hover:bg-emerald-50 rounded-md border border-zinc-200/50 transition-colors"
                            title="Modificar Alumno"
                            id={`btn-edit-${c.id}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* ELIMINAR CON DOBLE CONFIRMACION */}
                          <button
                            onClick={() => {
                              setClienteParaEliminar(c);
                              setConfirmCheck(false);
                              setConfirmText('');
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-50 rounded-md border border-red-100 transition-colors"
                            title="Eliminar Permanente"
                            id={`btn-delete-hard-${c.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN CONTROLLER */}
        <div className="bg-zinc-50 px-4 py-3 border-t border-zinc-200 flex items-center justify-between text-xs font-sans text-zinc-500">
          <div>
            Mostrando <span className="font-semibold text-zinc-900">{clientesFiltrados.length === 0 ? 0 : (pagina - 1) * filasPorPagina + 1}</span> a{' '}
            <span className="font-semibold text-zinc-900">{Math.min(clientesFiltrados.length, pagina * filasPorPagina)}</span> de{' '}
            <span className="font-semibold text-zinc-900">{clientesFiltrados.length}</span> alumnos
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPagina(prev => Math.max(1, prev - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 border border-zinc-200 rounded-md bg-white hover:bg-zinc-50 disabled:opacity-40 select-none text-zinc-700 text-xs font-medium"
              id="pagination-prev"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina(prev => Math.min(totalPaginas, prev + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 border border-zinc-200 rounded-md bg-white hover:bg-zinc-50 disabled:opacity-40 select-none text-zinc-700 text-xs font-medium"
              id="pagination-next"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* --- MODAL DETALLE INDIVIDUAL (PROFILE VIEW) --- */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="profile-detailed-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden relative">
            
            {/* Header */}
            <div className="bg-zinc-900 text-white p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lime-400 font-bold uppercase text-lg">
                  {selectedCliente.nombre[0]}{selectedCliente.apellido[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{selectedCliente.nombre} {selectedCliente.apellido}</h3>
                  <p className="text-zinc-400 text-xs">Socio registrado el {new Date(selectedCliente.creado_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCliente(null)}
                className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors"
                id="btn-close-profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Información Personal */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                  <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Correo Electrónico</span>
                  <span className="font-semibold text-zinc-900 block">{selectedCliente.email}</span>
                </div>
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                  <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Celular</span>
                  <span className="font-semibold text-zinc-900 block">{selectedCliente.telefono || 'Sin registrar'}</span>
                </div>
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                  <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Tipo de Membresía</span>
                  <span className="font-bold text-zinc-900 block">{selectedCliente.tipo}</span>
                </div>
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                  <span className="text-zinc-400 block uppercase font-medium text-[9px] mb-1">Deuda Acumulada</span>
                  <span className={`font-mono font-bold block ${selectedCliente.deuda_acumulada > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ${selectedCliente.deuda_acumulada.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Planes asignados */}
              <div className="border border-zinc-200 p-4 rounded-xl">
                <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider mb-2 font-sans border-b border-zinc-100 pb-2">Plan Contratado</h4>
                {(() => {
                  const currPlan = planes.find(p => p.id === selectedCliente.plan_id);
                  return (
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-zinc-950 block">{currPlan?.nombre}</span>
                        <span className="text-zinc-400 font-sans text-[11px]">{currPlan?.dias_por_semana} sesiones fijas permitidas por semana</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-zinc-900">${currPlan?.precio.toLocaleString('es-AR')} ARS/Mes</span>
                    </div>
                  );
                })()}
              </div>

              {/* Turnos asignados fijos */}
              <div className="border border-zinc-200 p-4 rounded-xl">
                <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider mb-2 font-sans border-b border-zinc-100 pb-2">Turnos Fijos Reservados</h4>
                {selectedCliente.tipo === 'FLEXIBLE' ? (
                  <p className="text-zinc-400 italic text-xs">Los miembros de tipo FLEXIBLE no reservan turnos permanentes, asisten de acuerdo con los cupos libres diarios.</p>
                ) : selectedCliente.turnos_fijos.length === 0 ? (
                  <p className="text-zinc-400 italic text-xs">El alumno no posee turnos fijos agendados actualmente. Puedes reservarlos desde el panel de Turnos.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedCliente.turnos_fijos.map(tId => (
                      <div key={tId} className="bg-zinc-100 border border-zinc-200 py-2 px-3 rounded-lg flex justify-between items-center text-zinc-900 font-semibold">
                        <span>{tId.split('-')[0]}</span>
                        <span className="font-mono text-zinc-500 font-medium">{tId.split('-')[1]}hs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Turno Variable Reservado */}
              <div className="border border-zinc-200 p-4 rounded-xl">
                <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider mb-2 font-sans border-b border-zinc-100 pb-2">Turno Variable Reservado (Tiempo Real)</h4>
                {selectedCliente.turno_variable ? (
                  <div className="bg-emerald-50 border border-emerald-150 py-2 px-3 rounded-lg flex justify-between items-center text-emerald-900 font-semibold text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Reserva Variable Activa:</span>
                    </span>
                    <span className="font-mono bg-white px-2 py-0.5 border border-emerald-150 rounded text-[11px]">
                      {selectedCliente.turno_variable.split('-')[0]} — {selectedCliente.turno_variable.split('-')[1]}hs
                    </span>
                  </div>
                ) : (
                  <p className="text-zinc-400 italic text-xs">El alumno no posee una reserva de turno variable activa actualmente.</p>
                )}
              </div>

              {/* Historial de Pagos de este alumno */}
              <div className="border border-zinc-200 p-4 rounded-xl">
                <h4 className="font-bold text-xs text-zinc-800 uppercase tracking-wider mb-2 font-sans border-b border-zinc-100 pb-2">Historial de Pagos Registrados</h4>
                {(() => {
                  const clientePagos = pagos.filter(p => p.cliente_id === selectedCliente.id);
                  if (clientePagos.length === 0) {
                    return <p className="text-zinc-400 italic text-xs">No se registran antecedentes de cobros para este alumno.</p>;
                  }
                  return (
                    <div className="space-y-2 max-h-40 overflow-y-auto text-xs font-sans">
                      {clientePagos.map(pay => (
                        <div key={pay.id} className="flex justify-between items-center p-2 hover:bg-zinc-50 rounded-lg border border-zinc-100">
                          <div>
                            <span className="font-semibold text-zinc-900 block">Mes correspondiente: {pay.mes_correspondiente}</span>
                            <span className="text-zinc-400 text-[10px]">Medio: {pay.medio_pago} | {new Date(pay.fecha_pago).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-600 block">${pay.monto.toLocaleString('es-AR')}</span>
                            <span className="text-[9px] text-zinc-400 font-mono text-[9px] block">Ref: {pay.hash_transaccion}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-zinc-150 flex gap-3 justify-end bg-zinc-50 -mx-6 -mb-6 p-6">
                <button
                  onClick={() => {
                    setClienteParaEliminar(selectedCliente);
                    setConfirmCheck(false);
                    setConfirmText('');
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-colors cursor-pointer"
                  id="btn-delete-profile-modal"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>Eliminar Permanente</span>
                </button>
                <button
                  onClick={() => setSelectedCliente(null)}
                  className="px-5 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold font-sans transition-colors cursor-pointer"
                  id="btn-close-profile-modal-footer"
                >
                  Cerrar Perfil
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- MODAL FORMULARIO: REGISTRO / EDICION CLIENTE --- */}
      {showAddClienteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="client-form-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-base font-bold tracking-tight">
                {editingClienteId ? 'Modificar ficha de Alumno' : 'Registrar Nuevo Socio'}
              </h3>
              <button
                onClick={() => {
                  setShowAddClienteModal(false);
                  resetForm();
                  setEditingClienteId(null);
                }}
                className="text-zinc-400 hover:text-white bg-zinc-800 p-1 rounded"
                id="btn-close-form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs font-sans">
              {formError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 flex-shrink" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 border border-emerald-200">
                  <Check className="w-4 h-4" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* NOMBRE */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Juan"
                  value={clienteForm.nombre}
                  onChange={(e) => setClienteForm(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden"
                  id="form-nombre"
                />
              </div>

              {/* APELLIDO */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Pérez"
                  value={clienteForm.apellido}
                  onChange={(e) => setClienteForm(prev => ({ ...prev, apellido: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden"
                  id="form-apellido"
                />
              </div>

              {/* EMAIL */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Correo Electrónico (Único)</label>
                <input
                  type="email"
                  required
                  placeholder="ej: juanperez@gmail.com"
                  value={clienteForm.email}
                  disabled={!!editingClienteId} // No permitir cambiar email si se edita para evitar colisiones
                  onChange={(e) => setClienteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden disabled:bg-zinc-100 disabled:text-zinc-400"
                  id="form-email"
                />
              </div>

              {/* TELEFONO */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Celular / WhatsApp</label>
                <input
                  type="text"
                  placeholder="ej: 11-5432-8822"
                  value={clienteForm.telefono}
                  onChange={(e) => setClienteForm(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden"
                  id="form-telefono"
                />
              </div>

              {/* TIPO */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Tipo de Asistencia</label>
                <select
                  value={clienteForm.tipo}
                  onChange={(e) => setClienteForm(prev => ({ ...prev, tipo: e.target.value as TipoCliente }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white"
                  id="form-tipo"
                >
                  <option value="FLEXIBLE">Flexible (Sin Horario fijo — entra por cupo diario)</option>
                  <option value="FIJO">Fijo (Horarios asignados fijos semanales)</option>
                </select>
              </div>

              {/* PLAN ORIGINAL */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Plan Base Contratado</label>
                <select
                  value={clienteForm.plan_id}
                  onChange={(e) => setClienteForm(prev => ({ ...prev, plan_id: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-hidden bg-white"
                  id="form-plan"
                >
                  {planes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — (${p.precio.toLocaleString('es-AR')})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddClienteModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all"
                  id="btn-cancel-form"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-all font-semibold"
                  id="btn-submit-form"
                >
                  {editingClienteId ? 'Guardar Cambios' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL MASIVO IMPORTADOR CONTENEDOR MULTI-FASE --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="csv-import-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold tracking-tight">Importador Masivo de Clientes (.CSV)</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-zinc-400 hover:text-white"
                id="btn-close-csv-import"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mapeo & previsualizador con scrolling */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              
              {!csvContent ? (
                <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center bg-zinc-50 hover:bg-zinc-100/50 transition-colors">
                  <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                  <p className="font-semibold text-zinc-700 font-sans">Selecciona o arrastra el archivo CSV para procesar</p>
                  <p className="text-zinc-400 text-xs mt-1">El archivo debe contener el listado de alumnos de tu base anterior.</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="mt-4 block mx-auto text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                    id="csv-file-selector"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* FASE MAPING COLUMNS */}
                  <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
                    <h4 className="font-bold text-zinc-900 mb-3 block">Mapeo de Columnas del Archivo</h4>
                    <p className="text-zinc-500 text-[11px] mb-4">Relaciona las columnas del archivo subido con los campos requeridos en la base del sistema.</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
                      {[
                        { label: 'Nombre (Obligatorio)', field: 'nombre' as const },
                        { label: 'Apellido (Obligatorio)', field: 'apellido' as const },
                        { label: 'Email (Obligatorio)', field: 'email' as const },
                        { label: 'Teléfono', field: 'telefono' as const },
                        { label: 'Tipo (Fijo/Flexible)', field: 'tipo' as const },
                        { label: 'Plan o Abono', field: 'plan_nombre' as const }
                      ].map(item => (
                        <div key={item.field} className="flex flex-col gap-1.5 p-2 bg-white rounded-lg border border-zinc-200">
                          <span className="font-semibold text-zinc-700 block">{item.label}</span>
                          <select
                            value={mapping[item.field]}
                            onChange={(e) => handleUpdateMapping(item.field, e.target.value)}
                            className="p-1.5 border border-zinc-200 rounded-md bg-white w-full outline-hidden"
                          >
                            <option value="-1">-- No mapeado --</option>
                            {csvHeaders.map((header, idx) => (
                              <option key={idx} value={idx}>{header}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleGeneratePreview}
                      className="mt-4 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold flex items-center gap-1.5"
                      id="btn-generate-preview"
                    >
                      Generar Previsualización de Datos
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* PREDICTOR LISTADO PREVIEW */}
                  {previewData.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-zinc-900 block border-b border-zinc-100 pb-2">Previsualización del mapeo (Primeras 10 filas)</h4>
                      
                      <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                        <table className="w-full text-left text-xs text-zinc-700 font-sans">
                          <thead className="bg-zinc-50 font-semibold border-b border-zinc-200 text-zinc-500 uppercase tracking-wider">
                            <tr>
                              <th className="p-3">Nombre Completo</th>
                              <th className="p-3">Email</th>
                              <th className="p-3">Celular</th>
                              <th className="p-3">Tipo Fijo/Flex</th>
                              <th className="p-3">Plan Mapeado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {previewData.map((row, idx) => {
                              // Validar fuzzy
                              const duplicadoFuzzy = clientes.some(c => c.activo && c.email.toLowerCase() === row.email?.toLowerCase());

                              return (
                                <tr key={idx} className={duplicadoFuzzy ? 'bg-red-50/50' : 'hover:bg-zinc-50'}>
                                  <td className="p-3 font-semibold text-zinc-900">
                                    {row.apellido}, {row.nombre}
                                    {duplicadoFuzzy && (
                                      <span className="ml-2 text-[9px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                                        Duplicado
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 font-mono">{row.email}</td>
                                  <td className="p-3">{row.telefono || '-'}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded-sm font-bold bg-zinc-100 border border-zinc-200 text-[10px]">
                                      {row.tipo?.toUpperCase() === 'FIJO' ? 'FIJO' : 'FLEXIBLE'}
                                    </span>
                                  </td>
                                  <td className="p-3 font-medium text-emerald-700">{row.plan_nombre}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
                        <div className="text-zinc-600 block leading-tight font-sans">
                          Se procesarán un total de <span className="font-bold text-zinc-900">{csvRows.length} miembros</span> listados en el archivo.
                          <p className="text-[10px] text-zinc-400 mt-1">Los emails repetidos serán ignorados o listados en reporte de errores para resguardar la consistencia.</p>
                        </div>
                        <button
                          onClick={handleExecuteImport}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
                          id="btn-confirm-import"
                        >
                          Confirmar Importación Masiva
                        </button>
                      </div>
                    </div>
                  )}

                  {/* REPORTE DE ERRORES */}
                  {importReport && (
                    <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200 space-y-3 font-sans">
                      <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-500" />
                        ¡Proceso de Importación Finalizado!
                      </h4>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white p-3 rounded-lg border border-zinc-100">
                          <span className="text-zinc-400 block uppercase font-medium text-[9px]">Leidos</span>
                          <span className="text-xl font-bold font-mono block">{importReport.procesados}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-zinc-100">
                          <span className="text-zinc-400 block uppercase font-medium text-[9px] text-emerald-600">Registrados con éxito</span>
                          <span className="text-xl font-bold text-emerald-600 font-mono block">{importReport.insertados}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-zinc-100">
                          <span className="text-zinc-400 block uppercase font-medium text-[9px] text-red-500">Errores / Ignorados</span>
                          <span className="text-xl font-bold text-red-500 font-mono block">{importReport.errores.length}</span>
                        </div>
                      </div>

                      {importReport.errores.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="font-semibold text-zinc-800 block text-[11px] uppercase">Detalle del Registro de Fallas:</span>
                          <div className="bg-white p-3 rounded-lg border border-zinc-200 max-h-32 overflow-y-auto font-mono text-[10px] text-red-600 divide-y divide-zinc-100">
                            {importReport.errores.map((err, idx) => (
                              <div key={idx} className="py-1.5">{err}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setShowImportModal(false)}
                        className="mt-2 w-full py-2 bg-zinc-900 text-white rounded-lg font-semibold"
                        id="btn-close-import-success"
                      >
                        Entendido, cerrar panel
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE DOBLE VERIFICACIÓN DE ELIMINACIÓN --- */}
      {clienteParaEliminar && (
        <div className="fixed inset-0 bg-slate-950/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm font-sans" id="confirm-delete-double-modal">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-105 w-full max-w-md overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 p-5 flex items-center gap-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-black text-red-900 tracking-tight uppercase">Confirmar Baja Permanente</h4>
                <p className="text-[10px] text-red-500 font-mono -mt-0.5">Doble Verificación de Seguridad</p>
              </div>
            </div>

            {/* Body Info */}
            <div className="p-5 space-y-4">
              <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 text-xs font-sans">
                <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono block">Socio Seleccionado</span>
                <span className="font-bold text-zinc-900 text-sm block">
                  {clienteParaEliminar.apellido}, {clienteParaEliminar.nombre}
                </span>
                <span className="text-zinc-500 font-mono text-[10px] block mt-0.5">ID: {clienteParaEliminar.id} | Email: {clienteParaEliminar.email}</span>
              </div>

              <div className="text-xs text-zinc-650 leading-relaxed space-y-2 bg-red-50/40 p-3 rounded-lg border border-red-100/50 font-sans">
                <p className="font-bold text-red-950">⚠️ ADVERTENCIA DE SEGURIDAD CRÍTICA:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-700 font-sans">
                  <li>Se eliminará permanentemente de la base de datos de <strong>KAHA GYM</strong>.</li>
                  <li>Se <strong>desasignarán automáticamente</strong> todos sus turnos fijos y variables reservados.</li>
                  <li>Esta operación es <strong>absolutamente irreversible</strong> y no se puede deshacer.</li>
                </ul>
              </div>

              {/* Paso 1: Checkbox */}
              <div className="pt-2 font-sans">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmCheck}
                    onChange={(e) => setConfirmCheck(e.target.checked)}
                    className="w-4.5 h-4.5 accent-red-600 rounded border-zinc-300 mt-0.5"
                    id="checkbox-confirm-delete"
                  />
                  <span className="text-[11px] font-bold text-zinc-800 leading-tight">
                    Paso 1: Comprendo y declaro conocer que liberar sus turnos es definitivo.
                  </span>
                </label>
              </div>

              {/* Paso 2: Escribir ELIMINAR */}
              <div className="space-y-1.5 transition-all font-sans">
                <label className="block text-[11px] font-bold text-zinc-800">
                  Paso 2: Escribe la palabra <span className="font-extrabold text-red-600 font-mono text-xs">ELIMINAR</span> para autorizar:
                </label>
                <input
                  type="text"
                  placeholder="Escribe ELIMINAR para proceder..."
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full bg-white border border-red-200 focus:ring-1 focus:ring-red-500 rounded-xl p-2.5 font-mono text-xs font-bold text-center text-red-900 tracking-wider placeholder:normal-case uppercase"
                  id="input-confirm-delete-word"
                />
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="bg-zinc-50 px-5 py-4 border-t border-zinc-150 flex gap-3 font-sans">
              <button
                type="button"
                onClick={() => {
                  setClienteParaEliminar(null);
                  setConfirmCheck(false);
                  setConfirmText('');
                }}
                className="flex-1 py-12 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold rounded-xl text-xs transition-all cursor-pointer border border-zinc-300 !py-2.5"
                id="btn-cancel-hard-delete"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!confirmCheck || confirmText !== 'ELIMINAR'}
                onClick={() => {
                  eliminarCliente(clienteParaEliminar.id);
                  if (selectedCliente?.id === clienteParaEliminar.id) {
                    setSelectedCliente(null);
                  }
                  setClienteParaEliminar(null);
                  setConfirmCheck(false);
                  setConfirmText('');
                }}
                className={`flex-1 font-bold rounded-xl text-xs border transition-all cursor-pointer !py-2.5 ${
                  confirmCheck && confirmText === 'ELIMINAR'
                    ? 'bg-red-650 hover:bg-red-700 text-white border-red-700 shadow-xs'
                    : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                }`}
                id="btn-confirm-hard-delete-action"
              >
                Eliminar Permanente
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
