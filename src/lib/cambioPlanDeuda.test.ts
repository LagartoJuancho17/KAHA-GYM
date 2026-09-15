// src/lib/cambioPlanDeuda.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularDiferenciaPlan, precioPlanSocio } from './calculoDeuda';
import { Cliente, Plan } from '../types';

const mockPlanes: Plan[] = [
  { id: 'p-none', nombre: 'Aún no sabe', dias_por_semana: 5, precio: 0, creado_at: '' },
  { id: 'p-2d', nombre: 'Plan 2 Días Semana', dias_por_semana: 2, precio: 65000, creado_at: '' },
  { id: 'p-3d', nombre: 'Plan 3 Días Semana', dias_por_semana: 3, precio: 85000, creado_at: '' },
  { id: 'p-4d', nombre: 'Plan 4 Días Semana', dias_por_semana: 4, precio: 115000, creado_at: '' },
  { id: 'p-5d', nombre: 'Plan 5 Días Semana', dias_por_semana: 5, precio: 135000, creado_at: '' },
];

test('Caso Cecilia: Ampliación de Plan 2 Días ($65.000) a Plan 3 Días ($85.000) calcula diferencia de $20.000', () => {
  const cecilia: Pick<Cliente, 'plan_id' | 'precio_personalizado'> = {
    plan_id: 'p-2d',
    precio_personalizado: null,
  };

  const res = calcularDiferenciaPlan(cecilia, 'p-3d', mockPlanes);
  assert.equal(res.precioAnterior, 65000);
  assert.equal(res.precioNuevo, 85000);
  assert.equal(res.diferencia, 20000);
});

test('Caso Cecilia: Sumar diferencia a deuda_acumulada previa', () => {
  const deudaPrevia = 0;
  const cecilia: Pick<Cliente, 'plan_id' | 'precio_personalizado'> = {
    plan_id: 'p-2d',
    precio_personalizado: null,
  };

  const { diferencia } = calcularDiferenciaPlan(cecilia, 'p-3d', mockPlanes);
  const nuevaDeuda = deudaPrevia + diferencia;
  assert.equal(nuevaDeuda, 20000);

  // Si ya tenía saldo previo, se acumula la diferencia
  const deudaConSaldo = 15000;
  const nuevaDeudaConSaldo = deudaConSaldo + diferencia;
  assert.equal(nuevaDeudaConSaldo, 35000);
});

test('Ampliación desde Sin Plan ($0) a Plan 2 Días ($65.000) calcula $65.000 de diferencia', () => {
  const socioNuevo: Pick<Cliente, 'plan_id' | 'precio_personalizado'> = {
    plan_id: 'p-none',
    precio_personalizado: null,
  };

  const res = calcularDiferenciaPlan(socioNuevo, 'p-2d', mockPlanes);
  assert.equal(res.precioAnterior, 0);
  assert.equal(res.precioNuevo, 65000);
  assert.equal(res.diferencia, 65000);
});

test('Cambio a un plan de menor arancel no genera deuda (diferencia 0)', () => {
  const socio5d: Pick<Cliente, 'plan_id' | 'precio_personalizado'> = {
    plan_id: 'p-5d',
    precio_personalizado: null,
  };

  const res = calcularDiferenciaPlan(socio5d, 'p-3d', mockPlanes);
  assert.equal(res.precioAnterior, 135000);
  assert.equal(res.precioNuevo, 85000);
  assert.equal(res.diferencia, 0);
});

test('Plan con precio personalizado respeta la tarifa especial para el cálculo de la diferencia', () => {
  const socioTarifaEspecial: Pick<Cliente, 'plan_id' | 'precio_personalizado'> = {
    plan_id: 'p-2d',
    precio_personalizado: 55000, // descuento especial
  };

  const res = calcularDiferenciaPlan(socioTarifaEspecial, 'p-3d', mockPlanes);
  assert.equal(res.precioAnterior, 55000);
  assert.equal(res.precioNuevo, 85000);
  assert.equal(res.diferencia, 30000);
});
