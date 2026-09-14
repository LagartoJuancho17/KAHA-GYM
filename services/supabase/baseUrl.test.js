// Tests deterministas del normalizador de SUPABASE_URL (gate test, local y gratis).
//   node --test services/supabase/baseUrl.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarSupabaseUrl } from './baseUrl.js';

const OK = 'https://hiurcmchhtrcqdqurqrn.supabase.co';

test('una URL ya correcta queda igual', () => {
  assert.equal(normalizarSupabaseUrl(OK), OK);
});

test('REGRESION: la URL con /rest/v1 es la que rompía producción', () => {
  // Con este valor supabase-js armaba .../rest/v1/rest/v1/tabla y la API
  // devolvía PGRST125 "Invalid path specified in request URL". Eso dejaba sin
  // funcionar TODA operación del servidor contra Supabase, webhook de Mercado
  // Pago incluido.
  assert.equal(normalizarSupabaseUrl(`${OK}/rest/v1`), OK);
  assert.equal(normalizarSupabaseUrl(`${OK}/rest/v1/`), OK);
});

test('saca también los otros sufijos de api', () => {
  assert.equal(normalizarSupabaseUrl(`${OK}/auth/v1`), OK);
  assert.equal(normalizarSupabaseUrl(`${OK}/storage/v1`), OK);
  assert.equal(normalizarSupabaseUrl(`${OK}/functions/v1`), OK);
  assert.equal(normalizarSupabaseUrl(`${OK}/realtime/v1`), OK);
});

test('saca barras finales de más', () => {
  assert.equal(normalizarSupabaseUrl(`${OK}/`), OK);
  assert.equal(normalizarSupabaseUrl(`${OK}///`), OK);
  assert.equal(normalizarSupabaseUrl(`${OK}/rest/v1///`), OK);
});

test('tolera espacios y comillas de copiar y pegar', () => {
  assert.equal(normalizarSupabaseUrl(`  ${OK}  `), OK);
  assert.equal(normalizarSupabaseUrl(`"${OK}"`), OK);
  assert.equal(normalizarSupabaseUrl(`'${OK}/rest/v1'`), OK);
});

test('no rompe un dominio que casualmente contiene rest en el medio', () => {
  const conRest = 'https://rest-api.supabase.co';
  assert.equal(normalizarSupabaseUrl(conRest), conRest);
  assert.equal(normalizarSupabaseUrl(`${conRest}/rest/v1`), conRest);
});

test('vacío, null y basura devuelven cadena vacía', () => {
  assert.equal(normalizarSupabaseUrl(''), '');
  assert.equal(normalizarSupabaseUrl('   '), '');
  assert.equal(normalizarSupabaseUrl(null), '');
  assert.equal(normalizarSupabaseUrl(undefined), '');
  assert.equal(normalizarSupabaseUrl(123), '');
});
