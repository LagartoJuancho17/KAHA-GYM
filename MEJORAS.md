# KAHA GYM — Registro de Mejoras y Bugs

> Auditoría completa de UX/UI y corrección de errores — Junio 2026  
> Perspectivas: Administrador · Profesor/Operador · Socio

---

## 1. Bugs Corregidos

### 1.1 Fechas hardcodeadas (`2026-05`)

El sistema tenía docenas de referencias estáticas al mes `2026-05`, lo que provocaba que filtros, formularios y dashboards mostraran datos vacíos al avanzar el calendario.

| Archivo | Problema | Corrección |
|---|---|---|
| `Dashboard.tsx` | `mesActual = '2026-05'` fijo | `new Date().toISOString().slice(0, 7)` |
| `Dashboard.tsx` | Array de últimos 6 meses hardcodeado | Generación dinámica con `Date` |
| `PagosLog.tsx` | 3 `useState('2026-05')` | `useState(new Date().toISOString().slice(0, 7))` |
| `PagosTable.tsx` | `<option>` de meses estáticas | `generarUltimosMeses(12)` dinámico |
| `PagoFormModal.tsx` | Estado inicial del mes fijo | Mes actual dinámico |
| `PagoCSVImportModal.tsx` | Fallback `'2026-05'` en CSV | Mes actual dinámico |
| `MorososControl.tsx` | `useState('2026-05-10')` | `useState(new Date().toISOString().slice(0, 10))` |
| `GymContext.tsx` | Seed de gastos con fechas de mayo | Fechas calculadas al mes de arranque |
| `GymContext.tsx` | Novedad de profesor con fecha fija | Fecha del día actual |

### 1.2 Clases CSS inválidas

| Clase usada | Problema | Corrección |
|---|---|---|
| `z-35` | No existe en Tailwind v4 | `z-[35]` (valor arbitrario) |
| `text-emerald-850` | Color no estándar | `text-emerald-700` |
| `text-red-650` | Color no estándar | `text-red-600` |
| `text-amber-655` | Color no estándar | `text-amber-600` |

### 1.3 Animaciones CSS faltantes

Los componentes referenciaban clases de animación que no estaban definidas en ningún stylesheet, causando transiciones rotas:

- `animate-scale-in` — usada en `App.tsx` y `SocioPanel.tsx`
- `animate-scale-up` — usada en modales
- `animate-flash-success` — usada en feedback de acciones

**Solución:** Se agregaron los `@keyframes` y clases correspondientes en `src/index.css`.

### 1.4 Cierre de modales con Escape

Ningún modal del sistema respondía a la tecla `Escape`. Impacta directamente la usabilidad. Se agregó el `useEffect` de escucha a:

- `App.tsx` (sidebar + dropdown de notificaciones)
- `Dashboard.tsx` (modal de gastos)
- `PagoFormModal.tsx`
- `ClienteFormModal.tsx`

---

## 2. Mejoras de UX/UI Realizadas

### 2.1 Dashboard

- **KPI cards clicables:** Los cards de "Socios Activos", "Morosos" y "Cobrado este Mes" ahora navegan directamente a la sección correspondiente (CLIENTES, MOROSIDAD, PAGOS).
- **Barra de progreso en cobranza:** El card de porcentaje de cobranza muestra visualmente el progreso del mes.
- **Etiqueta de mes dinámica:** El encabezado muestra el mes actual en español (ej: "junio 2026") en vez de un string fijo.
- **Gráfico de barras:** El eje X ahora muestra nombres abreviados de mes ("Jun", "May") en vez de strings `YYYY-MM` crudos.

### 2.2 Sidebar y Navegación

- **Nuevo logo KAHA GYM:** Diseño más limpio con ícono Shield, nombre en negrita y subtítulo "Panel de Control" en verde.
- **Cierre con Escape:** El sidebar en mobile se cierra con la tecla Escape.
- **Tooltips en nav:** Cada botón de navegación tiene `title` con la descripción del módulo.
- **Estado activo corregido:** El color de nav activo era `text-emerald-850` (inexistente) → ahora `text-emerald-700`.

### 2.3 RoleSwitcher (Simulador de Roles)

- **Label aclarado:** El botón "PROFE" ahora dice "Profesor" y usa el ícono `Dumbbell`.
- **Badge de rol activo:** Muestra el rol actual con color diferenciado (azul/verde/gris).
- **Label "Modo Simulación":** Contexto visual para que el admin sepa que está simulando.
- **Tooltips en botones:** `title` descriptivo en cada rol.

### 2.4 Panel del Socio (SocioPanel)

- **Indicador de tab activa:** Barra verde inferior animada en el tab seleccionado.
- **Badge de clases corregido:** El badge de notificación solo aparece cuando el socio NO está en ese tab (antes parpadeaba siempre).
- **Empty state mejorado:** Sin bounce innecesario; card con barra de gradiente superior.
- **Altura de nav:** Corregida de 68px a 64px para mejor proporciones.

