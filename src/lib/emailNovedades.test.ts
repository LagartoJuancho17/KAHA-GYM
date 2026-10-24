// src/lib/emailNovedades.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDestinatariosNovedad,
  generarAsuntoNovedad,
  generarHtmlNovedad,
  generarTextoPlanoNovedad,
  generarMailtoNovedad
} from './emailNovedades';
import { Cliente, Novedad } from '../types';

describe('emailNovedades', () => {
  const mockClientes: Cliente[] = [
    {
      id: 'c1',
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan@test.com',
      activo: true,
      creado_at: '2026-01-01'
    } as unknown as Cliente,
    {
      id: 'c2',
      nombre: 'María',
      apellido: 'Gómez',
      email: 'maria@test.com',
      activo: true,
      creado_at: '2026-01-01'
    } as unknown as Cliente,
    {
      id: 'c3_inactivo',
      nombre: 'Pedro',
      apellido: 'Baja',
      email: 'pedro@test.com',
      activo: false,
      creado_at: '2026-01-01'
    } as unknown as Cliente,
    {
      id: 'c4_invitado',
      nombre: 'Invitado',
      apellido: 'Clase',
      email: 'invitado-123@kaha.com',
      activo: true,
      creado_at: '2026-01-01'
    } as unknown as Cliente,
    {
      id: 'c5_sin_email',
      nombre: 'Sin',
      apellido: 'Mail',
      email: '',
      activo: true,
      creado_at: '2026-01-01'
    } as unknown as Cliente
  ];


  it('getDestinatariosNovedad filtra solo socios activos con email válido', () => {
    const destinatarios = getDestinatariosNovedad(mockClientes);
    assert.equal(destinatarios.length, 2);
    assert.deepEqual(
      destinatarios.map(d => d.email),
      ['juan@test.com', 'maria@test.com']
    );
  });

  it('getDestinatariosNovedad para novedad privada solo devuelve ese socio', () => {
    const destinatarios = getDestinatariosNovedad(mockClientes, 'c2');
    assert.equal(destinatarios.length, 1);
    assert.equal(destinatarios[0].id, 'c2');
    assert.equal(destinatarios[0].email, 'maria@test.com');
  });

  it('getDestinatariosNovedad para socio inactivo no devuelve nada', () => {
    const destinatarios = getDestinatariosNovedad(mockClientes, 'c3_inactivo');
    assert.equal(destinatarios.length, 0);
  });

  it('generarAsuntoNovedad incluye el icono correspondiente a la categoría y prefijo destacado', () => {
    const novAranceles: Novedad = {
      id: 'nov-1',
      titulo: 'Nuevos Valores de Cuota',
      contenido: 'A partir del próximo mes...',
      categoria: 'ARANCELES',
      fecha: '2026-10-24 10:00',
      creado_por: 'admin@kaha.com',
      destacado: true
    };
    const asunto = generarAsuntoNovedad(novAranceles);
    assert.match(asunto, /⭐/);
    assert.match(asunto, /💰/);
    assert.match(asunto, /Nuevos Valores de Cuota/);
    assert.match(asunto, /KAHA GYM/);

    const novInfo: Novedad = {
      id: 'nov-2',
      titulo: 'Horarios Feriado',
      contenido: 'El lunes abrimos de 9 a 13hs.',
      categoria: 'INFORMACION',
      fecha: '2026-10-24 10:00',
      creado_por: 'admin@kaha.com',
      destacado: false
    };
    const asuntoInfo = generarAsuntoNovedad(novInfo);
    assert.equal(asuntoInfo.includes('⭐'), false);
    assert.match(asuntoInfo, /📢/);
    assert.match(asuntoInfo, /Horarios Feriado/);
  });

  it('generarHtmlNovedad incluye branding, título, contenido y personalización', () => {
    const nov: Novedad = {
      id: 'nov-1',
      titulo: 'Feriado de Carnaval',
      contenido: 'Entrenamos en turno especial de 10 a 14hs.',
      categoria: 'TURNOS',
      fecha: '2026-10-24 12:00',
      creado_por: 'admin@kaha.com',
      destacado: false
    };

    const html = generarHtmlNovedad(nov, 'Juanchi');
    assert.match(html, /KAHA GYM/);
    assert.match(html, /Feriado de Carnaval/);
    assert.match(html, /Entrenamos en turno especial de 10 a 14hs\./);
    assert.match(html, /¡Hola, Juanchi!/);
  });

  it('generarTextoPlanoNovedad formatea texto limpio con saludo', () => {
    const nov: Novedad = {
      id: 'nov-1',
      titulo: 'Aviso Importante',
      contenido: 'Traer toalla personal obligatoria.',
      categoria: 'INFORMACION',
      fecha: '2026-10-24 12:00',
      creado_por: 'admin@kaha.com',
      destacado: false
    };

    const texto = generarTextoPlanoNovedad(nov, 'Tobías');
    assert.match(texto, /¡Hola, Tobías!/);
    assert.match(texto, /Aviso Importante/);
    assert.match(texto, /Traer toalla personal obligatoria\./);
  });

  it('generarMailtoNovedad coloca destinatarios en bcc (CCO)', () => {
    const mailto = generarMailtoNovedad({
      destinatarios: ['uno@test.com', 'dos@test.com'],
      asunto: 'Aviso',
      cuerpo: 'Contenido'
    });

    assert.match(mailto, /^mailto:\?bcc=/);
    assert.match(mailto, /uno%40test\.com/);
    assert.match(mailto, /dos%40test\.com/);
  });
});
