// Gate tests de la ocupación de turnos. Deterministas, sin red, sin React.
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularOcupacion, conflictosAlAgregarFijo, conflictosAlBajarCupo,
  contarFijosActivos, contarReservas, contarRecuperos, estaSuspendido, reservasPropiasDuplicadas
} from './ocupacion';
import { Cliente, Turno, RecuperoTurno } from '../types';

const turno = (over: Partial<Turno> = {}): Turno => ({
  id: 'MIERCOLES-19:00',
  dia: 'MIERCOLES',
  hora: '19:00',
  cupo_maximo: 7,
  asignados_ids: [],
  lista_espera_ids: [],
  ...over
});

const socio = (id: string, over: Partial<Cliente> = {}): Cliente => ({
  id,
  nombre: id,
  apellido: 'Test',
  email: `${id}@kaha.com`,
  telefono: '',
  tipo: 'FIJO',
  plan_id: 'p1',
  estado: 'ACTIVO',
  activo: true,
  turnos_fijos: [],
  deuda_acumulada: 0,
  ultimo_mes_pagado: '',
  creado_at: '',
  reservas_individuales: [],
  clases_suspendidas: [],
  ...over
} as Cliente);

const recupero = (turnoId: string, fecha: string, estado: RecuperoTurno['estado'] = 'PENDIENTE'): RecuperoTurno => ({
  id: 'r' + turnoId + fecha,
  cliente_id: 'x',
  cliente_nombre: 'x',
  turno_original_id: 'LUNES-07:30',
  fecha_inasistencia: '2026-08-01',
  turno_recupero_id: turnoId,
  fecha_recupero: fecha,
  estado,
  fecha_limite: '2026-09-01'
});

const reserva = (turnoId: string, fecha: string) => ({
  id: 'res-' + turnoId + fecha, turno_id: turnoId, fecha, creado_at: ''
});

// --- básico -----------------------------------------------------------------

test('turno vacío: ocupación 0 y no está lleno', () => {
  const o = calcularOcupacion(turno(), '2026-08-26', []);
  assert.equal(o.total, 0);
  assert.equal(o.lleno, false);
  assert.equal(o.libres, 7);
});

test('cuenta los fijos asignados', () => {
  const t = turno({ asignados_ids: ['a', 'b', 'c'] });
  const cs = [socio('a'), socio('b'), socio('c')];
  assert.equal(calcularOcupacion(t, '2026-08-26', cs).total, 3);
});

test('un fijo suspendido ese día libera el lugar', () => {
  const t = turno({ asignados_ids: ['a', 'b'] });
  const cs = [
    socio('a', { clases_suspendidas: [{ turno_id: 'MIERCOLES-19:00', fecha: '2026-08-26', reintegrado: false, creado_at: '' }] as any }),
    socio('b')
  ];
  const o = calcularOcupacion(t, '2026-08-26', cs);
  assert.equal(o.fijos, 2);
  assert.equal(o.fijosActivos, 1);
  assert.equal(o.suspendidos, 1);
  assert.equal(o.total, 1);
});

test('la suspensión sólo aplica a SU fecha, no a las demás', () => {
  const t = turno({ asignados_ids: ['a'] });
  const cs = [socio('a', { clases_suspendidas: [{ turno_id: 'MIERCOLES-19:00', fecha: '2026-08-26', reintegrado: false, creado_at: '' }] as any })];
  assert.equal(calcularOcupacion(t, '2026-08-26', cs).total, 0);
  assert.equal(calcularOcupacion(t, '2026-09-02', cs).total, 1, 'otra fecha: el fijo sí cuenta');
});

test('reintegrado=true NO cambia la ocupación (es sólo el crédito al socio)', () => {
  // Regresión: una consulta que filtraba por reintegrado daba números distintos
  // a los de la app. El campo indica si se le devolvió el crédito por avisar con
  // más de 3hs, no si la persona viene. Falta igual, así que el lugar queda libre.
  const t = turno({ asignados_ids: ['a'] });
  const conCredito = [socio('a', { clases_suspendidas: [{ turno_id: 'MIERCOLES-19:00', fecha: '2026-08-26', reintegrado: true, creado_at: '' }] as any })];
  const sinCredito = [socio('a', { clases_suspendidas: [{ turno_id: 'MIERCOLES-19:00', fecha: '2026-08-26', reintegrado: false, creado_at: '' }] as any })];
  assert.equal(calcularOcupacion(t, '2026-08-26', conCredito).total, 0);
  assert.equal(calcularOcupacion(t, '2026-08-26', sinCredito).total, 0);
});

