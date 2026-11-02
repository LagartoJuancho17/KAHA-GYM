// src/lib/reporteCierreMes.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  obtenerMesCerrado,
  nombreMesCerrado,
  obtenerSociosDeudaPerdonada,
  obtenerSociosPausados,
  obtenerSociosSinPagarConTurnos,
  generarReporteCierreMesTexto,
  generarReporteCierreMesHtml
} from './reporteCierreMes';
import { Cliente, Plan, AuditLog } from '../types';

describe('Reporte de Cierre de Mes a Administradores', () => {
  it('obtenerMesCerrado devuelve el mes anterior correctamente', () => {
    // Si la fecha es 2 de noviembre de 2026, el mes cerrado es octubre (2026-10)
    const fechaNov = new Date('2026-11-02T10:00:00Z');
    assert.equal(obtenerMesCerrado(fechaNov), '2026-10');

    // Si la fecha es enero de 2027, el mes cerrado es diciembre de 2026
    const fechaEne = new Date('2027-01-05T10:00:00Z');
    assert.equal(obtenerMesCerrado(fechaEne), '2026-12');
  });

  it('nombreMesCerrado formatea el mes en español', () => {
    const nombre = nombreMesCerrado('2026-10');
    assert.match(nombre.toLowerCase(), /octubre/);
    assert.match(nombre, /2026/);
  });

  it('obtenerSociosDeudaPerdonada extrae perdonados y becados del mes indicado', () => {
    const logs: AuditLog[] = [
      {
        id: 'log-1',
        usuario_id: 'u1',
        usuario_email: 'admin@kaha.fit',
        accion: 'DEUDA_PERDONADA',
        creado_at: '2026-10-23T10:00:00Z',
        detalles: {
          cliente_id: 'c1',
          cliente_nombre: 'Emanuel Sansoni',
          monto_perdonado: 65000,
          mes: '2026-10'
        }
      },
      {
        id: 'log-2',
        usuario_id: 'u1',
        usuario_email: 'admin@kaha.fit',
        accion: 'DEUDA_PERDONADA_BECADO',
        creado_at: '2026-10-19T10:00:00Z',
        detalles: {
          cliente_id: 'c2',
          cliente_nombre: 'Mel Galeano',
          monto_perdonado: 135000,
          mes: '2026-10'
        }
      },
      {
        id: 'log-3',
        usuario_id: 'u1',
        usuario_email: 'admin@kaha.fit',
        accion: 'DEUDA_PERDONADA',
        creado_at: '2026-11-02T10:00:00Z',
        detalles: {
          cliente_id: 'c3',
          cliente_nombre: 'Micaela Berardo',
          monto_perdonado: 135000,
          mes: '2026-11'
        }
      }
    ];

    const perdonadosOct = obtenerSociosDeudaPerdonada(logs, '2026-10');
    assert.equal(perdonadosOct.length, 2);
    assert.equal(perdonadosOct[0].nombre, 'Emanuel Sansoni');
    assert.equal(perdonadosOct[0].tipo, 'EXENCION');
    assert.equal(perdonadosOct[1].nombre, 'Mel Galeano');
    assert.equal(perdonadosOct[1].tipo, 'BECADO');
  });

  it('obtenerSociosPausados identifica socios en pausa de ese mes', () => {
    const clientes: Cliente[] = [
      {
        id: 'c1',
        nombre: 'Juana',
        apellido: 'Otero',
        email: 'juana@example.com',
        activo: true,
        exencion_cobro: 'SUSPENDIDO',
        nota_plan_personalizado: 'PAUSA:2026-10',
        turnos_fijos: ['LUNES-09:30', 'VIERNES-09:30']
      } as Cliente,
      {
        id: 'c2',
        nombre: 'Mariela',
        apellido: 'Rabelino',
        email: 'mariela@example.com',
        activo: true,
        exencion_cobro: 'SUSPENDIDO',
        nota_plan_personalizado: 'PAUSA:2026-11',
        turnos_fijos: []
      } as Cliente,
      {
        id: 'c3',
        nombre: 'Ciro',
        apellido: 'Santangelo',
        email: 'ciro@example.com',
        activo: true,
        exencion_cobro: 'NINGUNA',
        turnos_fijos: ['LUNES-20:00']
      } as Cliente
    ];

    const pausadosOct = obtenerSociosPausados(clientes, '2026-10');
    assert.equal(pausadosOct.length, 1);
    assert.equal(pausadosOct[0].nombre, 'Juana Otero');
  });

  it('obtenerSociosSinPagarConTurnos detecta socios que vinieron sin pagar y excluye pausados/invitados', () => {
    const planes: Plan[] = [
      { id: 'p2', nombre: 'Plan 2 Días', precio: 65000, dias_por_semana: 2, creado_at: '2026-01-01' },
      { id: 'p3', nombre: 'Plan 3 Días', precio: 85000, dias_por_semana: 3, creado_at: '2026-01-01' }
    ];

    const clientes: Cliente[] = [
      {
        id: 'c-ciro',
        nombre: 'Ciro',
        apellido: 'Santangelo',
        email: 'ciro@example.com',
        activo: true,
        plan_id: 'p2',
        ultimo_mes_pagado: '2026-09',
        turnos_fijos: ['LUNES-20:00', 'MIERCOLES-20:00']
      } as Cliente,
      {
        id: 'c-flor',
        nombre: 'Florencia',
        apellido: 'Burgos',
        email: 'flor@example.com',
        activo: true,
        plan_id: 'p3',
        ultimo_mes_pagado: '2026-09',
        exencion_cobro: 'POSTERGADO',
        turnos_fijos: ['MIERCOLES-08:30', 'VIERNES-08:30']
      } as Cliente,
      {
        id: 'c-al-dia',
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@example.com',
        activo: true,
        plan_id: 'p2',
        ultimo_mes_pagado: '2026-10',
        turnos_fijos: ['MARTES-10:00']
      } as Cliente,
      {
        id: 'c-pausado',
        nombre: 'Lucía',
        apellido: 'Sartori',
        email: 'lucia@example.com',
        activo: true,
        plan_id: 'p2',
        ultimo_mes_pagado: '2026-09',
        exencion_cobro: 'SUSPENDIDO',
        nota_plan_personalizado: 'PAUSA:2026-10',
        turnos_fijos: ['MARTES-19:00']
      } as Cliente,
      {
        id: 'c-invitado',
        nombre: 'Beti',
        apellido: '(Invitado)',
        email: 'beti@example.com',
        activo: true,
        plan_id: 'p2',
        ultimo_mes_pagado: '2026-09',
        turnos_fijos: ['LUNES-10:00']
      } as Cliente
    ];

    const sinPagar = obtenerSociosSinPagarConTurnos(clientes, '2026-10', planes);
    assert.equal(sinPagar.length, 2);
    assert.equal(sinPagar[0].nombre, 'Ciro Santangelo');
    assert.equal(sinPagar[0].cuota, 65000);
    assert.equal(sinPagar[1].nombre, 'Florencia Burgos');
    assert.equal(sinPagar[1].cuota, 85000);
  });

  it('generarReporteCierreMesTexto y Html producen los datos consolidados', () => {
    const texto = generarReporteCierreMesTexto({
      mesCerrado: '2026-10',
      deudasPerdonadas: [{ id: '1', nombre: 'Franco Agüero', monto: 85000, tipo: 'EXENCION' }],
      sociosPausados: [{ id: '2', nombre: 'Juana Otero', email: 'j@kaha.com', telefono: '112233', mesPausa: '2026-10', turnosFijos: ['LUNES-09:30'] }],
      sociosSinPagar: [{ id: '3', nombre: 'Ciro Santangelo', email: 'c@kaha.com', telefono: '', planNombre: 'Plan 2 Días', cuota: 65000, ultimoMesPagado: '2026-09', turnosFijos: ['LUNES-20:00'] }]
    });

    assert.match(texto, /Franco Agüero/);
    assert.match(texto, /Juana Otero/);
    assert.match(texto, /Ciro Santangelo/);
    assert.match(texto, /RESUMEN GENERAL/);

    const html = generarReporteCierreMesHtml({
      mesCerrado: '2026-10',
      deudasPerdonadas: [{ id: '1', nombre: 'Franco Agüero', monto: 85000, tipo: 'EXENCION' }],
      sociosPausados: [{ id: '2', nombre: 'Juana Otero', email: 'j@kaha.com', telefono: '112233', mesPausa: '2026-10', turnosFijos: ['LUNES-09:30'] }],
      sociosSinPagar: [{ id: '3', nombre: 'Ciro Santangelo', email: 'c@kaha.com', telefono: '', planNombre: 'Plan 2 Días', cuota: 65000, ultimoMesPagado: '2026-09', turnosFijos: ['LUNES-20:00'] }]
    });

    assert.match(html, /Franco Agüero/);
    assert.match(html, /Juana Otero/);
    assert.match(html, /Ciro Santangelo/);
    assert.match(html, /KAHA GYM/);
  });
});
