// src/components/Turnos/SociosPrioritariosModal.tsx
// Alta y baja de socios con PRIORIDAD MAXIMA en la lista de espera de un turno.
// La prioridad es por (socio, turno): ser VIP del JUEVES-19:00 no da ventaja en
// el resto de los horarios. La lógica de orden vive en src/lib/listaEspera.ts.
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { X, Crown, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { SearchableSelect } from '../Common/SearchableSelect';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DIAS_ORDEN = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

export const SociosPrioritariosModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { clientes, turnos, sociosPrioritarios, marcarSocioPrioritario, quitarSocioPrioritario } = useGym();

  const [socioId, setSocioId] = useState('');
  const [turnoId, setTurnoId] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Los invitados usan emails ficticios y no tienen sentido como VIP.
  const opcionesSocios = useMemo(() => {
    return clientes
      .filter(c => c.activo && !(c.email || '').startsWith('invitado-'))
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`))
      .map(c => ({
        value: c.id,
        label: `${c.apellido}, ${c.nombre}`,
        searchString: `${c.nombre} ${c.apellido} ${c.email || ''}`
      }));
  }, [clientes]);

  const opcionesTurnos = useMemo(() => {
    return [...turnos]
      .sort((a, b) => {
        const d = DIAS_ORDEN.indexOf(a.dia) - DIAS_ORDEN.indexOf(b.dia);
        return d !== 0 ? d : a.hora.localeCompare(b.hora);
      })
      .map(t => ({
        value: t.id,
        label: `${t.dia} — ${t.hora} hs (cupo ${t.cupo_maximo})`,
        searchString: `${t.dia} ${t.hora}`
      }));
  }, [turnos]);

  // Las claves guardadas son `clienteId::turnoId`; se desarman para mostrarlas.
  const vigentes = useMemo(() => {
    return Array.from(sociosPrioritarios)
      .map(clave => {
        const [cid, tid] = clave.split('::');
        const c = clientes.find(x => x.id === cid);
        const t = turnos.find(x => x.id === tid);
        return {
          clave,
          clienteId: cid,
          turnoId: tid,
          socio: c ? `${c.apellido}, ${c.nombre}` : 'Socio dado de baja',
          turno: t ? `${t.dia} — ${t.hora} hs` : tid,
          huerfano: !c || !t
        };
      })
      .sort((a, b) => a.turno.localeCompare(b.turno) || a.socio.localeCompare(b.socio));
  }, [sociosPrioritarios, clientes, turnos]);

  if (!isOpen) return null;

  const limpiarAvisos = () => { setError(''); setExito(''); };

  const handleMarcar = async () => {
    limpiarAvisos();
    if (!socioId) { setError('Elegí un socio.'); return; }
    if (!turnoId) { setError('Elegí el día y horario.'); return; }

    setGuardando(true);
    const res = await marcarSocioPrioritario(socioId, turnoId, nota.trim() || undefined);
    setGuardando(false);

    if (res.success) {
      setExito(res.message);
      setSocioId(''); setTurnoId(''); setNota('');
      setTimeout(() => setExito(''), 5000);
    } else {
      setError(res.message);
    }
  };

  const handleQuitar = async (clienteId: string, tid: string) => {
    limpiarAvisos();
    const res = await quitarSocioPrioritario(clienteId, tid);
    if (res.success) {
      setExito(res.message);
      setTimeout(() => setExito(''), 3000);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="socios-prioritarios-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden relative animate-scale-in max-h-[90vh] flex flex-col">

        <div className="bg-violet-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-violet-300" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">Socios con Prioridad</h3>
              <p className="text-[10px] text-violet-200 mt-0.5">Entran primero cuando se libera un lugar en ese turno</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-violet-200 hover:text-white bg-violet-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs overflow-y-auto">

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {exito && (
            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg flex items-start gap-2 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{exito}</span>
            </div>
          )}

          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-[11px] text-violet-900 leading-relaxed">
            La prioridad es <strong>por socio y por horario</strong>. Si marcás a alguien en el
            Jueves 19:00, entra primero solo en ese turno. En el resto va por orden de llegada.
          </div>

          {/* Alta */}
          <div className="space-y-3 border border-zinc-200 rounded-xl p-3.5">
            <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest">Dar prioridad</p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-700">1. Socio</label>
              <SearchableSelect
                options={opcionesSocios}
                value={socioId}
                onChange={v => { setSocioId(v); limpiarAvisos(); }}
                placeholder="-- Buscar socio por nombre --"
                noOptionsText="No hay socios que coincidan"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-700">2. Día y horario</label>
              <SearchableSelect
                options={opcionesTurnos}
                value={turnoId}
                onChange={v => { setTurnoId(v); limpiarAvisos(); }}
                placeholder="-- Buscar día y horario --"
                noOptionsText="No hay turnos que coincidan"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-700">
                3. Nota <span className="font-normal text-zinc-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Ej: socio fundador, acuerdo especial"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
              />
            </div>

            <button
              onClick={handleMarcar}
              disabled={guardando}
              className="w-full bg-violet-700 hover:bg-violet-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer border-none flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" />
              {guardando ? 'Guardando...' : 'Marcar como prioritario'}
            </button>
          </div>

          {/* Vigentes */}
          <div className="space-y-2">
            <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest">
              Con prioridad hoy ({vigentes.length})
            </p>

            {vigentes.length === 0 ? (
              <p className="text-zinc-400 italic text-[11px] py-3 bg-zinc-50/60 rounded-lg border border-dashed border-zinc-200 text-center">
                Todavía no hay ningún socio con prioridad.
              </p>
            ) : (
              <div className="space-y-1.5">
                {vigentes.map(v => (
                  <div key={v.clave} className="flex justify-between items-center bg-violet-50 border border-violet-200 rounded-lg p-2.5">
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-900 text-[11px] truncate">{v.socio}</p>
                      <p className="text-[10px] text-violet-800 font-mono">{v.turno}</p>
                      {v.huerfano && (
                        <p className="text-[10px] text-amber-700">El socio o el turno ya no existe. Conviene quitarlo.</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleQuitar(v.clienteId, v.turnoId)}
                      className="text-violet-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent shrink-0"
                      title="Quitar la prioridad de este socio en este turno"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-100 bg-zinc-50/60 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-zinc-900 hover:bg-black text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer border-none"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