test('suma las reservas individuales de esa fecha', () => {
  const t = turno({ asignados_ids: ['a'] });
  const cs = [socio('a'), socio('b', { reservas_individuales: [reserva('MIERCOLES-19:00', '2026-08-26')] as any })];
  assert.equal(calcularOcupacion(t, '2026-08-26', cs).total, 2);
  assert.equal(calcularOcupacion(t, '2026-09-02', cs).total, 1, 'la reserva es sólo de su fecha');
});

test('un socio dado de baja no ocupa lugar con su reserva', () => {
  const cs = [socio('b', { activo: false, reservas_individuales: [reserva('MIERCOLES-19:00', '2026-08-26')] as any })];
  assert.equal(calcularOcupacion(turno(), '2026-08-26', cs).total, 0);
});

test('los recuperos PENDIENTE y COMPLETADO ocupan lugar; EXPIRADO no', () => {
  // Regresión: crearReservaIndividual contaba sólo PENDIENTE mientras la turnera
  // contaba PENDIENTE+COMPLETADO. Apenas se marcaba la asistencia de un recupero,
  // su lugar quedaba libre para el chequeo de reservas y entraba uno de más.
  const t = turno();
  const recs = [
    recupero('MIERCOLES-19:00', '2026-08-26', 'PENDIENTE'),
    recupero('MIERCOLES-19:00', '2026-08-26', 'COMPLETADO'),
    recupero('MIERCOLES-19:00', '2026-08-26', 'EXPIRADO')
  ];
  assert.equal(calcularOcupacion(t, '2026-08-26', [], recs).total, 2);
});

test('lleno usa >= y no >', () => {
  const t = turno({ cupo_maximo: 2, asignados_ids: ['a', 'b'] });
  const o = calcularOcupacion(t, '2026-08-26', [socio('a'), socio('b')]);
  assert.equal(o.total, 2);
  assert.equal(o.lleno, true, '2 de 2 ya está lleno');
  assert.equal(o.libres, 0);
});

// --- la causa raíz del bug reportado ----------------------------------------

test('REGRESION: asignar un fijo con reservas futuras ya tomadas produce sobrecupo', () => {
  // Caso real de produccion: MIERCOLES-19:00, cupo 7.
  // Jesica Corruega tenía reservas puntuales para 26/08, 02/09 y 09/09 (creadas el 17/08).
  // El 19/08 un admin asignó el 7mo fijo. `asignarClienteFijo` sólo miraba
  // asignados_ids.length (6 < 7 => pasa) y era CIEGA A LA FECHA, así que esas tres
  // fechas quedaron en 8 sobre 7.
  const t = turno({ cupo_maximo: 7, asignados_ids: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] });
  const cs = [
    ...['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].map(id => socio(id)),
    socio('jesica', {
      reservas_individuales: [
        reserva('MIERCOLES-19:00', '2026-08-26'),
        reserva('MIERCOLES-19:00', '2026-09-02'),
        reserva('MIERCOLES-19:00', '2026-09-09')
      ] as any
    })
  ];

  // El chequeo viejo (sólo fijos) diría que hay lugar:
  assert.equal(t.asignados_ids.length < t.cupo_maximo, true, 'el chequeo viejo dejaba pasar');

  // El chequeo nuevo detecta las tres fechas en conflicto:
  const conflictos = conflictosAlAgregarFijo(t, cs, [], '2026-08-20');
  assert.equal(conflictos.length, 3);
  assert.deepEqual(conflictos.map(c => c.fecha), ['2026-08-26', '2026-09-02', '2026-09-09']);
  for (const c of conflictos) {
    assert.equal(c.ocupacionActual, 7, '6 fijos + 1 reserva = 7, ya lleno');
    assert.equal(c.ocupacionConElFijo, 8, 'con el fijo nuevo quedaría 8 sobre 7');
    assert.equal(c.cupo, 7);
  }
});

