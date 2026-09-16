// src/lib/balanceFinanciero.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  calcularCompensacionSocios, 
  calcularBalanceMes, 
  generarMensajeWhatsAppBalance 
} from './balanceFinanciero';
import { Pago, Gasto, Cliente, Plan, Profesor, Turno, NovedadProfesor } from '../types';

test('Compensación Socios: Juanchi tiene saldo mayor a Rulo -> Juanchi transfiere la mitad de la diferencia', () => {
  // Juanchi: $600.000 neto, Rulo: $200.000 neto. Total = $800.000. Mitad = $400.000 c/u.
  // Juanchi debe transferir $200.000 a Rulo para quedar 50/50.
  const comp = calcularCompensacionSocios(600000, 200000, 50000, { incluirEfectivo: false });
  assert.equal(comp.debeTransferir, 'JUANCHI');
  assert.equal(comp.montoTransferencia, 200000);
  assert.equal(comp.cuotaEquitativa, 400000);
  assert.match(comp.mensaje, /Juanchi debe transferir \$200\.000 a Rulo/);
});

test('Compensación Socios: Rulo tiene saldo mayor a Juanchi -> Rulo transfiere la diferencia correspondiente', () => {
  // Juanchi: $100.000 neto, Rulo: $500.000 neto. Total = $600.000. Mitad = $300.000 c/u.
  // Rulo debe transferir $200.000 a Juanchi.
  const comp = calcularCompensacionSocios(100000, 500000, 0, { incluirEfectivo: false });
  assert.equal(comp.debeTransferir, 'RULO');
  assert.equal(comp.montoTransferencia, 200000);
  assert.equal(comp.cuotaEquitativa, 300000);
  assert.match(comp.mensaje, /Rulo debe transferir \$200\.000 a Juanchi/);
});

test('Compensación Socios: Cuentas exactamente equilibradas', () => {
  const comp = calcularCompensacionSocios(350000, 350000, 20000);
  assert.equal(comp.debeTransferir, 'NINGUNO');
  assert.equal(comp.montoTransferencia, 0);
  assert.equal(comp.cuotaEquitativa, 350000);
  assert.match(comp.mensaje, /Cuentas perfectamente equilibradas/);
});

test('Compensación Socios: Incluyendo efectivo de caja en la base divisible', () => {
  // Juanchi: $300.000, Rulo: $100.000, Efectivo: $200.000.
  // Base total = $600.000. Mitad = $300.000 c/u.
  // Juanchi ya tiene $300.000. Rulo tiene $100.000. El efectivo cubre $200.000 para Rulo.
  // Con base total = $600.000, cuota = $300.000. Juanchi tiene $300.000 -> diferencia = 0.
  const comp = calcularCompensacionSocios(300000, 100000, 200000, { incluirEfectivo: true });
  assert.equal(comp.baseTotal, 600000);
  assert.equal(comp.cuotaEquitativa, 300000);
  assert.equal(comp.debeTransferir, 'NINGUNO');
});

