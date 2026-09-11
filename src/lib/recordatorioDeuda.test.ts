// src/lib/recordatorioDeuda.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TITULO_RECORDATORIO_DEUDA,
  MENSAJE_RECORDATORIO_DEUDA,
  generarMensajeWhatsAppRecordatorio,
  socioEstaDebiendo
} from './recordatorioDeuda.js';

describe('Recordatorio de Deuda y Validación Estricta de Deudores', () => {
  it('el título y contenido coinciden exactamente con la especificación solicitada', () => {
    assert.strictEqual(TITULO_RECORDATORIO_DEUDA, '💚 Te dejamos un pequeño recordatorio');
    assert.ok(MENSAJE_RECORDATORIO_DEUDA.includes('Ya pasó la fecha prevista para realizar el pago'));
    assert.ok(MENSAJE_RECORDATORIO_DEUDA.includes('tu turno fijo queda disponible para ser ocupado por otra persona.'));
    assert.ok(MENSAJE_RECORDATORIO_DEUDA.includes('Si tuviste alguna dificultad o necesitás unos días más, escribinos cuando puedas.'));
    assert.ok(MENSAJE_RECORDATORIO_DEUDA.includes('¡Queremos que sigas siendo parte de KAHA!'));
    assert.ok(MENSAJE_RECORDATORIO_DEUDA.includes('Cualquier cosa, estamos acá para ayudarte. 💚'));
  });

  it('generarMensajeWhatsAppRecordatorio formatea con saludo y contenido completo', () => {
    const msg = generarMensajeWhatsAppRecordatorio('Luciano');
    assert.ok(msg.startsWith('Hola Luciano! 👋'));
    assert.ok(msg.includes('💚 Te dejamos un pequeño recordatorio'));
    assert.ok(msg.includes('¡Queremos que sigas siendo parte de KAHA!'));
  });

  it('SOLAMENTE socios que están debiendo: socio al día NO debe recibir mensaje', () => {
    // Socio que pagó septiembre 2026, deuda 0
    const fechaSimulada = new Date('2026-09-08T12:00:00Z');
    const debiendo = socioEstaDebiendo({
      deuda_acumulada: 0,
      estado: 'ACTIVO',
      ultimo_mes_pagado: '2026-09',
      fechaReferencia: fechaSimulada
    });
    assert.strictEqual(debiendo, false);
  });

  it('socio con pago registrado en lista de pagos no está debiendo', () => {
    const fechaSimulada = new Date('2026-09-08T12:00:00Z');
    const debiendo = socioEstaDebiendo({
      deuda_acumulada: 0,
      estado: 'ACTIVO',
      socioId: 'socio-123',
      pagos: [{ cliente_id: 'socio-123', mes_correspondiente: '2026-09' }],
      fechaReferencia: fechaSimulada
    });
    assert.strictEqual(debiendo, false);
  });

  it('socio que NO pagó y ya es día 6 en adelante SÍ está debiendo', () => {
    const fechaSimulada = new Date('2026-09-06T10:00:00Z');
    const debiendo = socioEstaDebiendo({
      deuda_acumulada: 0,
      estado: 'ACTIVO',
      ultimo_mes_pagado: '2026-08',
      fechaReferencia: fechaSimulada
    });
    assert.strictEqual(debiendo, true);
  });

  it('socio que no pagó pero aún está dentro de los días 1 al 5 NO está debiendo aún', () => {
    const fechaSimulada = new Date('2026-09-04T15:00:00Z');
    const debiendo = socioEstaDebiendo({
      deuda_acumulada: 0,
      estado: 'ACTIVO',
      ultimo_mes_pagado: '2026-08',
      fechaReferencia: fechaSimulada
    });
    assert.strictEqual(debiendo, false);
  });

  it('socio con deuda acumulada previa > 0 SÍ está debiendo aunque sea día 2', () => {
    const fechaSimulada = new Date('2026-09-02T10:00:00Z');
    const debiendo = socioEstaDebiendo({
      deuda_acumulada: 45000,
      estado: 'CON_DEUDA',
      ultimo_mes_pagado: '2026-07',
      fechaReferencia: fechaSimulada
    });
    assert.strictEqual(debiendo, true);
  });

  it('socio con estado MOROSO SÍ está debiendo', () => {
    const fechaSimulada = new Date('2026-09-03T10:00:00Z');
    const debiendo = socioEstaDebiendo({
      deuda_acumulada: 0,
      estado: 'MOROSO',
      fechaReferencia: fechaSimulada
    });
    assert.strictEqual(debiendo, true);
  });

  it('socio con exención activa y sin deuda acumulada NO está debiendo', () => {
    const fechaSimulada = new Date('2026-09-15T12:00:00Z');
    const debiendo = socioEstaDebiendo({
      deuda_acumulada: 0,
      estado: 'ACTIVO',
      exencion_cobro: 'SUSPENDIDO',
      ultimo_mes_pagado: '2026-08',
      fechaReferencia: fechaSimulada
    });
    assert.strictEqual(debiendo, false);
  });
});