test('agregar un fijo sin reservas futuras no genera conflicto', () => {
  const t = turno({ cupo_maximo: 7, asignados_ids: ['f1', 'f2'] });
  const cs = ['f1', 'f2'].map(id => socio(id));
  assert.deepEqual(conflictosAlAgregarFijo(t, cs, [], '2026-08-20'), []);
});

test('conflictosAlAgregarFijo ignora fechas pasadas', () => {
  const t = turno({ cupo_maximo: 1, asignados_ids: [] });
  const cs = [socio('b', {
    reservas_individuales: [reserva('MIERCOLES-19:00', '2026-08-05'), reserva('MIERCOLES-19:00', '2026-08-26')] as any
  })];
  const conflictos = conflictosAlAgregarFijo(t, cs, [], '2026-08-20');
  assert.equal(conflictos.length, 1);
  assert.equal(conflictos[0].fecha, '2026-08-26', 'la del 05/08 ya pasó, no importa');
});

test('conflictosAlAgregarFijo tiene en cuenta suspensiones que liberan lugar', () => {
  const t = turno({ cupo_maximo: 2, asignados_ids: ['f1'] });
  const cs = [
    socio('f1', { clases_suspendidas: [{ turno_id: 'MIERCOLES-19:00', fecha: '2026-08-26', reintegrado: false, creado_at: '' }] as any }),
    socio('b', { reservas_individuales: [reserva('MIERCOLES-19:00', '2026-08-26')] as any })
  ];
  // Ese día: 0 fijos activos + 1 reserva = 1. Con el fijo nuevo = 2 = cupo. No excede.
  assert.deepEqual(conflictosAlAgregarFijo(t, cs, [], '2026-08-20'), []);
});

test('conflictosAlAgregarFijo cuenta también los recuperos', () => {
  const t = turno({ cupo_maximo: 1, asignados_ids: [] });
  const recs = [recupero('MIERCOLES-19:00', '2026-08-26')];
  const conflictos = conflictosAlAgregarFijo(t, [], recs, '2026-08-20');
  assert.equal(conflictos.length, 1);
  assert.equal(conflictos[0].ocupacionConElFijo, 2);
});

// --- bajar el cupo ----------------------------------------------------------

test('bajar el cupo por debajo de los fijos se detecta', () => {
  const t = turno({ cupo_maximo: 8, asignados_ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] });
  const cs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => socio(id));
  const conflictos = conflictosAlBajarCupo(t, cs, [], 7, '2026-08-20');
  assert.ok(conflictos.length >= 1);
  assert.equal(conflictos[0].fecha, '(todas las semanas)');
  assert.equal(conflictos[0].ocupacionActual, 8);
});

test('bajar el cupo sin dejar a nadie afuera no da conflicto', () => {
  const t = turno({ cupo_maximo: 8, asignados_ids: ['a', 'b'] });
  const cs = [socio('a'), socio('b')];
  assert.deepEqual(conflictosAlBajarCupo(t, cs, [], 7, '2026-08-20'), []);
});

test('bajar el cupo detecta una fecha puntual que queda excedida', () => {
  const t = turno({ cupo_maximo: 8, asignados_ids: ['a', 'b', 'c'] });
  const cs = [
    socio('a'), socio('b'), socio('c'),
    socio('d', { reservas_individuales: [reserva('MIERCOLES-19:00', '2026-08-26')] as any })
  ];
  // Ese día hay 4. Bajar a 3 lo deja excedido.
  const conflictos = conflictosAlBajarCupo(t, cs, [], 3, '2026-08-20');
  assert.equal(conflictos.some(c => c.fecha === '2026-08-26'), true);
});

// --- helpers ----------------------------------------------------------------

