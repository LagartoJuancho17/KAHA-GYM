// src/lib/pagoDividido.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sincronizarMedioYDestino,
  validarPartes,
  restoSinAsignar,
  partesAPagos,
  asignarPartesACobros,
  ParteDePago
} from './pagoDividido';

const parte = (over: Partial<ParteDePago> = {}): ParteDePago => ({
  id: over.id || 'p1',
  medio: 'TRANSFERENCIA',
  destino: 'RULO',
  monto: 1000,
  ...over
});

// --- Sincronización efectivo (pedido de Juanchi) ---

test('poner EFECTIVO como vía de pago cambia el destino a EFECTIVO solo', () => {
  const r = sincronizarMedioYDestino({ medio: 'EFECTIVO', destino: 'RULO' }, 'medio');
  assert.deepEqual(r, { medio: 'EFECTIVO', destino: 'EFECTIVO' });
});

test('poner EFECTIVO como destino cambia la vía de pago a EFECTIVO solo', () => {
  const r = sincronizarMedioYDestino({ medio: 'TRANSFERENCIA', destino: 'EFECTIVO' }, 'destino');
  assert.deepEqual(r, { medio: 'EFECTIVO', destino: 'EFECTIVO' });
});

test('REGRESION: salir de efectivo por un lado no deja el otro lado en efectivo', () => {
  // Sin esto quedaba registrado "transferencia que cayó en la caja", que no existe.
  const porMedio = sincronizarMedioYDestino({ medio: 'TRANSFERENCIA', destino: 'EFECTIVO' }, 'medio');
  assert.equal(porMedio.destino, 'RULO');

  const porDestino = sincronizarMedioYDestino({ medio: 'EFECTIVO', destino: 'JUANCHI' }, 'destino');
  assert.equal(porDestino.medio, 'TRANSFERENCIA');
});

test('un cambio entre medios que no son efectivo no toca el destino', () => {
  const r = sincronizarMedioYDestino({ medio: 'MERCADO_PAGO', destino: 'JUANCHI' }, 'medio');
  assert.deepEqual(r, { medio: 'MERCADO_PAGO', destino: 'JUANCHI' });
});

test('cambiar de destino entre cuentas no toca la vía de pago', () => {
  const r = sincronizarMedioYDestino({ medio: 'TRANSFERENCIA', destino: 'JUANCHI' }, 'destino');
  assert.deepEqual(r, { medio: 'TRANSFERENCIA', destino: 'JUANCHI' });
});

// --- Pago partido en varios medios ---

test('mitad efectivo y mitad transferencia cierra contra el total', () => {
  const partes = [
    parte({ id: 'a', medio: 'EFECTIVO', destino: 'EFECTIVO', monto: 32500 }),
    parte({ id: 'b', medio: 'TRANSFERENCIA', destino: 'RULO', monto: 32500 })
  ];
  const r = validarPartes(partes, 65000);
  assert.equal(r.ok, true);
  assert.equal(r.suma, 65000);
  assert.equal(r.faltante, 0);
});

test('si las partes no llegan al total, no deja registrar y dice cuánto falta', () => {
  const partes = [parte({ monto: 30000 })];
  const r = validarPartes(partes, 65000);
  assert.equal(r.ok, false);
  assert.equal(r.faltante, 35000);
  assert.match(r.motivo || '', /Faltan/);
});

test('si las partes se pasan del total, tampoco deja registrar', () => {
  const partes = [parte({ id: 'a', monto: 50000 }), parte({ id: 'b', monto: 30000 })];
  const r = validarPartes(partes, 65000);
  assert.equal(r.ok, false);
  assert.match(r.motivo || '', /Sobran/);
});

test('los centavos no generan un falso error de descuadre', () => {
  // 0.1 + 0.2 !== 0.3 en punto flotante: sin tolerancia esto daba error.
  const partes = [
    parte({ id: 'a', monto: 0.1 }),
    parte({ id: 'b', monto: 0.2 })
  ];
  assert.equal(validarPartes(partes, 0.3).ok, true);
});

