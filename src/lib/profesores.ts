// src/lib/profesores.ts
import { Profesor, NovedadProfesor } from '../types';

export const DEFAULT_PROFESORES: Profesor[] = [
  {
    id: 'prof-1',
    nombre: 'Juanchi',
    email: 'jmferrariprofe@gmail.com',
    telefono: '11-3803-2652',
    valor_hora: 2500,
    activo: true
  },
  {
    id: 'prof-2',
    nombre: 'Rulo',
    email: 'ianvelazquez97@gmail.com',
    telefono: '11-4455-6677',
    valor_hora: 2500,
    activo: true
  },
  {
    id: 'prof-3',
    nombre: 'Lucas',
    email: 'lucasobueno@live.com',
    telefono: '11-8899-0011',
    valor_hora: 2200,
    activo: true
  },
  {
    id: 'prof-4',
    nombre: 'Denise',
    email: 'denisetomatis@gmail.com',
    telefono: '11-7788-9900',
    valor_hora: 2200,
    activo: true
  },
  {
    id: 'prof-5',
    nombre: 'Christian Martínez',
    email: 'christian.martinez04@hotmail.com',
    telefono: '',
    valor_hora: 2200,
    activo: true
  }
];

export interface AuditLogProfesorInput {
  id?: string;
  accion: string;
  detalles: any;
  creado_at: string;
  usuario_email?: string;
}

export function buscarProfesorActivoPorEmail(
  email: string,
  profesores: Profesor[] = []
): Profesor | null {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return null;

  const listaCombinada = [...profesores, ...DEFAULT_PROFESORES];
  for (const p of listaCombinada) {
    if (p && p.activo !== false && (p.email || '').trim().toLowerCase() === clean) {
      return p;
    }
  }
  return null;
}

export function validarPasswordProfesor(
  pass: string,
  profesor?: Profesor | null
): boolean {
  const cleanPass = (pass || '').trim();
  if (!cleanPass) return false;

  // Contraseñas por defecto válidas para profesores y socios
  const defaults = new Set([
    'profe123',
    'kaha2026',
    'profe',
    'kaha1234',
    '123456',
    '1234'
  ]);
  if (defaults.has(cleanPass.toLowerCase()) || defaults.has(cleanPass)) {
    return true;
  }

  if (profesor?.password && profesor.password.trim() === cleanPass) {
    return true;
  }

  const cleanPhone = (profesor?.telefono || '').replace(/\D/g, '');
  const passDigits = cleanPass.replace(/\D/g, '');
  if (
    cleanPhone.length >= 6 &&
    passDigits.length >= 4 &&
    (cleanPhone === passDigits || cleanPhone.endsWith(passDigits) || passDigits.endsWith(cleanPhone))
  ) {
    return true;
  }

  return false;
}

export function reconstruirProfesoresDesdeAuditLogs(params: {
  logs: AuditLogProfesorInput[];
  profesoresLocales?: Profesor[];
  novedadesLocales?: NovedadProfesor[];
}): {
  profesores: Profesor[];
  novedadesProfesores: NovedadProfesor[];
} {
  const { logs = [], profesoresLocales = [], novedadesLocales = [] } = params;

  const logsOrdenados = [...logs].sort((a, b) =>
    String(a.creado_at || '').localeCompare(String(b.creado_at || ''))
  );

  const profMap = new Map<string, Profesor>();
  DEFAULT_PROFESORES.forEach(p => profMap.set(p.id, { ...p }));

  for (const p of profesoresLocales) {
    if (!p || !p.id) continue;
    // Evitar pisar los emails reales de los profes por defecto con emails ficticios viejos (@gimnasio.com.ar)
    const def = DEFAULT_PROFESORES.find(d => d.id === p.id);
    const emailFinal =
      def && (!p.email || p.email.endsWith('@gimnasio.com.ar'))
        ? def.email
        : p.email;
    profMap.set(p.id, { ...p, email: emailFinal });
  }

  for (const log of logsOrdenados) {
    const det = log.detalles || {};
    if (log.accion === 'PROFESOR_REGISTRADO') {
      const profObj = det.profesor as Profesor | undefined;
      const id = profObj?.id || det.id;
      const nombre = (profObj?.nombre || det.nombre || '').trim();
      if (!nombre) continue;
      const resolvedId = id || `prof-${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const existente = profMap.get(resolvedId);
      profMap.set(resolvedId, {
        id: resolvedId,
        nombre,
        email: (profObj?.email ?? det.email ?? existente?.email ?? '').trim(),
        telefono: (profObj?.telefono ?? det.telefono ?? existente?.telefono ?? '').trim(),
        valor_hora: Number(profObj?.valor_hora ?? det.valor_hora ?? existente?.valor_hora ?? 2200),
        activo: profObj?.activo !== false && det.activo !== false,
        password: profObj?.password ?? det.password ?? existente?.password
      });
    } else if (log.accion === 'PROFESOR_MODIFICADO') {
      const id = det.id;
      const updates = det.updates || det.profesor || {};
      if (id && profMap.has(id)) {
        const actual = profMap.get(id)!;
        profMap.set(id, { ...actual, ...updates });
      }
    } else if (log.accion === 'PROFESOR_ELIMINADO') {
      const id = det.id;
      if (id && profMap.has(id)) {
        const actual = profMap.get(id)!;
        profMap.set(id, { ...actual, activo: false });
      }
    }
  }

  // Deduplicar por email (si un profesor fue dado de alta dos veces con el mismo email, conservar el más reciente activo)
  const porEmail = new Map<string, string>();
  for (const p of profMap.values()) {
    const cleanEmail = (p.email || '').trim().toLowerCase();
    if (!cleanEmail) continue;
    const prevId = porEmail.get(cleanEmail);
    if (prevId && prevId !== p.id) {
      // Conservar el registro personalizado si el anterior era default o viceversa, unificando estado activo
      const prev = profMap.get(prevId)!;
      profMap.set(prevId, {
        ...prev,
        ...p,
        id: prevId
      });
      profMap.delete(p.id);
    } else {
      porEmail.set(cleanEmail, p.id);
    }
  }

  // Novedades de profesores
  const novMap = new Map<string, NovedadProfesor>();
  for (const n of novedadesLocales) {
    if (n && n.id) novMap.set(n.id, { ...n });
  }
  for (const log of logsOrdenados) {
    const det = log.detalles || {};
    if (log.accion === 'NOVEDAD_PROFESOR_REGISTRADA' && det.novedad?.id) {
      novMap.set(det.novedad.id, det.novedad);
    } else if (log.accion === 'NOVEDAD_PROFESOR_ELIMINADA' && det.id) {
      novMap.delete(det.id);
    }
  }

  return {
    profesores: Array.from(profMap.values()),
    novedadesProfesores: Array.from(novMap.values()).sort((a, b) =>
      String(b.creado_at || '').localeCompare(String(a.creado_at || ''))
    )
  };
}
