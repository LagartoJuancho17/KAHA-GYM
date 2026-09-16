// src/lib/pagoDividido.ts
import { MedioPago } from '../types';

export type DestinoPago = 'JUANCHI' | 'RULO' | 'EFECTIVO';

export interface ParteDePago {
  id: string;
  medio: MedioPago;
  destino: DestinoPago;
  monto: number;
}

export const DESTINO_POR_DEFECTO: DestinoPago = 'RULO';
export const MEDIO_POR_DEFECTO: MedioPago = 'TRANSFERENCIA';

// La plata en pesos puede traer centavos; comparar flotantes de frente da falsos
// negativos (0.1 + 0.2 !== 0.3), así que se compara con tolerancia de un centavo.
const TOLERANCIA_CENTAVOS = 0.01;

/**
 * Efectivo no es un medio más: cuando el pago entra en mano no hay cuenta destino,
 * el destino ES la caja. Mantener los dos campos sueltos dejaba registrar
 * "transferencia que cayó en efectivo", que no existe y ensucia el balance.
 *
 * Por eso los dos campos se mueven juntos en ambos sentidos:
 *  - medio EFECTIVO  -> destino EFECTIVO
 *  - destino EFECTIVO -> medio EFECTIVO
 * y al salir de efectivo por un lado, el otro también sale.
 */
export function sincronizarMedioYDestino(
  cambio: { medio: MedioPago; destino: DestinoPago },
  campoTocado: 'medio' | 'destino'
): { medio: MedioPago; destino: DestinoPago } {
  const { medio, destino } = cambio;

  if (campoTocado === 'medio') {
    if (medio === 'EFECTIVO') return { medio, destino: 'EFECTIVO' };
    // Salgo de efectivo: el destino no puede quedar en la caja.
    if (destino === 'EFECTIVO') return { medio, destino: DESTINO_POR_DEFECTO };
    return { medio, destino };
  }

  if (destino === 'EFECTIVO') return { medio: 'EFECTIVO', destino };
  // Salgo de la caja: el medio no puede seguir siendo efectivo.
  if (medio === 'EFECTIVO') return { medio: MEDIO_POR_DEFECTO, destino };
  return { medio, destino };
}

export interface ValidacionPartes {
  ok: boolean;
  motivo?: string;
  suma: number;
  faltante: number;
}

/**
 * Un pago dividido tiene que cerrar exacto contra el total cobrado.
 * Si no cierra, el balance del mes queda mal para siempre y nadie se entera.
 */
export function validarPartes(partes: ParteDePago[], total: number): ValidacionPartes {
  const lista = Array.isArray(partes) ? partes : [];
  const suma = lista.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const faltante = Number((total - suma).toFixed(2));

  if (lista.length === 0) {
    return { ok: false, motivo: 'Agregá al menos un medio de pago.', suma, faltante };
  }
  if (lista.some(p => !(Number(p.monto) > 0))) {
    return { ok: false, motivo: 'Cada medio de pago tiene que tener un monto mayor a cero.', suma, faltante };
  }
  if (!(total > 0)) {
    return { ok: false, motivo: 'El total a cobrar tiene que ser mayor a cero.', suma, faltante };
  }
  if (Math.abs(faltante) > TOLERANCIA_CENTAVOS) {
    const verbo = faltante > 0 ? 'Faltan' : 'Sobran';
    return {
      ok: false,
      motivo: `${verbo} $${Math.abs(faltante).toLocaleString('es-AR')} para llegar al total de $${total.toLocaleString('es-AR')}.`,
      suma,
      faltante
    };
  }
  return { ok: true, suma, faltante: 0 };
}

/**
 * Reparte lo que todavía no fue asignado a ninguna parte. Sirve para el botón
 * "completar con el resto" del formulario: el operador carga la mitad en efectivo
 * y el resto se calcula solo, sin que tenga que hacer la cuenta a mano.
 */
export function restoSinAsignar(partes: ParteDePago[], total: number): number {
  const suma = (Array.isArray(partes) ? partes : []).reduce(
    (acc, p) => acc + (Number(p.monto) || 0),
    0
  );
  return Number(Math.max(0, total - suma).toFixed(2));
}

export interface CobroBeneficiario {
  cliente_id: string;
  mes_correspondiente: string;
  monto: number;
}

export interface FilaDePago {
  cliente_id: string;
  mes_correspondiente: string;
  monto: number;
  medio_pago: MedioPago;
  destino_transferencia: DestinoPago;
}

/**
 * Reparte los medios de pago sobre los cobros.
 *
 * El caso de Juanchi es uno solo: una persona, una cuota, mitad efectivo y mitad
 * transferencia. Pero el formulario ya permite cobrarle a varios socios de una,
 * así que hay que cubrir la combinación. Se recorre cobro por cobro consumiendo
 * los medios en orden, partiendo un cobro en dos filas si hace falta.
 *
 * Invariante: la suma de las filas resultantes es exactamente la suma de los
 * cobros. Si no cerrara, el balance del mes quedaría mal y nadie se enteraría.
 */
export function asignarPartesACobros(
  cobros: CobroBeneficiario[],
  partes: ParteDePago[]
): FilaDePago[] {
  // Guarda dura: si los medios no cubren exactamente lo que se cobra, esto
  // devolvia filas por el monto equivocado sin chistar y el descuadre entraba a
  // la base. Hoy el formulario llama antes a validarPartes, pero eso es una
  // promesa del llamador, no del modulo. Con plata se falla fuerte, no callado.
  const totalCobros = (cobros || []).reduce((a, c) => a + (Number(c.monto) || 0), 0);
  const totalPartes = (partes || []).reduce((a, p) => a + (Number(p.monto) || 0), 0);
  if (Math.abs(totalCobros - totalPartes) > TOLERANCIA_CENTAVOS) {
    throw new Error(
      `Los medios de pago suman ${totalPartes} y lo cobrado es ${totalCobros}. ` +
      `No se reparte un pago que no cierra.`
    );
  }

  const filas: FilaDePago[] = [];
  const pendientes = (partes || []).map(p => ({ ...p, restante: Number(p.monto) || 0 }));
  let i = 0;

  for (const cobro of cobros || []) {
    let porCubrir = Number(cobro.monto) || 0;

    while (porCubrir > TOLERANCIA_CENTAVOS && i < pendientes.length) {
      const parte = pendientes[i];
      if (parte.restante <= TOLERANCIA_CENTAVOS) { i++; continue; }

      const toma = Number(Math.min(porCubrir, parte.restante).toFixed(2));
      filas.push({
        cliente_id: cobro.cliente_id,
        mes_correspondiente: cobro.mes_correspondiente,
        monto: toma,
        medio_pago: parte.medio,
        destino_transferencia: parte.destino
      });

      parte.restante = Number((parte.restante - toma).toFixed(2));
      porCubrir = Number((porCubrir - toma).toFixed(2));
    }
  }

  return filas;
}

/**
 * Un pago dividido se guarda como varias filas de pago, una por medio, no como
 * una fila con un campo raro adentro. Así el balance por medio y por destino
 * sigue saliendo de una suma simple y no hay que tocar ningún reporte existente.
 */
export function partesAPagos<T>(
  partes: ParteDePago[],
  base: Omit<T, 'monto' | 'medio_pago' | 'destino_transferencia'>
): Array<T> {
  return (Array.isArray(partes) ? partes : []).map(p => ({
    ...(base as any),
    monto: Number(p.monto),
    medio_pago: p.medio,
    destino_transferencia: p.destino
  })) as Array<T>;
}
