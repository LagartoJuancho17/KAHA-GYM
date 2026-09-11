// src/lib/emailInicioMes.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { estaEmailInicioMesEnviado } from './emailInicioMes';

test('devuelve false si no fue enviado ni en local, ni storage, ni auditoria', () => {
  const enviado = estaEmailInicioMesEnviado({
    mes: '2026-09',
    enviadoLocal: false,
    getItemStorage: () => null,
    auditLogs: []
  });
  assert.equal(enviado, false);
});

test('devuelve true si enviadoLocal es true (envío recién realizado en sesión)', () => {
  const enviado = estaEmailInicioMesEnviado({
    mes: '2026-09',
    enviadoLocal: true,
    getItemStorage: () => null,
    auditLogs: []
  });
  assert.equal(enviado, true);
});

test('devuelve true si está guardado en localStorage para el mes actual', () => {
  const enviado = estaEmailInicioMesEnviado({
    mes: '2026-09',
    enviadoLocal: false,
    getItemStorage: (key: string) => {
      if (key === 'kaha-mail-inicio-mes-enviado-2026-09') {
        return '11/09/2026, 09:30:00';
      }
      return null;
    },
    auditLogs: []
  });
  assert.equal(enviado, true);
});

test('devuelve false si localStorage tiene registrado un mes anterior pero no el actual', () => {
  const enviado = estaEmailInicioMesEnviado({
    mes: '2026-09',
    enviadoLocal: false,
    getItemStorage: (key: string) => {
      if (key === 'kaha-mail-inicio-mes-enviado-2026-08') {
        return '01/08/2026, 08:00:00';
      }
      return null;
    },
    auditLogs: []
  });
  assert.equal(enviado, false);
});

test('devuelve true si existe log de auditoría EMAIL_MENSUAL_ENVIADO con mes en detalles', () => {
  const enviado = estaEmailInicioMesEnviado({
    mes: '2026-09',
    enviadoLocal: false,
    getItemStorage: () => null,
    auditLogs: [
      {
        accion: 'EMAIL_MENSUAL_ENVIADO',
        detalles: { mes: '2026-09', cantidad: 45 },
        creado_at: '2026-09-02T10:00:00Z'
      }
    ]
  });
  assert.equal(enviado, true);
});

test('devuelve true si existe log de auditoría EMAIL_MENSUAL_ABIERTO_CLIENTE', () => {
  const enviado = estaEmailInicioMesEnviado({
    mes: '2026-09',
    enviadoLocal: false,
    getItemStorage: () => null,
    auditLogs: [
      {
        accion: 'EMAIL_MENSUAL_ABIERTO_CLIENTE',
        detalles: { mes: '2026-09' },
        creado_at: '2026-09-01T12:00:00Z'
      }
    ]
  });
  assert.equal(enviado, true);
});

test('devuelve true si existe log de auditoría EMAIL_MENSUAL_INICIO_MES_ENVIADO (de edge function)', () => {
  const enviado = estaEmailInicioMesEnviado({
    mes: '2026-09',
    enviadoLocal: false,
    getItemStorage: () => null,
    auditLogs: [
      {
        accion: 'EMAIL_MENSUAL_INICIO_MES_ENVIADO',
        creado_at: '2026-09-01T08:00:00Z'
      }
    ]
  });
  assert.equal(enviado, true);
});

test('ignora logs de auditoría de otros meses', () => {
  const enviado = estaEmailInicioMesEnviado({
    mes: '2026-09',
    enviadoLocal: false,
    getItemStorage: () => null,
    auditLogs: [
      {
        accion: 'EMAIL_MENSUAL_ENVIADO',
        detalles: { mes: '2026-08' },
        creado_at: '2026-08-01T10:00:00Z'
      }
    ]
  });
  assert.equal(enviado, false);
});
