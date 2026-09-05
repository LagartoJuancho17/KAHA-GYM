// supabase/tests/concurrencia_cupo.mjs
//
// Prueba REAL de concurrencia contra la base: dos socios pelean el ultimo lugar
// de un turno al mismo tiempo. Exactamente uno tiene que entrar.
//
// Esto no se puede probar con un test unitario: el bug vive en la interaccion
// entre dos transacciones simultaneas en Postgres (READ COMMITTED), no en la
// logica de una sola.
//
//   node supabase/tests/concurrencia_cupo.mjs
//
// Crea un turno y socios de prueba propios, y los borra al terminar (incluso si
// falla). No toca datos reales.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Credenciales desde .env, nunca hardcodeadas.
const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const URL_SB = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
if (!URL_SB || !KEY) {
  console.error('Faltan credenciales de Supabase en .env');
  process.exit(1);
}
const sb = createClient(URL_SB, KEY);

const SUFIJO = `test-conc-${Date.now()}`;
const FECHA = '2027-01-04';           // fecha lejana, no choca con nada real
let turnoId = null;
const socios = [];

async function limpiar() {
  for (const id of socios) await sb.from('clientes').delete().eq('id', id);
  if (turnoId) await sb.from('turnos').delete().eq('id', turnoId);
}

async function main() {
  // 1. Turno de prueba con cupo 1: el escenario mas duro posible.
  const { data: turno, error: eT } = await sb.from('turnos')
    .insert({ dia: 'LUNES', hora: '23:59:00', cupo_maximo: 1, profesor: SUFIJO })
    .select().single();
  if (eT) throw new Error('No pude crear el turno: ' + eT.message);
  turnoId = turno.id;

  // 2. Dos socios que van a pelear ese unico lugar.
  for (const n of ['A', 'B']) {
    const { data, error } = await sb.from('clientes').insert({
      nombre: `Conc${n}`, apellido: SUFIJO, email: `conc-${n}-${Date.now()}@test.local`,
      telefono: '11-0000-0000', tipo: 'FIJO', estado: 'ACTIVO', activo: true,
      deuda_acumulada: 0,
      // 'Aun no sabe': plan neutro que ya existe, para no inventar datos.
      plan_id: '00000000-0000-0000-0000-000000000000'
    }).select().single();
    if (error) throw new Error('No pude crear el socio: ' + error.message);
    socios.push(data.id);
  }

  console.log(`Turno de prueba: cupo 1, fecha ${FECHA}`);
  console.log('Disparando 2 reservas SIMULTANEAS por el mismo lugar...\n');

  // 3. Las dos a la vez, sin await entre medio.
  const [r1, r2] = await Promise.all(
    socios.map(id => sb.rpc('kaha_crear_reserva', {
      p_cliente_id: id, p_turno_id: turnoId, p_fecha: FECHA
    }))
  );

  const res = [r1.data, r2.data];
  res.forEach((r, i) => console.log(`  socio ${i + 1}:`, JSON.stringify(r)));

  const entraron = res.filter(r => r && r.ok).length;
  const rechazados = res.filter(r => r && !r.ok && r.motivo === 'lleno').length;

  // 4. Lo que quedo de verdad en la base.
  const { data: ocup } = await sb.rpc('kaha_ocupacion_turno', {
    p_turno_id: turnoId, p_fecha: FECHA
  });

  console.log(`\n  entraron: ${entraron} | rechazados por lleno: ${rechazados}`);
  console.log(`  ocupacion real en la base: ${ocup} (cupo 1)`);

  const ok = entraron === 1 && rechazados === 1 && ocup === 1;
  console.log(ok
    ? '\nPASA: exactamente uno entro, el otro fue rechazado.'
    : `\nFALLA: se esperaba 1 adentro y 1 rechazado, ocupacion 1.`);
  return ok;
}

let ok = false;
try {
  ok = await main();
} catch (e) {
  console.error('ERROR:', e.message);
} finally {
  await limpiar();
  console.log('Datos de prueba borrados.');
}
process.exit(ok ? 0 : 1);