test('Balance Mensual: Cálculo integrado de ingresos, egresos y saldos por caja', () => {
  const pagos: Pago[] = [
    {
      id: 'p1',
      cliente_id: 'c1',
      cliente_nombre_completo: 'Socio 1',
      monto: 30000,
      mes_correspondiente: '2026-09',
      fecha_pago: '2026-09-02',
      medio_pago: 'TRANSFERENCIA',
      destino_transferencia: 'JUANCHI',
      registrado_por: 'admin'
    },
    {
      id: 'p2',
      cliente_id: 'c2',
      cliente_nombre_completo: 'Socio 2',
      monto: 25000,
      mes_correspondiente: '2026-09',
      fecha_pago: '2026-09-05',
      medio_pago: 'TRANSFERENCIA',
      destino_transferencia: 'RULO',
      registrado_por: 'admin'
    },
    {
      id: 'p3',
      cliente_id: 'c3',
      cliente_nombre_completo: 'Socio 3',
      monto: 20000,
      mes_correspondiente: '2026-09',
      fecha_pago: '2026-09-08',
      medio_pago: 'EFECTIVO',
      destino_transferencia: 'EFECTIVO',
      registrado_por: 'admin'
    },
    {
      id: 'p4',
      cliente_id: 'c4',
      cliente_nombre_completo: 'Socio Agosto',
      monto: 30000,
      mes_correspondiente: '2026-08', // Otro mes
      fecha_pago: '2026-08-10',
      medio_pago: 'TRANSFERENCIA',
      destino_transferencia: 'JUANCHI',
      registrado_por: 'admin'
    }
  ] as unknown as Pago[];

  const gastos: Gasto[] = [
    {
      id: 'g1',
      concepto: 'Luz',
      monto: 10000,
      categoria: 'SERVICIOS',
      efectuado_por: 'JUANCHI_TRANSFERENCIA',
      fecha: '2026-09-10',
      registrado_por: 'admin'
    },
    {
      id: 'g2',
      concepto: 'Insumos limpieza',
      monto: 5000,
      categoria: 'INSUMOS',
      efectuado_por: 'RULO_TRANSFERENCIA',
      fecha: '2026-09-12',
      registrado_por: 'admin'
    }
  ] as unknown as Gasto[];

  const clientes: Cliente[] = [
    { id: 'c1', nombre: 'Socio 1', apellido: 'Pérez', email: 'c1@test.com', activo: true, estado: 'ACTIVO', turnos_fijos: [], plan_id: 'p1' },
    { id: 'c2', nombre: 'Socio 2', apellido: 'Gómez', email: 'c2@test.com', activo: true, estado: 'ACTIVO', turnos_fijos: [], plan_id: 'p1' },
    { id: 'c3', nombre: 'Socio 3', apellido: 'López', email: 'c3@test.com', activo: true, estado: 'ACTIVO', turnos_fijos: [], plan_id: 'p1' },
    { id: 'c_deudor', nombre: 'Socio Deudor', apellido: 'Díaz', email: 'cd@test.com', activo: true, estado: 'MOROSO', deuda_acumulada: 30000, turnos_fijos: [], plan_id: 'p1' }
  ] as unknown as Cliente[];

  const planes: Plan[] = [
    { id: 'p1', nombre: 'Pase Libre', precio: 30000, dias_por_semana: 5 }
  ] as unknown as Plan[];

  const balance = calcularBalanceMes({
    mes: '2026-09',
    pagos,
    gastos,
    clientes,
    planes,
    profesores: [],
    turnos: [],
    novedadesProfesores: []
  });

  // Verificaciones de Ingresos
  assert.equal(balance.totalIngresos, 75000); // 30k + 25k + 20k
  assert.equal(balance.pagosCount, 3);
  assert.equal(balance.ticketPromedio, 25000);

  // Verificaciones de Egresos
  assert.equal(balance.totalEgresos, 15000); // 10k + 5k
  assert.equal(balance.gastosCount, 2);

  // Verificaciones de Cajas
  // Juanchi: 30.000 ingresos - 10.000 egresos = 20.000
  assert.equal(balance.cajaJuanchi.ingresos, 30000);
  assert.equal(balance.cajaJuanchi.egresos, 10000);
  assert.equal(balance.cajaJuanchi.saldoNeto, 20000);

  // Rulo: 25.000 ingresos - 5.000 egresos = 20.000
  assert.equal(balance.cajaRulo.ingresos, 25000);
  assert.equal(balance.cajaRulo.egresos, 5000);
  assert.equal(balance.cajaRulo.saldoNeto, 20000);

  // Efectivo: 20.000 ingresos - 0 egresos = 20.000
  assert.equal(balance.cajaEfectivo.saldoNeto, 20000);

  // Compensación entre socios (ambos tienen 20k neto)
  assert.equal(balance.compensacion.debeTransferir, 'NINGUNO');

  // Ganancia real = 75.000 - 15.000 = 60.000 (80% margen)
  assert.equal(balance.gananciaReal, 60000);
  assert.equal(balance.margenRealPorcentaje, 80);

  // Deuda pendiente de cobro: c_deudor debe 30.000
  assert.equal(balance.deudaPendienteCobro, 30000);
  assert.equal(balance.sociosDeudoresCount, 1);

  // Ganancia proyectada = (75.000 + 30.000) - 15.000 = 90.000
  assert.equal(balance.gananciaProyectada, 90000);

  // Estructura de costos
  assert.equal(balance.estructuraCostos.length, 2);
  assert.equal(balance.estructuraCostos[0].categoria, 'SERVICIOS');
  assert.equal(balance.estructuraCostos[0].monto, 10000);
});

