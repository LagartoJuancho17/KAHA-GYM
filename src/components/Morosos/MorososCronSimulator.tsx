// src/components/Morosos/MorososCronSimulator.tsx
import React, { useState } from 'react';
import { useGym } from '../../GymContext';
import { Cpu, Play, RefreshCw } from 'lucide-react';

interface MorososCronSimulatorProps {
  simularFecha: string;
  setSimularFecha: (date: string) => void;
  clientesActivosCount: number;
}

export const MorososCronSimulator: React.FC<MorososCronSimulatorProps> = ({
  simularFecha,
  setSimularFecha,
  clientesActivosCount
}) => {
  const { ejecutarCronMorosidad } = useGym();

  const [cronRunning, setCronRunning] = useState(false);
  const [cronConsole, setCronConsole] = useState<string[]>([]);
  const [cronStatsResult, setCronStatsResult] = useState<any | null>(null);

  const handleTriggerEdgeFunction = () => {
    setCronRunning(true);
    setCronStatsResult(null);
    setCronConsole([
      '>> [Deno Server Instance] Booting check-morosidad edge function...',
      `>> Env: SUPABASE_URL connected, Service role bypass RLS activated.`,
      `>> Timezone override: America/Argentina/Buenos_Aires (Argentina-UTC hours offset computed).`,
      `>> Simulated current epoch evaluating date: [${simularFecha} 23:59:00]`,
      '>> Querying active database client catalog...'
    ]);

    setTimeout(() => {
      setCronConsole(prev => [...prev, `>> Success: Returned ${clientesActivosCount} active memberships.`]);
    }, 300);

    setTimeout(() => {
      setCronConsole(prev => [
        ...prev,
        `>> Evaluating grace period limits (Rules: Day 1, 5, 6-9, 10+).`,
        `>> Checking registered monthly coverages for mes-current: [${simularFecha.slice(0, 7)}]`
      ]);
    }, 600);

    setTimeout(() => {
      const result = ejecutarCronMorosidad(simularFecha);
      setCronStatsResult(result);
      setCronRunning(false);
      setCronConsole(prev => [
        ...prev,
        ...result.logLineas,
        `>> Deno response status: 200 (Success).`
      ]);
    }, 1200);
  };

  return (
    <div className="bg-zinc-950 text-white rounded-xl border border-zinc-800 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 shadow-xl leading-normal text-xs font-sans">
      {/* Info y fecha */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="text-amber-400 w-5 h-5" />
          <h3 className="font-sans font-bold text-sm tracking-tight uppercase">Simulador de Supabase Edge Function</h3>
        </div>

        <p className="text-zinc-400 text-xs font-sans leading-relaxed">
          La regla comercial determina: <strong>"Día 5 a las 23:59 vence el pago. Del día 6 al 9 se envían avisos y, a partir del día 10, las bajas de turno fijo quedan sujetas a revisión manual y confirmación del Administrador."</strong>
        </p>

        <p className="text-zinc-400 text-xs font-sans leading-relaxed">
          Para probar las automatizaciones del sistema, puedes escoger una fecha simulada posterior y gatillar la Edge Function con el botón.
        </p>

        <div className="space-y-1.5 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
          <label className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-sans">Fecha corriente de simulación</label>
          <input
            type="date"
            value={simularFecha}
            onChange={(e) => setSimularFecha(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-white rounded-md p-1.5 text-xs font-mono outline-hidden w-full focus:border-amber-500 font-bold"
          />
        </div>

        <button
          onClick={handleTriggerEdgeFunction}
          disabled={cronRunning}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black py-2.5 px-4 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/5 transition-all border-none cursor-pointer"
          id="btn-run-delinquency-cron"
        >
          {cronRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              Evaluando cartera...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-black" />
              Ejecutar Edge Function de Control
            </>
          )}
        </button>
      </div>

      {/* Consola interactiva de ejecución */}
      <div className="lg:col-span-2 flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-hidden h-72">
        <div className="space-y-1 select-none flex-1 overflow-y-auto font-mono text-[10.5px] text-zinc-300 pr-2">
          <span className="text-zinc-500 block uppercase font-sans font-bold text-[9px] tracking-wide mb-2">Terminal de ejecución en Tiempo Real:</span>
          {cronConsole.map((line, idx) => (
            <div key={idx} className="py-0.5 leading-relaxed">{line}</div>
          ))}
        </div>

        {cronStatsResult && (
          <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center text-xs animate-fade-in font-sans">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[9px]">Análisis Terminado con éxito</span>
            <div className="flex flex-wrap gap-4 font-mono font-semibold">
              <span>Procesados: <strong className="text-white">{cronStatsResult.procesados}</strong></span>
              <span>Pasaron a Mora: <strong className="text-red-400 font-bold">{cronStatsResult.nuevosMorosos}</strong></span>
              <span>Turnos Suspendidos (Semana 1): <strong className="text-amber-400 font-bold">{cronStatsResult.suspendidosSemanaCount}</strong></span>
              <span>Bajas de Turno: <strong className="text-red-400 font-bold">{cronStatsResult.dadosBajaCount}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
