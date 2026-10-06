// src/lib/emailClase.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  esEmailValido,
  personalizarTexto,
  generarMailtoClase,
  PLANTILLAS_EMAIL_CLASE
} from './emailClase';

test('esEmailValido valida correctamente emails reales y rechaza nulos o ficticios', () => {
  assert.equal(esEmailValido('socio@gmail.com'), true);
  assert.equal(esEmailValido('juan.perez@hotmail.com.ar'), true);
  assert.equal(esEmailValido(''), false);
  assert.equal(esEmailValido(null), false);
  assert.equal(esEmailValido('invalido-sin-arroba'), false);
  assert.equal(esEmailValido('invitado-123456@kaha.com'), false);
});

test('personalizarTexto reemplaza correctamente {nombre}, {clase} y {profesor}', () => {
  const plantilla = 'Hola {nombre}! Tu clase de {clase} estará con el profe {profesor}.';
  const resultado = personalizarTexto({
    texto: plantilla,
    nombre: 'Gonzalo Pérez',
    claseTxt: 'Lunes 18:00 hs',
    profesor: 'Juan Ferrarotti'
  });

  assert.equal(resultado, 'Hola Gonzalo! Tu clase de Lunes 18:00 hs estará con el profe Juan Ferrarotti.');
});

test('personalizarTexto usa valores por defecto si faltan argumentos', () => {
  const plantilla = 'Hola {nombre}! Aviso para {clase}.';
  const resultado = personalizarTexto({
    texto: plantilla
  });

  assert.equal(resultado, 'Hola Socio! Aviso para tu clase.');
});

test('generarMailtoClase crea URL con destinatarios válidos en BCC', () => {
  const url = generarMailtoClase({
    destinatarios: ['facundo@gmail.com', 'invitado-999@kaha.com', 'sofia@hotmail.com'],
    asunto: 'Aviso Clase',
    cuerpo: 'Hola a todos'
  });

  assert.ok(url.startsWith('mailto:?bcc='));
  assert.ok(url.includes('facundo%40gmail.com'));
  assert.ok(url.includes('sofia%40hotmail.com'));
  assert.ok(!url.includes('invitado-999'));
  assert.ok(url.includes('subject=Aviso%20Clase'));
});

test('PLANTILLAS_EMAIL_CLASE contiene opciones de suspension, demora y aviso general', () => {
  assert.ok(PLANTILLAS_EMAIL_CLASE.length >= 5);
  const suspension = PLANTILLAS_EMAIL_CLASE.find(p => p.id === 'SUSPENSION_CLIMA');
  assert.ok(suspension);
  assert.ok(suspension.cuerpo.includes('suspendida'));
});
