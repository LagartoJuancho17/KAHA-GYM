// src/lib/avisoVencimiento.test.ts
// Cubre el aviso del día 5 y a quién le llega (pedido 1 de Juanchi).
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DIA_AVISO_VENCIMIENTO,
  DIA_BAJA_RESERVA,
  MENSAJE_AVISO_VENCIMIENTO,
  MENSAJE_RECORDATORIO_DEUDA,
  generarAvisoVencimiento,
  destinatariosAvisoDeuda,
  socioEstaDebiendo,
  SocioNotificable
} from './recordatorioDeuda.js';

const socio = (over: Partial<SocioNotificable> = {}): SocioNotificable => ({
  id: 'c1',
  nombre: 'Ana',
  apellido: 'Perez',
  email: 'ana@mail.com',
  activo: true,
  estado: 'ACTIVO',
  deuda_acumulada: 0,
  ultimo_mes_pagado: '2026-09',
  ...over
});

describe('Aviso del día 5', () => {
  it('el calendario es 5 para avisar y 10 para dar de baja', () => {
    assert.strictEqual(DIA_AVISO_VENCIMIENTO, 5);
    assert.strictEqual(DIA_BAJA_RESERVA, 10);
  });

  it('el aviso dice la fecha límite explícita, que es lo que pidió Juanchi', () => {
    const msg = generarAvisoVencimiento('Ana');
    assert.ok(msg.includes('Ana'), 'saluda por el nombre');
    assert.ok(msg.includes('día 10'), 'nombra el día 10 como fecha límite');
    assert.ok(/liberado|libera/i.test(msg), 'explica que se libera el turno');
    assert.ok(/escribinos|avises/i.test(msg), 'ofrece la salida de contactarse');
  });

  it('REGRESION: el aviso del día 5 avisa ANTES, no cuenta la baja como hecha', () => {
    // El mensaje viejo dice que el turno YA quedó liberado: sirve después del 10,
    // no el 5. Mandar ese el día 5 le avisa al socio que ya perdió el lugar.
    assert.ok(/Ya pasó la fecha/i.test(MENSAJE_RECORDATORIO_DEUDA));
    assert.ok(!/Ya pasó la fecha/i.test(MENSAJE_AVISO_VENCIMIENTO));
    assert.notStrictEqual(MENSAJE_AVISO_VENCIMIENTO, MENSAJE_RECORDATORIO_DEUDA);
  });
});

describe('A quién le llega el aviso', () => {
  const dia5 = new Date('2026-09-05T12:00:00Z');
  const pagos: Array<{ cliente_id: string; mes_correspondiente: string }> = [];

  it('al socio que debe, sí', () => {
    const lista = [socio({ id: 'debe', deuda_acumulada: 65000 })];
    assert.deepStrictEqual(destinatariosAvisoDeuda(lista, pagos, dia5).map(c => c.id), ['debe']);
  });

  it('al socio al día, no', () => {
    const lista = [socio({ id: 'aldia', deuda_acumulada: 0, ultimo_mes_pagado: '2026-09' })];
    assert.deepStrictEqual(destinatariosAvisoDeuda(lista, pagos, dia5), []);
  });

  it('REGRESION: al socio en reposo NO le llega intimación de pago', () => {
    // Su cuenta está congelada a propósito. Cobrarle es lo contrario de lo acordado.
    const lista = [
      socio({
        id: 'reposo',
        deuda_acumulada: 65000,
        estado: 'MOROSO',
        reposo: { desde: '2026-08-01', hasta: '2027-02-01' }
      })
    ];
    assert.deepStrictEqual(destinatariosAvisoDeuda(lista, pagos, dia5), []);
  });

  it('al socio dado de baja tampoco', () => {
    const lista = [socio({ id: 'baja', activo: false, deuda_acumulada: 65000 })];
    assert.deepStrictEqual(destinatariosAvisoDeuda(lista, pagos, dia5), []);
  });

  it('al becado/exento sin deuda previa, no', () => {
    const lista = [socio({ id: 'becado', exencion_cobro: 'PERDONADO', deuda_acumulada: 0 })];
    assert.deepStrictEqual(destinatariosAvisoDeuda(lista, pagos, dia5), []);
  });

  it('el que ya pagó este mes queda afuera aunque figure en la lista', () => {
    const lista = [socio({ id: 'pago', ultimo_mes_pagado: '2026-08', deuda_acumulada: 0 })];
    const conPago = [{ cliente_id: 'pago', mes_correspondiente: '2026-09' }];
    assert.deepStrictEqual(destinatariosAvisoDeuda(lista, conPago, dia5), []);
  });

  it('separa bien una lista mezclada', () => {
    const lista = [
      socio({ id: 'a', deuda_acumulada: 65000 }),
      socio({ id: 'b', deuda_acumulada: 0, ultimo_mes_pagado: '2026-09' }),
      socio({ id: 'c', deuda_acumulada: 30000, reposo: { desde: '2026-08-01', hasta: '2027-02-01' } }),
      socio({ id: 'd', estado: 'MOROSO' })
    ];
    assert.deepStrictEqual(destinatariosAvisoDeuda(lista, pagos, dia5).map(c => c.id), ['a', 'd']);
  });

  it('tolera lista vacía, null y elementos basura', () => {
    assert.deepStrictEqual(destinatariosAvisoDeuda([], pagos, dia5), []);
    assert.deepStrictEqual(destinatariosAvisoDeuda(null as any, pagos, dia5), []);
    assert.deepStrictEqual(destinatariosAvisoDeuda([null as any], pagos, dia5), []);
  });
});

describe('Reposo y aviso de deuda (bugs encontrados en el testeo del 16/09)', () => {
  it('REGRESION: socioEstaDebiendo por sí sola respeta el reposo', () => {
    // Antes devolvía true y el panel del socio le mostraba "tu turno fijo queda
    // disponible" a alguien con la cuenta congelada, justo lo contrario de lo
    // que le promete el cartel de reposo. El filtro estaba sólo en el envío
    // masivo, así que cada pantalla que llamara a esta función se lo perdía.
    const enReposo = {
      deuda_acumulada: 65000,
      estado: 'MOROSO',
      reposo: { desde: '2026-08-01', hasta: '2027-02-01' },
      fechaReferencia: new Date('2026-09-16T12:00:00Z')
    };
    assert.strictEqual(socioEstaDebiendo(enReposo), false);

    const { reposo, ...sinReposo } = enReposo;
    assert.strictEqual(socioEstaDebiendo(sinReposo), true, 'el control sí debe');
  });
});
