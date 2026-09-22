// src/lib/pausa.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  estaPausado, obtenerMesPausa, estaPausadoEnFecha, 
  pausadosPendientesDeRevision, generarNotaPausa, removerNotaPausa 
} from './pausa';
import { calcularOcupacion, contarFijosActivos, estaSuspendido } from './ocupacion';
import { Cliente, Turno } from '../types';

const mockClienteBase: Cliente = {
  id: 'c-1',
  nombre: 'Martina',
  apellido: 'Lopez',
  email: 'martina@example.com',
  telefono: '1122334455',
  tipo: 'FIJO',
  estado: 'ACTIVO',
  plan_id: 'p-2dias',
  activo: true,
  deuda_acumulada: 0,
  ultimo_mes_pagado: '2026-08',
  turnos_fijos: ['LUNES-18:00', 'MIERCOLES-18:00'],
  creado_at: '2026-01-01T00:00:00Z'
};

const mockTurno: Turno = {
  id: 'LUNES-18:00',
  dia: 'LUNES',
  hora: '18:00',
  cupo_maximo: 8,
  asignados_ids: ['c-1', 'c-2'],
  lista_espera_ids: []
};

test('estaPausado detecta socios con exencion_cobro SUSPENDIDO', () => {
  assert.equal(estaPausado({ exencion_cobro: 'SUSPENDIDO' }), true);
  assert.equal(estaPausado({ exencion_cobro: 'NINGUNA' }), false);
  assert.equal(estaPausado({ exencion_cobro: 'BECADO' }), false);
  assert.equal(estaPausado(undefined), false);
});

test('obtenerMesPausa extrae mes desde nota_plan_personalizado o ultimo_mes_pagado', () => {
  const cConNota: Cliente = {
    ...mockClienteBase,
    exencion_cobro: 'SUSPENDIDO',
    nota_plan_personalizado: 'PAUSA:2026-09 | Acuerdo previo'
  };
  assert.equal(obtenerMesPausa(cConNota), '2026-09');

  const cSinNota: Cliente = {
    ...mockClienteBase,
    exencion_cobro: 'SUSPENDIDO',
    ultimo_mes_pagado: '2026-08'
  };
  assert.equal(obtenerMesPausa(cSinNota), '2026-08');
});

test('estaPausadoEnFecha: durante todo el mes de la pausa figura pausado, no en otros meses', () => {
  const cPausadoSeptiembre: Cliente = {
    ...mockClienteBase,
    exencion_cobro: 'SUSPENDIDO',
    nota_plan_personalizado: 'PAUSA:2026-09'
  };

  // En cualquier día de Septiembre 2026: está pausado
  assert.equal(estaPausadoEnFecha(cPausadoSeptiembre, '2026-09-01'), true);
  assert.equal(estaPausadoEnFecha(cPausadoSeptiembre, '2026-09-15'), true);
  assert.equal(estaPausadoEnFecha(cPausadoSeptiembre, '2026-09-30'), true);

  // En Octubre 2026 o Agosto 2026: no está en ese mes de pausa
  assert.equal(estaPausadoEnFecha(cPausadoSeptiembre, '2026-10-01'), false);
  assert.equal(estaPausadoEnFecha(cPausadoSeptiembre, '2026-08-31'), false);
});

test('Turnera vs Matriz: socio pausado libera cupo en Turnera pero conserva su lugar en la Matriz', () => {
  const cPausado: Cliente = {
    ...mockClienteBase,
    id: 'c-1',
    exencion_cobro: 'SUSPENDIDO',
    nota_plan_personalizado: 'PAUSA:2026-09'
  };

  const cNormal: Cliente = {
    ...mockClienteBase,
    id: 'c-2',
    nombre: 'Pedro',
    exencion_cobro: 'NINGUNA'
  };

  const clientes = [cPausado, cNormal];

  // 1. En la Matriz Semanal: ambos figuran en asignados_ids
  assert.equal(mockTurno.asignados_ids.length, 2);
  assert.ok(mockTurno.asignados_ids.includes('c-1'));

  // 2. En la Turnera para fecha 2026-09-14: c-1 está suspendido/pausado
  assert.equal(estaSuspendido(cPausado, mockTurno.id, '2026-09-14'), true);
  assert.equal(estaSuspendido(cNormal, mockTurno.id, '2026-09-14'), false);

  // 3. Fijos activos en Turnera sólo cuenta 1 (Pedro)
  const fijosActivos = contarFijosActivos(mockTurno, clientes, '2026-09-14');
  assert.equal(fijosActivos, 1);

  // 4. Ocupación de la Turnera: total = 1, libres = 7 (cupo 8)
  const ocupacion = calcularOcupacion(mockTurno, '2026-09-14', clientes, []);
  assert.equal(ocupacion.fijos, 2, 'En la matriz hay 2 fijos');
  assert.equal(ocupacion.fijosActivos, 1, 'En la turnera sólo 1 activo');
  assert.equal(ocupacion.suspendidos, 1, '1 suspendido/pausado');
  assert.equal(ocupacion.libres, 7, 'El lugar de la pausa quedó libre');
});

test('pausadosPendientesDeRevision detecta socios pausados cuyo mes ya concluyó', () => {
  const cPausadoAgosto: Cliente = {
    ...mockClienteBase,
    id: 'c-agosto',
    exencion_cobro: 'SUSPENDIDO',
    ultimo_mes_pagado: '2026-08'
  };

  const cPausadoSeptiembre: Cliente = {
    ...mockClienteBase,
    id: 'c-septiembre',
    exencion_cobro: 'SUSPENDIDO',
    nota_plan_personalizado: 'PAUSA:2026-09'
  };

  const cActivo: Cliente = {
    ...mockClienteBase,
    id: 'c-activo',
    exencion_cobro: 'NINGUNA'
  };

  const clientes = [cPausadoAgosto, cPausadoSeptiembre, cActivo];

  // Estando en Septiembre 2026: el de Agosto ya venció y requiere revisión. El de Septiembre sigue vigente.
  const paraRevisar = pausadosPendientesDeRevision(clientes, '2026-09');
  assert.equal(paraRevisar.length, 1);
  assert.equal(paraRevisar[0].id, 'c-agosto');

  // Estando en Octubre 2026: ambos requieren revisión
  const paraRevisarOctubre = pausadosPendientesDeRevision(clientes, '2026-10');
  assert.equal(paraRevisarOctubre.length, 2);
});

test('generarNotaPausa y removerNotaPausa manejan correctamente los textos', () => {
  const notaGenerada = generarNotaPausa('2026-09', 'Acuerdo telefónico');
  assert.equal(notaGenerada, 'PAUSA:2026-09 | Acuerdo telefónico');

  const notaPostergar = generarNotaPausa('2026-10', notaGenerada);
  assert.equal(notaPostergar, 'PAUSA:2026-10 | Acuerdo telefónico');

  const notaLimpia = removerNotaPausa(notaPostergar);
  assert.equal(notaLimpia, 'Acuerdo telefónico');

  const soloPausa = generarNotaPausa('2026-09', null);
  assert.equal(soloPausa, 'PAUSA:2026-09');
  assert.equal(removerNotaPausa(soloPausa), null);
});
