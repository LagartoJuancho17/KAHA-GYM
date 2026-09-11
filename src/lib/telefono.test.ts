// src/lib/telefono.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTelefonoWhatsApp } from './telefono';

test('agrega 549 a teléfonos locales de 10 dígitos (CABA/GBA)', () => {
  assert.equal(normalizarTelefonoWhatsApp('1131776907'), '5491131776907');
  assert.equal(normalizarTelefonoWhatsApp('11-5432-8901'), '5491154328901');
  assert.equal(normalizarTelefonoWhatsApp('11 3422 9988'), '5491134229988');
});

test('maneja teléfonos con formato internacional humano (+54 9 11 ...)', () => {
  assert.equal(normalizarTelefonoWhatsApp('+54 9 11 6010-3720'), '5491160103720');
  assert.equal(normalizarTelefonoWhatsApp('+5491131776907'), '5491131776907');
});

test('inserta el 9 si viene con 54 pero sin el 9', () => {
  assert.equal(normalizarTelefonoWhatsApp('+54 11 3177 6907'), '5491131776907');
  assert.equal(normalizarTelefonoWhatsApp('541131776907'), '5491131776907');
});

test('elimina el 0 de código de área argentino (011 ...)', () => {
  assert.equal(normalizarTelefonoWhatsApp('011 3177-6907'), '5491131776907');
  assert.equal(normalizarTelefonoWhatsApp('01131776907'), '5491131776907');
});

test('respeta número extranjero completo (ej. Australia)', () => {
  assert.equal(normalizarTelefonoWhatsApp('+61482592164'), '61482592164');
});

test('devuelve null para teléfonos inválidos o vacíos', () => {
  assert.equal(normalizarTelefonoWhatsApp(''), null);
  assert.equal(normalizarTelefonoWhatsApp(null), null);
  assert.equal(normalizarTelefonoWhatsApp(undefined), null);
  assert.equal(normalizarTelefonoWhatsApp('123'), null);
  assert.equal(normalizarTelefonoWhatsApp('15-3177-6907'), null);
});
