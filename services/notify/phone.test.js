// Tests deterministas del normalizador de teléfonos (gate test, corre local y gratis).
//   node --test services/notify/phone.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArgPhone, isSendablePhone } from './phone.js';

test('local 10 dígitos CABA/GBA -> agrega 549', () => {
  assert.equal(normalizeArgPhone('1131776907'), '5491131776907');
  assert.equal(normalizeArgPhone('1151275238'), '5491151275238');
});

test('internacional móvil con formato humano', () => {
  assert.equal(normalizeArgPhone('+54 9 11 6010-3720'), '5491160103720');
  assert.equal(normalizeArgPhone('+54 9 11 3093-5253'), '5491130935253');
});

test('internacional del interior (La Plata 221)', () => {
  assert.equal(normalizeArgPhone('+5492215640800'), '5492215640800');
});

test('internacional sin el 9 -> lo inserta', () => {
  assert.equal(normalizeArgPhone('+54 11 3177 6907'), '5491131776907');
  assert.equal(normalizeArgPhone('541131776907'), '5491131776907');
});

test('con 0 de trunk local', () => {
  assert.equal(normalizeArgPhone('011 3177-6907'), '5491131776907');
  assert.equal(normalizeArgPhone('0113177 6907'), '5491131776907');
});

test('prefijo 00 internacional', () => {
  assert.equal(normalizeArgPhone('005491131776907'), '5491131776907');
});

test('extranjero se respeta tal cual (Australia)', () => {
  assert.equal(normalizeArgPhone('+61482592164'), '61482592164');
});

test('vacío / basura -> null', () => {
  assert.equal(normalizeArgPhone(''), null);
  assert.equal(normalizeArgPhone(null), null);
  assert.equal(normalizeArgPhone(undefined), null);
  assert.equal(normalizeArgPhone('abc'), null);
});

test('15 local sin área -> null (no reconstruible)', () => {
  assert.equal(normalizeArgPhone('1531776907'), null);
});

test('número trucho de placeholder normaliza pero es corto/no entregable', () => {
  // "11-0000-0000" -> 1100000000 -> 5491100000000 (largo válido, no entregable real,
  // pero no rompe: Meta simplemente no lo entrega).
  assert.equal(normalizeArgPhone('11-0000-0000'), '5491100000000');
});

test('isSendablePhone valida largo E.164', () => {
  assert.equal(isSendablePhone('5491131776907'), true);
  assert.equal(isSendablePhone('61482592164'), true);
  assert.equal(isSendablePhone(null), false);
  assert.equal(isSendablePhone('12345'), false);
});
