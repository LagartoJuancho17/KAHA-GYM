// src/components/Profesores/ProfesoresAdminModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGym } from '../../GymContext';
import { Profesor } from '../../types';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  DollarSign,
  KeyRound,
  UserCheck,
  ShieldCheck,
  Check
} from 'lucide-react';

interface ProfesoresAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfesoresAdminModal: React.FC<ProfesoresAdminModalProps> = ({
  isOpen,
  onClose
}) => {
  const { profesores, turnos, registrarProfesor, updateProfesor, eliminarProfesor } = useGym();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [valorHora, setValorHora] = useState('2200');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const profesoresActivos = profesores.filter(p => p.activo !== false);

  const resetForm = () => {
    setEditingId(null);
    setNombre('');
    setEmail('');
    setTelefono('');
    setValorHora('2200');
    setPassword('');
    setErrorMsg('');
  };

  const handleStartEdit = (prof: Profesor) => {
    setEditingId(prof.id);
    setNombre(prof.nombre || '');
    setEmail(prof.email || '');
    setTelefono(prof.telefono || '');
    setValorHora(String(prof.valor_hora || 2200));
    setPassword(prof.password || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanNombre = nombre.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanTel = telefono.trim();
    const numValor = Number(valorHora) || 2200;
    const cleanPass = password.trim();

    if (!cleanNombre) {
      setErrorMsg('El nombre del profesor es obligatorio.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Ingresá un correo electrónico válido para que pueda iniciar sesión en el Panel de Profesor.');
      return;
    }

    if (editingId) {
      updateProfesor(editingId, {
        nombre: cleanNombre,
        email: cleanEmail,
        telefono: cleanTel,
        valor_hora: numValor,
        password: cleanPass || undefined
      });
      setSuccessMsg(`Datos de ${cleanNombre} actualizados correctamente.`);
      resetForm();
    } else {
      const res = registrarProfesor({
        nombre: cleanNombre,
        email: cleanEmail,
        telefono: cleanTel,
        valor_hora: numValor,
        password: cleanPass || undefined
      });
      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
      setSuccessMsg(`¡Profesor ${cleanNombre} agregado! Ya tiene acceso al Panel de Profesor con ${cleanEmail}.`);
      resetForm();
    }
  };

  const handleDelete = (prof: Profesor) => {
    if (window.confirm(`¿Dar de baja al profesor "${prof.nombre}" (${prof.email})?`)) {
      eliminarProfesor(prof.id);
      if (editingId === prof.id) {
        resetForm();
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans text-xs animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-profesores-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92dvh] flex flex-col overflow-hidden text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-800 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-500 text-white flex items-center justify-center font-extrabold shadow-xs shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="modal-profesores-title" className="text-sm sm:text-base font-bold tracking-tight text-white">
                Gestión de Profesores y Accesos
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">
                Agregá o editá profesores para darles acceso al Panel de Profesor y asignarlos a turnos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700 shrink-0"
            aria-label="Cerrar modal de profesores"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* FORMULARIO DE ALTA / EDICIÓN */}
          <form
            onSubmit={handleSubmit}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                {editingId ? (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-violet-600" />
                    <span>Editar Profesor</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Agregar Nuevo Profesor</span>
                  </>
                )}
              </span>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Nombre / Apodo *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Christian Martínez"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-hidden focus:border-violet-600"
                  id="input-profesor-nombre"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Correo Electrónico (Login al Panel) *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ejemplo@hotmail.com / gmail.com"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-hidden focus:border-violet-600"
                    id="input-profesor-email"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Teléfono / Celular
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="Ej: 11-4455-6677"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-hidden focus:border-violet-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Valor Hora / Clase ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={valorHora}
                      onChange={e => setValorHora(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-hidden focus:border-violet-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Clave (Opcional)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="profe123"
                      className="w-full pl-7 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-hidden focus:border-violet-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <p className="text-[10.5px] text-slate-500 leading-snug">
                🔑 <strong>Acceso al Panel de Profesor:</strong> Puede entrar con Google (si es Gmail) o con correo y contraseña usando{' '}
                <code className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-violet-700 font-bold">profe123</code>,{' '}
                <code className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-violet-700 font-bold">kaha1234</code>, su celular o la clave que le asignes.
              </p>

              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 border-none"
                id="btn-submit-profesor"
              >
                {editingId ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Plus className="w-3.5 h-3.5 text-lime-400" />}
                <span>{editingId ? 'Guardar Cambios' : 'Agregar Profesor'}</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                {successMsg}
              </div>
            )}
          </form>

          {/* LISTA DE PROFESORES ACTIVOS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Profesores Activos ({profesoresActivos.length})
              </h4>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {profesoresActivos.map(prof => {
                const turnosAsignados = turnos.filter(
                  t => (t.profesor || '').trim().toLowerCase() === prof.nombre.trim().toLowerCase()
                );

                return (
                  <div
                    key={prof.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          👤 {prof.nombre}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" /> Panel Profesor Habilitado
                        </span>
                        {turnosAsignados.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                            {turnosAsignados.length} turno{turnosAsignados.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span className="text-slate-700 font-semibold">{prof.email || 'Sin correo'}</span>
                        {prof.telefono && <span>· 📱 {prof.telefono}</span>}
                        <span>· 💵 ${(prof.valor_hora || 0).toLocaleString('es-AR')}/clase</span>
                        {prof.password && <span>· 🔑 Clave: {prof.password}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(prof)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors border-none"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(prof)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors border-none bg-transparent"
                        title="Dar de baja profesor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors border-none"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
