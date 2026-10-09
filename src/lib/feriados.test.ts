// src/lib/feriados.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  esFeriado,
  estaCerradoPorFeriado,
  estadoTurnoFeriado,
  estaTurnoCerradoPorFeriado,
  feriadosDelMes,
  proximosFeriados,
  generarFeriadosNacionales,
  formatearFechaFeriado,
  generarNovedadDeFeriado,
  Feriado
} from './feriados';

describe('Gestión de Feriados - KAHA GYM', () => {
  const mockFeriados: Feriado[] = [
    {
      id: 'f-1',
      fecha: '2026-05-25',
      nombre: 'Día de la Revolución de Mayo',
      tipo: 'INAMOVIBLE',
      cerrado: true,
      activo: true,
      creado_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'f-2',
      fecha: '2026-06-20',
      nombre: 'Día de la Bandera',
      tipo: 'INAMOVIBLE',
      cerrado: false,
      horario_especial: 'Turno Mañana (07:30 a 12:00 hs)',
      horas_habilitadas: ['07:30', '08:30', '09:30', '10:30', '11:30', '12:00'],
      activo: true,
      creado_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'f-3',
      fecha: '2026-07-09',
      nombre: 'Día de la Independencia (Desactivado)',
      tipo: 'INAMOVIBLE',
      cerrado: true,
      activo: false, // inactivo
      creado_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'f-4',
      fecha: '2026-05-01',
      nombre: 'Día del Trabajador',
      tipo: 'INAMOVIBLE',
      cerrado: true,
      activo: true,
      creado_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'f-5',
      fecha: '2026-11-20',
      nombre: 'Día de la Soberanía Nacional',
      tipo: 'TRASLADABLE',
      cerrado: false,
      hora_desde: '10:00',
      hora_hasta: '18:00',
      horario_especial: 'Horario corrido 10:00 a 18:00',
      activo: true,
      creado_at: '2026-01-01T00:00:00Z'
    }
  ];

  it('detecta correctamente un feriado activo en una fecha', () => {
    const f = esFeriado('2026-05-25', mockFeriados);
    assert.ok(f);
    assert.equal(f?.nombre, 'Día de la Revolución de Mayo');
  });

  it('no detecta un feriado que está desactivado', () => {
    const f = esFeriado('2026-07-09', mockFeriados);
    assert.equal(f, undefined);
  });

  it('devuelve undefined si la fecha no es feriado', () => {
    const f = esFeriado('2026-05-26', mockFeriados);
    assert.equal(f, undefined);
  });

  it('estaCerradoPorFeriado devuelve true solo si el feriado tiene cerrado=true', () => {
    assert.equal(estaCerradoPorFeriado('2026-05-25', mockFeriados), true);
    // El 20 de Junio está abierto con horario especial: cerrado=false
    assert.equal(estaCerradoPorFeriado('2026-06-20', mockFeriados), false);
    // Un día común no está cerrado por feriado
    assert.equal(estaCerradoPorFeriado('2026-05-15', mockFeriados), false);
  });

  it('estadoTurnoFeriado: día cerrado por completo cierra todos los horarios', () => {
    const status07 = estadoTurnoFeriado('2026-05-25', '07:30', mockFeriados);
    assert.equal(status07.esFeriado, true);
    assert.equal(status07.cerrado, true);

    const status18 = estadoTurnoFeriado('2026-05-25', '18:00', mockFeriados);
    assert.equal(status18.cerrado, true);
    assert.equal(estaTurnoCerradoPorFeriado('2026-05-25', '18:00', mockFeriados), true);
  });

  it('estadoTurnoFeriado: feriado con turnos habilitados permite los horarios seleccionados y cierra los restantes', () => {
    // 09:30 está en horas_habilitadas: debe estar ABIERTO
    const status0930 = estadoTurnoFeriado('2026-06-20', '09:30', mockFeriados);
    assert.equal(status0930.esFeriado, true);
    assert.equal(status0930.cerrado, false);
    assert.equal(status0930.esHorarioEspecial, true);
    assert.equal(estaTurnoCerradoPorFeriado('2026-06-20', '09:30', mockFeriados), false);

    // 17:00 NO está en horas_habilitadas: debe estar CERRADO
    const status1700 = estadoTurnoFeriado('2026-06-20', '17:00', mockFeriados);
    assert.equal(status1700.esFeriado, true);
    assert.equal(status1700.cerrado, true);
    assert.ok(status1700.motivo?.includes('Fuera del horario especial'));
    assert.equal(estaTurnoCerradoPorFeriado('2026-06-20', '17:00', mockFeriados), true);
  });

  it('estadoTurnoFeriado: feriado con rango horario respeta hora_desde y hora_hasta', () => {
    // 11:30 está dentro de 10:00 a 18:00
    const status1130 = estadoTurnoFeriado('2026-11-20', '11:30', mockFeriados);
    assert.equal(status1130.cerrado, false);

    // 07:30 está antes de las 10:00
    const status0730 = estadoTurnoFeriado('2026-11-20', '07:30', mockFeriados);
    assert.equal(status0730.cerrado, true);

    // 20:00 está después de las 18:00
    const status2000 = estadoTurnoFeriado('2026-11-20', '20:00', mockFeriados);
    assert.equal(status2000.cerrado, true);
  });

  it('estadoTurnoFeriado: día normal sin feriado retorna cerrado=false', () => {
    const status = estadoTurnoFeriado('2026-11-15', '09:30', mockFeriados);
    assert.equal(status.esFeriado, false);
    assert.equal(status.cerrado, false);
  });

  it('feriadosDelMes filtra y ordena correctamente los feriados de un mes', () => {
    const feriadosMayo = feriadosDelMes(mockFeriados, '2026-05');
    assert.equal(feriadosMayo.length, 2);
    assert.equal(feriadosMayo[0].fecha, '2026-05-01');
    assert.equal(feriadosMayo[1].fecha, '2026-05-25');
  });

  it('proximosFeriados devuelve los feriados futuros ordenados cronológicamente', () => {
    const proximos = proximosFeriados(mockFeriados, '2026-05-10', 5);
    assert.equal(proximos.length, 3);
    assert.equal(proximos[0].fecha, '2026-05-25');
    assert.equal(proximos[1].fecha, '2026-06-20');
    assert.equal(proximos[2].fecha, '2026-11-20');
  });

  it('generarFeriadosNacionales genera lista de feriados oficiales de Argentina para 2026', () => {
    const oficiales = generarFeriadosNacionales(2026);
    assert.ok(oficiales.length >= 15);
    const revMayo = oficiales.find(f => f.fecha === '2026-05-25');
    assert.ok(revMayo);
    assert.equal(revMayo?.nombre, 'Día de la Revolución de Mayo');
    assert.equal(revMayo?.cerrado, true);
    assert.equal(revMayo?.activo, true);
  });

  it('formatearFechaFeriado produce una fecha legible en español', () => {
    const formatted = formatearFechaFeriado('2026-05-25');
    assert.ok(formatted.toLowerCase().includes('25'));
    assert.ok(formatted.toLowerCase().includes('mayo'));
  });

  it('generarNovedadDeFeriado arma el comunicado con turnos habilitados detallados', () => {
    const novCerrado = generarNovedadDeFeriado(mockFeriados[0]);
    assert.ok(novCerrado.titulo.includes('Día de la Revolución de Mayo'));
    assert.ok(novCerrado.contenido.includes('CERRADO'));

    const novEspecial = generarNovedadDeFeriado(mockFeriados[1]);
    assert.ok(novEspecial.contenido.includes('Turno Mañana'));
    assert.ok(novEspecial.contenido.includes('Turnos habilitados'));
  });
});