test('helpers sueltos', () => {
  const cs = [socio('a', { clases_suspendidas: [{ turno_id: 'T', fecha: 'F', reintegrado: false, creado_at: '' }] as any })];
  assert.equal(estaSuspendido(cs[0], 'T', 'F'), true);
  assert.equal(estaSuspendido(cs[0], 'T', 'OTRA'), false);
  assert.equal(estaSuspendido(undefined, 'T', 'F'), false);
  assert.equal(contarFijosActivos(turno({ asignados_ids: ['a'] }), cs, 'X'), 1);
  assert.equal(contarReservas(turno({ id: 'T' }), [], 'F'), 0);
  assert.equal(contarRecuperos('T', [], 'F'), 0);
});

test('tolera turnos y listas vacías o indefinidas', () => {
  const t = { id: 'X', dia: 'LUNES', hora: '07:30', cupo_maximo: 5 } as Turno;
  const o = calcularOcupacion(t, '2026-08-26', []);
  assert.equal(o.total, 0);
  assert.equal(o.fijos, 0);
});

// --- duplicación fijo + reserva propia (el caso real de produccion) ---------

test('REGRESION: detecta las reservas propias del socio que se hace fijo', () => {
  // Caso real: Jesica Corruega reservó MIERCOLES-19:00 para 26/08, 02/09 y 09/09
  // el 17/08, y el 18/08 un admin la asignó como FIJA de ese mismo turno.
  // Sus reservas quedaron y pasó a contarse dos veces en esas tres fechas.
  const jesica = socio('jesica', {
    reservas_individuales: [
      reserva('MIERCOLES-19:00', '2026-08-26'),
      reserva('MIERCOLES-19:00', '2026-09-02'),
      reserva('MIERCOLES-19:00', '2026-09-09'),
      reserva('MARTES-17:00', '2026-08-25')   // otro turno: no se toca
    ] as any
  });
  const dups = reservasPropiasDuplicadas(jesica, 'MIERCOLES-19:00', '2026-08-20');
  assert.deepEqual(dups, ['2026-08-26', '2026-09-02', '2026-09-09']);
});

test('reservasPropiasDuplicadas ignora fechas pasadas', () => {
  const c = socio('x', { reservas_individuales: [
    reserva('MIERCOLES-19:00', '2026-08-05'),
    reserva('MIERCOLES-19:00', '2026-08-26')
  ] as any });
  assert.deepEqual(reservasPropiasDuplicadas(c, 'MIERCOLES-19:00', '2026-08-20'), ['2026-08-26']);
});

test('las reservas propias NO cuentan como conflicto al hacerse fijo', () => {
  // 6 fijos de 7, y el septimo es alguien que ya tenia su propia reserva ese dia.
  // Como su reserva se limpia al asignarlo, no hay sobrecupo: sigue siendo 7.
  const t = turno({ cupo_maximo: 7, asignados_ids: ['f1','f2','f3','f4','f5','f6'] });
  const cs = [
    ...['f1','f2','f3','f4','f5','f6'].map(id => socio(id)),
    socio('jesica', { reservas_individuales: [reserva('MIERCOLES-19:00', '2026-08-26')] as any })
  ];
  // Sin pasar el clienteId, la reserva propia se ve como gente extra (falso conflicto):
  assert.equal(conflictosAlAgregarFijo(t, cs, [], '2026-08-20').length, 1);
  // Pasando el clienteId, se descuenta correctamente y no hay conflicto:
  assert.deepEqual(conflictosAlAgregarFijo(t, cs, [], '2026-08-20', 'jesica'), []);
});

test('reserva de OTRA persona sí sigue siendo conflicto real', () => {
  const t = turno({ cupo_maximo: 7, asignados_ids: ['f1','f2','f3','f4','f5','f6'] });
  const cs = [
    ...['f1','f2','f3','f4','f5','f6'].map(id => socio(id)),
    socio('otro', { reservas_individuales: [reserva('MIERCOLES-19:00', '2026-08-26')] as any }),
    socio('nuevo')
  ];
  const conflictos = conflictosAlAgregarFijo(t, cs, [], '2026-08-20', 'nuevo');
  assert.equal(conflictos.length, 1, 'la reserva de otro socio sí ocupa un lugar real');
  assert.equal(conflictos[0].ocupacionConElFijo, 8);
});
