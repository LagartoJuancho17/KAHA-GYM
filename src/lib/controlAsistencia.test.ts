// src/lib/controlAsistencia.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  horaAMinutos,
  detectarTurnoActual,
  generarClaveAsistencia,
  obtenerAlumnosConvocados,
  calcularMetricasAsistencia,
  guardarRegistroAsistencia,
  obtenerRegistroAsistencia,
  obtenerTurnosConAsistenciaDelDia,
  eliminarRegistroAsistencia,
  calcularMetricasHistoricas
} from './controlAsistencia';
import { Cliente, RecuperoTurno, Turno, Plan } from '../types';

describe('Control de Asistencia y Presentes', () => {
  it('horaAMinutos convierte formato HH:MM a minutos correctamente', () => {
    assert.equal(horaAMinutos('00:00'), 0);
    assert.equal(horaAMinutos('07:30'), 450);
    assert.equal(horaAMinutos('13:38'), 818);
    assert.equal(horaAMinutos('20:00'), 1200);
  });

  it('detectarTurnoActual detecta la clase en curso en la ventana de tiempo', () => {
    const turnos: Turno[] = [
      { id: 'LUNES-08:30', dia: 'LUNES', hora: '08:30', cupo_maximo: 7, asignados_ids: [], lista_espera_ids: [] },
      { id: 'LUNES-09:30', dia: 'LUNES', hora: '09:30', cupo_maximo: 7, asignados_ids: [], lista_espera_ids: [] },
      { id: 'LUNES-20:00', dia: 'LUNES', hora: '20:00', cupo_maximo: 7, asignados_ids: [], lista_espera_ids: [] },
      { id: 'LUNES-21:00', dia: 'LUNES', hora: '21:00', cupo_maximo: 8, asignados_ids: [], lista_espera_ids: [] }
    ];

    // Si son las 08:35, la clase de 08:30 está en curso
    const turnoActual = detectarTurnoActual(turnos, '08:35');
    assert.equal(turnoActual?.id, 'LUNES-08:30');

    // Si son las 09:20 (10 min antes de las 09:30), ya entra en la ventana previa de las 09:30
    const turnoPrevio = detectarTurnoActual(turnos, '09:20');
    assert.equal(turnoPrevio?.id, 'LUNES-09:30');

    // Si son las 14:00 (en el medio del día), busca la próxima clase futura (20:00)
    const turnoTarde = detectarTurnoActual(turnos, '14:00');
    assert.equal(turnoTarde?.id, 'LUNES-20:00');

    // Si son las 22:30 (ya pasaron todas), devuelve la última de hoy (21:00)
    const turnoFin = detectarTurnoActual(turnos, '22:30');
    assert.equal(turnoFin?.id, 'LUNES-21:00');
  });

  it('generarClaveAsistencia formatea la clave compuesta', () => {
    const clave = generarClaveAsistencia('2026-11-02', 'LUNES-20:00');
    assert.equal(clave, '2026-11-02_LUNES-20:00');
  });

  it('obtenerAlumnosConvocados incluye fijos (no suspendidos), variables y recuperos', () => {
    const planes: Plan[] = [
      { id: 'p2', nombre: 'Plan 2 Días Semana', precio: 70000, dias_por_semana: 2, creado_at: '2026-01-01' },
      { id: 'p3', nombre: 'Plan 3 Días Semana', precio: 90000, dias_por_semana: 3, creado_at: '2026-01-01' }
    ];

    const turno: Turno = {
      id: 'LUNES-20:00',
      dia: 'LUNES',
      hora: '20:00',
      cupo_maximo: 7,
      asignados_ids: ['c-ciro', 'c-suspendido'],
      lista_espera_ids: []
    };

    const clientes: Cliente[] = [
      {
        id: 'c-ciro',
        nombre: 'Ciro',
        apellido: 'Santangelo',
        email: 'ciro@kaha.fit',
        telefono: '112233',
        activo: true,
        plan_id: 'p2',
        ultimo_mes_pagado: '2026-09',
        deuda_acumulada: 0,
        turnos_fijos: ['LUNES-20:00']
      } as Cliente,
      {
        id: 'c-suspendido',
        nombre: 'Lucas',
        apellido: 'Falta',
        email: 'falta@kaha.fit',
        telefono: '',
        activo: true,
        plan_id: 'p2',
        ultimo_mes_pagado: '2026-10',
        turnos_fijos: ['LUNES-20:00'],
        clases_suspendidas: [
          { turno_id: 'LUNES-20:00', fecha: '2026-11-02' }
        ]
      } as Cliente,
      {
        id: 'c-variable',
        nombre: 'María',
        apellido: 'Pérez',
        email: 'maria@kaha.fit',
        telefono: '',
        activo: true,
        plan_id: 'p3',
        ultimo_mes_pagado: '2026-11',
        deuda_acumulada: 0,
        reservas_individuales: [
          { turno_id: 'LUNES-20:00', fecha: '2026-11-02' }
        ]
      } as Cliente,
      {
        id: 'c-recupero',
        nombre: 'Juan',
        apellido: 'Gómez',
        email: 'juan@kaha.fit',
        telefono: '',
        activo: true,
        plan_id: 'p2',
        ultimo_mes_pagado: '2026-11'
      } as Cliente
    ];

    const recuperos: RecuperoTurno[] = [
      {
        id: 'rec-1',
        cliente_id: 'c-recupero',
        cliente_nombre: 'Juan Gómez',
        turno_original_id: 'MIERCOLES-20:00',
        fecha_inasistencia: '2026-10-28',
        turno_recupero_id: 'LUNES-20:00',
        fecha_recupero: '2026-11-02',
        estado: 'PENDIENTE',
        fecha_limite: '2026-11-28'
      }
    ];

    const convocados = obtenerAlumnosConvocados({
      turno,
      fecha: '2026-11-02',
      clientes,
      recuperos,
      planes,
      mesActual: '2026-11'
    });

    // Lucas Falta está suspendido para esa fecha, no debe aparecer.
    assert.equal(convocados.length, 3);

    const ciro = convocados.find(a => a.clienteId === 'c-ciro');
    assert.ok(ciro);
    assert.equal(ciro.tipoInscripcion, 'FIJO');
    assert.equal(ciro.alDia, false); // No pagó noviembre ni octubre
    assert.equal(ciro.debeMonto, 70000);

    const maria = convocados.find(a => a.clienteId === 'c-variable');
    assert.ok(maria);
    assert.equal(maria.tipoInscripcion, 'VARIABLE');
    assert.equal(maria.alDia, true);

    const juan = convocados.find(a => a.clienteId === 'c-recupero');
    assert.ok(juan);
    assert.equal(juan.tipoInscripcion, 'RECUPERO');
    assert.equal(juan.recuperoId, 'rec-1');
  });

  it('calcularMetricasAsistencia calcula presentes, ausentes y porcentajes', () => {
    const alumnos = [
      { clienteId: '1' },
      { clienteId: '2' },
      { clienteId: '3' },
      { clienteId: '4' }
    ] as any;

    const metricas = calcularMetricasAsistencia(alumnos, ['1', '2', '3'], 7);
    assert.equal(metricas.totalInscriptos, 4);
    assert.equal(metricas.totalPresentes, 3);
    assert.equal(metricas.totalAusentes, 1);
    assert.equal(metricas.cupoMaximo, 7);
    assert.equal(metricas.lugaresLibres, 3);
    assert.equal(metricas.porcentajeAsistencia, 75);
  });

  it('guardarRegistroAsistencia y obtenerRegistroAsistencia persisten y leen registros', () => {
    const registro = {
      id: '2026-11-02_LUNES-19:00',
      fecha: '2026-11-02',
      turnoId: 'LUNES-19:00',
      dia: 'LUNES',
      hora: '19:00',
      presentesIds: ['c1', 'c2'],
      ausentesIds: ['c3'],
      walkins: [],
      actualizadoAt: new Date().toISOString()
    };

    guardarRegistroAsistencia(registro);

    const obtenido = obtenerRegistroAsistencia('2026-11-02', 'LUNES-19:00');
    assert.ok(obtenido);
    assert.equal(obtenido?.turnoId, 'LUNES-19:00');
    assert.deepEqual(obtenido?.presentesIds, ['c1', 'c2']);

    const turnosHoy = obtenerTurnosConAsistenciaDelDia('2026-11-02');
    assert.ok(turnosHoy.has('LUNES-19:00'));
    assert.equal(turnosHoy.has('LUNES-20:00'), false);
  });

  it('calcularMetricasHistoricas calcula totales, porcentajes y ranking de socios', () => {
    const registros = [
      {
        id: 'r1',
        fecha: '2026-11-01',
        turnoId: 'DOMINGO-10:00',
        dia: 'DOMINGO',
        hora: '10:00',
        presentesIds: ['c1', 'c2'],
        ausentesIds: ['c3'],
        walkins: [{ clienteId: 'w1' }],
        actualizadoAt: '2026-11-01T10:00:00Z'
      },
      {
        id: 'r2',
        fecha: '2026-11-02',
        turnoId: 'LUNES-19:00',
        dia: 'LUNES',
        hora: '19:00',
        presentesIds: ['c1', 'c3'],
        ausentesIds: [],
        walkins: [],
        actualizadoAt: '2026-11-02T19:00:00Z'
      }
    ] as any;

    const stats = calcularMetricasHistoricas(registros);
    assert.equal(stats.totalClases, 2);
    assert.equal(stats.totalPresentes, 4);
    assert.equal(stats.totalAusentes, 1);
    assert.equal(stats.totalWalkins, 1);
    assert.equal(stats.promedioPresentesPorClase, 2);
    assert.equal(stats.porcentajeGlobal, 80); // 4 presentes de 5 inscriptos = 80%

    // c1 vino a las 2 clases
    assert.equal(stats.rankingSocios[0].clienteId, 'c1');
    assert.equal(stats.rankingSocios[0].totalPresentes, 2);
  });
});