### 2.5 Filtros de Pagos

- **Selectores de mes dinámicos:** Los filtros de mes en Pagos ahora muestran los últimos 12 meses calculados al momento de carga, sin opciones desactualizadas.

---

## 3. Análisis por Perspectiva de Usuario

### 3.1 Vista Admin

**Lo que funciona bien:**
- Dashboard con KPIs claros y navegación directa desde cards
- Registro de pagos múltiples en una sola transacción
- Conciliación CSV de billeteras digitales con detección de duplicados
- Módulo de morosidad con cron simulado y cobro rápido integrado
- Gestión de planes y precios

**Fricciones detectadas (mejoras futuras):**
- Al registrar un pago, el selector de "pagador" muestra toda la lista sin búsqueda. Con más de 50 socios esto se vuelve inmanejable → **implementar autocomplete/combobox**.
- No hay confirmación antes de marcar un cliente como MOROSO manualmente → **agregar diálogo de confirmación**.
- Los gastos del mes se agregan uno por uno sin opción de importar desde CSV → **agregar importación de gastos**.
- No hay exportación de datos (pagos, socios, morosos) a Excel/PDF → **prioridad alta**.
- Las notificaciones del dashboard son estáticas (no se generan en base a eventos reales) → **conectar a lógica de negocio**.

### 3.2 Vista Profesor / Operador

**Lo que funciona bien:**
- Vista de turnos de la semana con estado de cada clase
- Registro de ausencias propias
- Acceso al listado de socios del turno
- Visualización de lista de espera por clase

**Fricciones detectadas (mejoras futuras):**
- El profesor no puede filtrar sus clases por semana o rango de fechas → **agregar selector de semana**.
- No hay forma de dejar notas en un turno (ej: "Clase especial", "Feriado") → **campo de observaciones por turno**.
- El registro de ausencia no genera notificación automática a los socios del turno → **pendiente integración de mensajería**.
- El operador puede ver datos de pagos pero no debería tener ese acceso por defecto → **revisar permisos de rol**.

### 3.3 Vista Socio

**Lo que funciona bien:**
- Panel dedicado con sus clases, próximo pago y estado de cuenta
- Reserva de clase y lista de espera
- Sistema de recupero (make-up classes)
- Enlace directo a Mercado Pago para pagar online

**Fricciones detectadas (mejoras futuras):**
- El socio no puede ver su historial de pagos completo, solo el estado del mes actual → **agregar pestaña "Mis Pagos"**.
- No hay feedback visual cuando el pago por Mercado Pago se procesa → **agregar polling de estado**.
- El panel no muestra el próximo turno con hora y profesor asignado → **mejorar card de "Mi Próxima Clase"**.
- No hay opción de cancelar una reserva desde el panel del socio → **agregar botón de cancelación**.
- El socio no recibe ninguna notificación in-app al ser dado de alta o cuando vence su cuota → **implementar sistema de notificaciones push o in-app**.

---

## 4. Deuda Técnica Identificada

| Área | Problema | Prioridad |
|---|---|---|
| Estado global | Todo en `localStorage` + Context; no escala bien con múltiples tabs | Alta |
| Autenticación | Google OAuth simulado con localStorage; no es real | Alta |
| Búsqueda en selects | Múltiples `<select>` con listas largas sin filtro | Media |
| Formularios | Sin validación Zod/Yup; solo validaciones manuales inline | Media |
| Accesibilidad | Sin atributos ARIA en modales; sin `role="dialog"` | Media |
| Testing | Sin tests unitarios ni de integración | Media |
| Responsive | Algunas vistas (tabla de pagos, morosidad) no están optimizadas para mobile | Baja |
| i18n | Textos hardcodeados en español sin sistema de traducción | Baja |

---

## 5. Mejoras Futuras Recomendadas (Roadmap)

### Corto plazo (sprint 1–2)
- [ ] Exportación de reportes a CSV y PDF (pagos, morosos, socios)
- [ ] Autocomplete/combobox en selectors de socios
- [ ] Historial de pagos en el panel del socio
- [ ] Cancelación de reservas desde el panel del socio
- [ ] Confirmar acciones destructivas con diálogo

### Mediano plazo (sprint 3–5)
- [ ] Migrar de `localStorage` a Supabase (migrations ya preparadas)
- [ ] Autenticación real con Google OAuth (Supabase Auth)
- [ ] Notificaciones push por vencimiento de cuota
- [ ] Filtro de semana en vista del profesor
- [ ] Notas por turno (campo de observaciones)
- [ ] Integración real con Mercado Pago API (webhook de confirmación)

### Largo plazo
- [ ] App mobile nativa o PWA instalable
- [ ] Reportes avanzados con gráficos por período
- [ ] Módulo de comunicación interna (mensajes a socios desde el panel)
- [ ] Gestión de múltiples sedes

---

*Documento generado automáticamente durante la auditoría de UX/UI — KAHA GYM — Junio 2026*