test('una parte en cero o negativa no se acepta', () => {
  assert.equal(validarPartes([parte({ monto: 0 })], 0).ok, false);
  assert.equal(validarPartes([parte({ id: 'a', monto: 65000 }), parte({ id: 'b', monto: -5000 })], 60000).ok, false);
});

test('sin ninguna parte cargada no se puede registrar', () => {
  const r = validarPartes([], 65000);
  assert.equal(r.ok, false);
  assert.match(r.motivo || '', /al menos un medio/i);
});

test('tolera partes null sin explotar', () => {
  assert.equal(validarPartes(null as any, 1000).ok, false);
  assert.equal(restoSinAsignar(null as any, 1000), 1000);
});

test('restoSinAsignar calcula lo que falta para completar el total', () => {
  const partes = [parte({ monto: 32500 })];
  assert.equal(restoSinAsignar(partes, 65000), 32500);
});

test('restoSinAsignar nunca devuelve negativo', () => {
  const partes = [parte({ monto: 99999 })];
  assert.equal(restoSinAsignar(partes, 65000), 0);
});

// --- Conversión a filas de pago ---

test('cada medio se guarda como una fila de pago aparte', () => {
  const partes = [
    parte({ id: 'a', medio: 'EFECTIVO', destino: 'EFECTIVO', monto: 32500 }),
    parte({ id: 'b', medio: 'TRANSFERENCIA', destino: 'RULO', monto: 32500 })
  ];
  const filas = partesAPagos<any>(partes, {
    cliente_id: 'c1',
    mes_correspondiente: '2026-09',
    registrado_por: 'admin@kaha.com'
  });

  assert.equal(filas.length, 2);
  assert.equal(filas[0].medio_pago, 'EFECTIVO');
  assert.equal(filas[0].destino_transferencia, 'EFECTIVO');
  assert.equal(filas[0].monto, 32500);
  assert.equal(filas[1].medio_pago, 'TRANSFERENCIA');
  assert.equal(filas[1].destino_transferencia, 'RULO');
  // Los datos comunes viajan en todas las filas.
  assert.ok(filas.every((f: any) => f.cliente_id === 'c1' && f.mes_correspondiente === '2026-09'));
});

test('la suma de las filas generadas es exactamente lo cobrado', () => {
  const partes = [
    parte({ id: 'a', medio: 'EFECTIVO', destino: 'EFECTIVO', monto: 20000 }),
    parte({ id: 'b', medio: 'TRANSFERENCIA', destino: 'JUANCHI', monto: 25000 }),
    parte({ id: 'c', medio: 'MERCADO_PAGO', destino: 'RULO', monto: 20000 })
  ];
  const filas = partesAPagos<any>(partes, { cliente_id: 'c1' });
  const suma = filas.reduce((a: number, f: any) => a + f.monto, 0);
  assert.equal(suma, 65000);
});

// --- Reparto de medios sobre los cobros ---

test('EL CASO DE JUANCHI: una cuota, mitad efectivo mitad transferencia, dos filas', () => {
  const cobros = [{ cliente_id: 'ana', mes_correspondiente: '2026-09', monto: 65000 }];
  const partes = [
    parte({ id: 'a', medio: 'EFECTIVO', destino: 'EFECTIVO', monto: 32500 }),
    parte({ id: 'b', medio: 'TRANSFERENCIA', destino: 'RULO', monto: 32500 })
  ];

  const filas = asignarPartesACobros(cobros, partes);
  assert.equal(filas.length, 2);
  assert.ok(filas.every(f => f.cliente_id === 'ana' && f.mes_correspondiente === '2026-09'));
  assert.deepEqual(filas.map(f => f.medio_pago), ['EFECTIVO', 'TRANSFERENCIA']);
  assert.equal(filas.reduce((a, f) => a + f.monto, 0), 65000);
});

test('un solo medio deja una fila por cobro, igual que antes', () => {
  const cobros = [
    { cliente_id: 'ana', mes_correspondiente: '2026-09', monto: 65000 },
    { cliente_id: 'ana', mes_correspondiente: '2026-10', monto: 65000 }
  ];
  const partes = [parte({ medio: 'TRANSFERENCIA', destino: 'RULO', monto: 130000 })];

  const filas = asignarPartesACobros(cobros, partes);
  assert.equal(filas.length, 2);
  assert.deepEqual(filas.map(f => f.mes_correspondiente), ['2026-09', '2026-10']);
});