test('Formateo WhatsApp de Balance: Genera texto con formato esperado', () => {
  const comp = calcularCompensacionSocios(400000, 200000, 50000);
  const balanceMock = {
    mes: '2026-09',
    totalIngresos: 650000,
    pagosCount: 25,
    ticketPromedio: 26000,
    totalEgresos: 150000,
    gastosCount: 6,
    cajaJuanchi: { ingresos: 450000, egresos: 50000, saldoNeto: 400000 },
    cajaRulo: { ingresos: 250000, egresos: 50000, saldoNeto: 200000 },
    cajaEfectivo: { ingresos: 80000, egresos: 30000, saldoNeto: 50000 },
    compensacion: comp,
    gananciaReal: 500000,
    margenRealPorcentaje: 77,
    deudaPendienteCobro: 75000,
    sociosDeudoresCount: 3,
    liquidacionesPendientes: 120000,
    gananciaProyectada: 455000,
    porcentajeCobrado: 90,
    puntoEquilibrioMonto: 150000,
    puntoEquilibrioSocios: 6,
    estructuraCostos: []
  };

  const texto = generarMensajeWhatsAppBalance(balanceMock, 'Septiembre 2026');
  assert.match(texto, /BALANCE FINANCIERO/);
  assert.match(texto, /Septiembre 2026/);
  assert.match(texto, /Juanchi debe transferir \$100\.000 a Rulo/);
  assert.match(texto, /GANANCIA NETA REAL/);
});

test('REGRESION: una cuota partida en dos medios cuenta como UNA cuota, no dos', () => {
  // Desde que se puede cobrar mitad efectivo y mitad transferencia, esa cuota
  // son dos filas de pago. Contar filas inflaba las cuotas del mes y partía al
  // medio el ticket promedio, que alimenta el punto de equilibrio y el WhatsApp.
  const pagoBase = {
    cliente_nombre_completo: 'Probador Uno',
    fecha_pago: '2026-09-16',
    mes_correspondiente: '2026-09',
    registrado_por: 'admin@kaha.com',
    creado_at: '2026-09-16T12:00:00.000Z'
  };

  const partida: any[] = [
    { ...pagoBase, id: 'p1', cliente_id: 'socio-a', monto: 32500, medio_pago: 'EFECTIVO', destino_transferencia: 'EFECTIVO' },
    { ...pagoBase, id: 'p2', cliente_id: 'socio-a', monto: 32500, medio_pago: 'TRANSFERENCIA', destino_transferencia: 'RULO' }
  ];

  const balance = calcularBalanceMes({
    mes: '2026-09',
    pagos: partida as Pago[],
    gastos: [],
    clientes: [],
    planes: [],
    profesores: [],
    turnos: [],
    novedadesProfesores: []
  });

  assert.equal(balance.totalIngresos, 65000, 'la plata total no cambia');
  assert.equal(balance.pagosCount, 1, 'es UNA cuota, aunque sean dos filas');
  assert.equal(balance.ticketPromedio, 65000, 'el ticket es la cuota entera');
});

test('dos socios distintos en el mismo mes siguen contando como dos cuotas', () => {
  const pagoBase = {
    cliente_nombre_completo: 'x',
    fecha_pago: '2026-09-16',
    mes_correspondiente: '2026-09',
    registrado_por: 'admin@kaha.com',
    creado_at: '2026-09-16T12:00:00.000Z',
    medio_pago: 'TRANSFERENCIA' as const,
    destino_transferencia: 'RULO'
  };
  const pagos: any[] = [
    { ...pagoBase, id: 'a', cliente_id: 'socio-a', monto: 65000 },
    { ...pagoBase, id: 'b', cliente_id: 'socio-b', monto: 65000 }
  ];

  const balance = calcularBalanceMes({
    mes: '2026-09', pagos: pagos as Pago[], gastos: [], clientes: [], planes: [],
    profesores: [], turnos: [], novedadesProfesores: []
  });
  assert.equal(balance.pagosCount, 2);
  assert.equal(balance.ticketPromedio, 65000);
});
