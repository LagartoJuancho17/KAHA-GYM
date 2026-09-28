import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatearMonedaAFIP,
  obtenerRangoMesAFIP,
  determinarDescripcionItem,
  generarFilasFacturacionRulo,
  generarCSVFacturacionRulo
} from './facturacionRulo';
import { Pago, Cliente, Plan } from '../types';

test('formatearMonedaAFIP formatea correctamente con espacio y decimales', () => {
  const res = formatearMonedaAFIP(65000);
  assert.equal(res.trim(), '$  65.000,00');
});

test('obtenerRangoMesAFIP calcula primer y último día del mes en formato DD/MM/YY', () => {
  const sep = obtenerRangoMesAFIP('2026-09');
  assert.equal(sep.desde, '01/09/26');
  assert.equal(sep.hasta, '30/09/26');

  const feb = obtenerRangoMesAFIP('2026-02');
  assert.equal(feb.desde, '01/02/26');
  assert.equal(feb.hasta, '28/02/26');
});

test('determinarDescripcionItem detecta planes y externos', () => {
  const pagoExterno: Pago = {
    id: '1',
    monto: 50000,
    fecha_pago: '2026-09-10',
    es_externo: true,
    concepto: 'Alquiler masajes'
  } as any;
  assert.equal(determinarDescripcionItem(pagoExterno), 'Alquiler masajes');

  const pagoSocio: Pago = {
    id: '2',
    monto: 65000,
    fecha_pago: '2026-09-10',
    es_externo: false
  } as any;
  const plan: Plan = {
    id: 'p1',
    nombre: 'Pase 3 días',
    dias_por_semana: 3
  } as any;
  assert.equal(determinarDescripcionItem(pagoSocio, undefined, plan), '3 veces por semana');
});

test('generarFilasFacturacionRulo filtra pagos a Rulo y mapea 12 columnas', () => {
  const pagos: Pago[] = [
    {
      id: '1',
      monto: 65000,
      fecha_pago: '2026-09-04',
      mes_correspondiente: '2026-09',
      destino_transferencia: 'RULO',
      medio_pago: 'TRANSFERENCIA',
      cliente_id: 'c1'
    } as any,
    {
      id: '2',
      monto: 85000,
      fecha_pago: '2026-09-07',
      mes_correspondiente: '2026-09',
      destino_transferencia: 'JUANCHI', // NO Rulo
      medio_pago: 'TRANSFERENCIA',
      cliente_id: 'c2'
    } as any,
    {
      id: '3',
      monto: 70000,
      fecha_pago: '2026-08-15', // Mes anterior
      mes_correspondiente: '2026-08',
      destino_transferencia: 'RULO',
      medio_pago: 'TRANSFERENCIA',
      cliente_id: 'c1'
    } as any
  ];

  const clientes: Cliente[] = [
    { id: 'c1', nombre: 'Juan', apellido: 'Perez', email: 'juan@test.com', plan_id: 'pl1' } as any
  ];

  const planes: Plan[] = [
    { id: 'pl1', nombre: 'Plan 2x', dias_por_semana: 2 } as any
  ];

  const { filas, cantidadPagos, totalMonto } = generarFilasFacturacionRulo({
    mes: '2026-09',
    pagos,
    clientes,
    planes
  });

  assert.equal(cantidadPagos, 1);
  assert.equal(totalMonto, 65000);
  assert.equal(filas[0].length, 12);
  assert.equal(filas[0][0], '04/09/26');
  assert.equal(filas[0][1], '2 veces por semana');
  assert.equal(filas[0][5], 'SERVICIO');
  assert.equal(filas[0][6], '01/09/26');
  assert.equal(filas[0][7], '30/09/26');
  assert.equal(filas[0][8], 'TRANSFERENCIA');
  assert.equal(filas[0][9], 'CONSUMIDOR FINAL');
  assert.equal(filas[0][11], 'juan@test.com');

  const csv = generarCSVFacturacionRulo(filas);
  assert.ok(csv.includes('Fecha Comprobante,Producto / Servicio'));
  assert.ok(csv.includes('juan@test.com'));
});