test('dos socios y dos medios: cada fila queda con su socio y su medio reales', () => {
  const cobros = [
    { cliente_id: 'ana', mes_correspondiente: '2026-09', monto: 65000 },
    { cliente_id: 'luis', mes_correspondiente: '2026-09', monto: 85000 }
  ];
  const partes = [
    parte({ id: 'a', medio: 'EFECTIVO', destino: 'EFECTIVO', monto: 100000 }),
    parte({ id: 'b', medio: 'TRANSFERENCIA', destino: 'JUANCHI', monto: 50000 })
  ];

  const filas = asignarPartesACobros(cobros, partes);
  assert.equal(filas.reduce((a, f) => a + f.monto, 0), 150000);

  const deAna = filas.filter(f => f.cliente_id === 'ana');
  const deLuis = filas.filter(f => f.cliente_id === 'luis');
  assert.equal(deAna.reduce((a, f) => a + f.monto, 0), 65000);
  assert.equal(deLuis.reduce((a, f) => a + f.monto, 0), 85000);
  // A Luis le toca el resto del efectivo (35000) y después la transferencia.
  assert.deepEqual(deLuis.map(f => f.medio_pago), ['EFECTIVO', 'TRANSFERENCIA']);
});

test('INVARIANTE: lo repartido siempre suma lo cobrado', () => {
  const cobros = [
    { cliente_id: 'a', mes_correspondiente: '2026-09', monto: 33333.33 },
    { cliente_id: 'b', mes_correspondiente: '2026-09', monto: 66666.67 }
  ];
  const partes = [
    parte({ id: 'x', medio: 'EFECTIVO', destino: 'EFECTIVO', monto: 50000 }),
    parte({ id: 'y', medio: 'MERCADO_PAGO', destino: 'RULO', monto: 50000 })
  ];
  const filas = asignarPartesACobros(cobros, partes);
  const suma = Number(filas.reduce((a, f) => a + f.monto, 0).toFixed(2));
  assert.equal(suma, 100000);
});

test('no genera filas en cero', () => {
  const cobros = [{ cliente_id: 'a', mes_correspondiente: '2026-09', monto: 65000 }];
  const partes = [
    parte({ id: 'x', medio: 'EFECTIVO', destino: 'EFECTIVO', monto: 65000 }),
    parte({ id: 'y', medio: 'TRANSFERENCIA', destino: 'RULO', monto: 0 })
  ];
  const filas = asignarPartesACobros(cobros, partes);
  assert.equal(filas.length, 1);
  assert.ok(filas.every(f => f.monto > 0));
});

test('tolera listas vacías', () => {
  assert.deepEqual(asignarPartesACobros([], []), []);
  assert.deepEqual(asignarPartesACobros(null as any, null as any), []);
});

test('REGRESION: repartir sin que cierre falla fuerte, no calladamente', () => {
  // Antes devolvía filas por el monto equivocado y el descuadre entraba a la
  // base sin aviso. El formulario valida antes, pero eso es una promesa del
  // llamador: con plata el módulo se defiende solo.
  const cobros = [{ cliente_id: 'ana', mes_correspondiente: '2026-09', monto: 65000 }];

  assert.throws(
    () => asignarPartesACobros(cobros, [parte({ monto: 52500 })]),
    /no cierra/i,
    'faltando plata'
  );
  assert.throws(
    () => asignarPartesACobros(cobros, [parte({ monto: 80000 })]),
    /no cierra/i,
    'sobrando plata'
  );
});

test('el caso que cierra sigue funcionando igual', () => {
  const cobros = [{ cliente_id: 'ana', mes_correspondiente: '2026-09', monto: 65000 }];
  const filas = asignarPartesACobros(cobros, [
    parte({ id: 'a', medio: 'EFECTIVO', destino: 'EFECTIVO', monto: 32500 }),
    parte({ id: 'b', monto: 32500 })
  ]);
  assert.equal(filas.reduce((a, f) => a + f.monto, 0), 65000);
});
