# 🏋️‍♂️ KAHA GYM & BOX — Sistema Integral de Gestión Deportiva y Financiera 🇦🇷

> **Software comercial full-stack de alto rendimiento diseñado específicamente para la operativa diaria de gimnasios, boxes de CrossFit y centros de entrenamiento funcional en Argentina.**
> Combina gestión de turneros en tiempo real, listas de espera inteligentes, cobranzas automatizadas por WhatsApp, conciliación bancaria multicuenta, cálculo de liquidaciones a entrenadores y portal de autoservicio para socios.

---

## 📑 Tabla de Contenidos

1. [Visión General del Sistema](#-visión-general-del-sistema)
2. [Stack Tecnológico y Arquitectura](#-stack-tecnológico-y-arquitectura)
3. [Roles y Permisos de Usuario (RBAC)](#-roles-y-permisos-de-usuario-rbac)
4. [Módulo 1: Gestión Integral de Socios (Clientes)](#-módulo-1-gestión-integral-de-socios-clientes)
5. [Módulo 2: Sistema de Turnos, Cupos y Horarios](#-módulo-2-sistema-de-turnos-cupos-y-horarios)
6. [Módulo 3: Exportación de Turneras en Imagen de Alta Resolución](#-módulo-3-exportación-de-turneras-en-imagen-de-alta-resolución)
7. [Módulo 4: Finanzas, Tesorería y Pagos](#-módulo-4-finanzas-tesorería-y-pagos)
8. [Módulo 5: Gastos y Egresos del Gimnasio](#-módulo-5-gastos-y-egresos-del-gimnasio)
9. [Módulo 6: Liquidación de Sueldos a Profesores](#-módulo-6-liquidación-de-sueldos-a-profesores)
10. [Módulo 7: Balance General, Compensación y Facturación](#-módulo-7-balance-general-compensación-y-facturación)
11. [Módulo 8: Control de Morosidad y Ronda de Cobranzas](#-módulo-8-control-de-morosidad-y-ronda-de-cobranzas)
12. [Módulo 9: Planes, Precios y Estructura Arancelaria](#-módulo-9-planes-precios-y-estructura-arancelaria)
13. [Módulo 10: Proyecciones e Inteligencia del Negocio](#-módulo-10-proyecciones-e-inteligencia-del-negocio)
14. [Módulo 11: Portal de Autoservicio del Socio](#-módulo-11-portal-de-autoservicio-del-socio)
15. [Módulo 12: Novedades, Feriados y Comunicaciones](#-módulo-12-novedades-feriados-y-comunicaciones)
16. [Módulo 13: Auditoría y Trazabilidad Operativa](#-módulo-13-auditoría-y-trazabilidad-operativa)
17. [Automatizaciones en la Nube (Edge Functions & Cron Jobs)](#-automatizaciones-en-la-nube-edge-functions--cron-jobs)
18. [Guía de Instalación y Puesta en Marcha](#-guía-de-instalación-y-puesta-en-marcha)

---

## 🌟 Visión General del Sistema

**KAHA GYM** resuelve de punta a punta los problemas neurálgicos de un centro deportivo argentino:
- **No más cupos desbordados ni planillas de papel**: Control en tiempo real con semáforos de saturación y suplentes automáticos.
- **Cobranzas claras en contexto inflacionario**: Aranceles flexibles, cobros multimedio (ej. mitad efectivo, mitad transferencia), pagos divididos y comprobantes oficiales para WhatsApp.
- **Separación de cuentas bancarias de los dueños**: Registro y compensación contable exacta entre la cuenta de **Juanchi**, la de **Rulo** y el **Efectivo de Caja**.
- **Gestión humana del ausentismo**: Sistema de cupones de recupero por inasistencia y congelamientos por reposo médico sin generar deudas fantasmas.

---

## 🛠️ Stack Tecnológico y Arquitectura

- **Frontend**:
  - [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - [Vite 6](https://vitejs.dev/) como empaquetador ultrarrápido con ESM nativo
  - [Tailwind CSS v4](https://tailwindcss.com/) para estilos utilitarios modernos y diseño responsivo
  - [Lucide React](https://lucide.dev/) para iconografía consistente
  - [HTML5 Canvas 2D](https://developer.mozilla.org/es/docs/Web/API/Canvas_API) para generación nativa de flyers e imágenes en alta resolución (2x Retina)
- **Backend & Base de Datos**:
  - [PostgreSQL](https://www.postgresql.org/) en [Supabase](https://supabase.com/) con esquemas relacionales, claves foráneas e integridad referencial
  - **Row Level Security (RLS)** para seguridad granular a nivel de fila según el rol de autenticación
  - [Supabase Edge Functions](https://supabase.com/docs/guides/functions) escritas en **TypeScript / Deno**
  - **pg_cron** para tareas programadas automáticas (cierre de mes, detección de morosos, recordatorios por email)
- **Integraciones Externas**:
  - **Mercado Pago Checkout API**: Cobro online de cuotas con webhook y retorno parametrizado
  - **WhatsApp Click-to-Chat API**: Envío de recibos digitales y recordatorios de vencimiento con normalización de números telefónicos argentinos (`+54 9...`)
  - **Google Identity Services**: Inicio de sesión seguro con Google OAuth 2.0
- **Resiliencia Local (Dual-Mode)**:
  - Motor reactivo montado sobre Context API y persistencia en `localStorage`. Si la base de datos remota no está configurada o se interrumpe la conexión, el sistema continúa funcionando en modo local sin bloquear la operativa del gimnasio.

---

## 👥 Roles y Permisos de Usuario (RBAC)

El sistema incorpora control de acceso basado en roles con selector de entorno:

| Rol | Alcance y Funcionalidades |
| :--- | :--- |
| **ADMIN** | Control total: altas/bajas de socios, edición de precios y planes, gestión financiera completa (ingresos, egresos, balance, compensaciones), modificación de cupos, auditoría y configuración general. |
| **OPERADOR** | Personal de recepción: registro de asistencias, altas de socios, cobro de cuotas, emisión de recibos por WhatsApp y asignación de turnos. Restringido para ver compensaciones de dueños o modificar precios base. |
| **PROFESOR** | Acceso a la grilla de turnos asignados a su cargo, listado de alumnos presentes/ausentes en cada horario y consulta de liquidación mensual personal. |
| **SOCIO** | Portal exclusivo de autoservicio: consulta de su estado de cuenta, aviso de faltas, reserva de clases flexibles, canje de recuperos, pago de cuota online y visualización de novedades. |

---

## 👤 Módulo 1: Gestión Integral de Socios (Clientes)

### 1. Ficha del Socio y Datos Clínico-Deportivos
- **Datos obligatorios**: Nombre, apellido, DNI, teléfono, email, fecha de ingreso.
- **Detección inteligente de duplicados**: Algoritmo de aproximación (*Fuzzy Match*) que advierte si se intenta registrar una persona con similitud en nombre, apellido o DNI existente.
- **Categorización**:
  - `FIJO`: Socio con días y horarios reservados formalmente en la semana.
  - `FLEXIBLE`: Socio con pase libre o reservas clase a clase según disponibilidad.

### 2. Estados de Membresía y Ciclo de Vida
El sistema administra 6 estados dinámicos:
1. `AL_DIA`: Cuota del mes saldada, acceso habilitado a todas sus clases.
2. `CON_DEUDA`: Período de gracia (del 1 al 5 del mes o prórroga activa) donde aún no pagó pero conserva su lugar en la turnera.
3. `MOROSO`: Venció la fecha límite de pago (día 10 a las 23:59hs) sin regularizar. Se activa el protocolo de cobranza y se libera su lugar en los turnos para la lista de espera.
4. `BECADO`: Socio con permiso especial de la dirección cuyo pasivo ha sido perdonado formalmente mediante acción de auditoría.
5. `PAUSADO`: Membresía suspendida temporalmente por un mes específico (ej. viajes). **Libera los cupos en la turnera de ese mes pero conserva reservado su lugar en la Matriz Fija** para cuando retome.
6. `EN_REPOSO`: Congelamiento médico formal por lesión o fuerza mayor.

### 3. Membresías y Aranceles Personalizados
- Soporte para **precios diferenciados**: si un socio tiene un acuerdo especial o descuento de grupo familiar, se le define un precio fijo mensual que prevalece sobre el valor del plan general.
- Soporte para **días personalizados**: posibilidad de asignar una cantidad de días distinta a la especificada por defecto en el plan.

### 4. Protocolo de Reposo Médico (Congelamiento de 6 Meses)
- Diseñado para socios lesionados o embarazadas.
- **Vigencia**: Exactamente 6 meses a partir de la fecha de alta médica del reposo.
- **Impacto automático**:
  - No se le computa cuota mensual ni genera deuda morosa durante todo el período.
  - Los turnos fijos asignados se liberan inmediatamente para socios en lista de espera.
  - La ficha se conserva intacta con una etiqueta visual que indica cuántos días restan de reposo.
  - Al vencer los 6 meses, el sistema alerta al administrador para su reactivación o baja definitiva.

### 5. Autorización de Nuevos Socios (Self-Onboarding)
- Los alumnos pueden ingresar a la web, iniciar sesión con su cuenta de Google y completar su solicitud de ingreso.
- El administrador recibe la solicitud en la pestaña de **Pendientes de Autorización**, donde revisa los datos, asigna el plan correspondiente, configura sus turnos fijos y autoriza el ingreso con un solo clic.

### 6. Importación y Exportación Masiva en CSV
- Permite migrar cientos de alumnos desde Excel u otros sistemas en segundos.
- Valida campos requeridos, normaliza teléfonos y genera contraseñas y fichas iniciales automáticamente.
- Exportación total con un clic para respaldos externos.

---

## 📅 Módulo 2: Sistema de Turnos, Cupos y Horarios

### 1. Estructura de Horarios Oficial
La grilla semanal contempla **13 franjas horarias** de Lunes a Viernes:

| Horario | Lunes | Martes | Miércoles | Jueves | Viernes |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **07:30** | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) |
| **08:30** | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) |
| **09:30** | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) |
| **10:30** | Dictado (Cupo 7) | Dictado (Cupo 5) | Dictado (Cupo 7) | Dictado (Cupo 5) | Dictado (Cupo 7) |
| **11:30** | Dictado (Cupo 5) | *Sin clase* | Dictado (Cupo 5) | *Sin clase* | Dictado (Cupo 5) |
| **12:00** | Dictado (Cupo 3) | Dictado (Cupo 7) | *Sin clase* | Dictado (Cupo 7) | Dictado (Cupo 3) |
| **15:00** | *Sin clase* | Dictado (Cupo 7) | *Sin clase* | Dictado (Cupo 7) | Dictado (Cupo 7) |
| **16:00** | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) |
| **17:00** | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) |
| **18:00** | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) |
| **19:00** | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) |
| **20:00** | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) | Dictado (Cupo 7) |
| **21:00** | Dictado (Cupo 8) | Dictado (Cupo 8) | Dictado (Cupo 8) | Dictado (Cupo 8) | Dictado (Cupo 8) |

### 2. Dos Vistas Especializadas

#### A. Matriz Fija Semanal
- Representa la estructura contractual del gimnasio.
- Asigna a cada alumno sus turnos fijos recurrentes (ej. *Lunes y Miércoles 19:00 hs*).
- Indica vacantes disponibles, cupo máximo por turno y profesor titular a cargo.
- Permite modificar el cupo máximo o reasignar el entrenador con un clic.

#### B. Turnera de Tiempo Real Semanal
- Calcula día por día la ocupación efectiva para la semana visualizada.
- Navegación entre semanas: Semana en curso, Anterior, Siguiente o retorno dinámico.
- Desglose detallado dentro de cada casillero:
  - **F**: Socios Fijos activos confirmados para ese día puntual.
  - **V**: Socios Variables que reservaron ese lugar como clase libre.
  - **R**: Alumnos que están usando un cupón de recupero.
  - **W**: Cantidad de personas esperando en Lista de Espera (*Waitlist*).
  - **Coach**: Nombre del profesor asignado a la clase.

### 3. Semáforo Inteligente de Saturación
Cada casillero se colorea automáticamente según la capacidad utilizada:
- 🟢 **Verde (Libre - Ocupación < 70%)**: Espacio disponible para reservas libres o recuperos.
- 🟡 **Amarillo (Saturación - 70% a 89%)**: Turno próximo a completarse.
- 🔴 **Rojo (Lleno - ≥ 90% a 100%)**: Cupo agotado. Nuevos registros ingresan como suplentes en lista de espera.

### 4. Lista de Espera y Promoción Automática
- Si un socio desea entrenar en un horario saturado, el sistema lo inscribe en la lista de espera con orden de llegada.
- **Ascenso automático**: En el instante en que un socio fijo avisa que no asiste o cancela su clase, el sistema promueve automáticamente al primer suplente de la lista, asignándole la vacante y notificándolo por pantalla y correo electrónico.
- **Socios con Prioridad**: Módulo especial (`SociosPrioritariosModal`) para marcar socios que tienen prioridad de pase al inicio de la lista de espera de un turno determinado.

### 5. Consola de Inasistencias, Vacaciones y Recuperos
- **Aviso de Inasistencia**: Tanto el administrador como el propio socio desde su portal pueden dar de baja una asistencia puntual.
- **Carga de Vacaciones en Lote**: Permite seleccionar un alumno y un rango de fechas completas en el calendario (ej. 2 semanas completas de vacaciones). El sistema suspende automáticamente todas sus clases fijas de ese período, libera decenas de cupos para otros alumnos y emite un cupón de recupero por cada clase liberada.
- **Vigencia del Cupón de Recupero**: Cada cupón generado tiene una validez estricta de **30 días corridos**. Puede reprogramarse en cualquier otro horario de la semana que tenga vacantes libres.

---

## 📸 Módulo 3: Exportación de Turneras en Imagen de Alta Resolución

Para facilitar la comunicación con los alumnos en redes sociales y grupos de WhatsApp, el sistema cuenta con un motor nativo de exportación gráfica ([TurnoExportModal.tsx](file:///Users/tobiasarraiza/MiMacToto/Proyectos/Gestión-de-Gimnasio-Argentina/src/components/Turnos/TurnoExportModal.tsx)):

- **Renderizado 2x Retina (1440 × 1180 px)**: Utiliza HTML5 Canvas de alto rendimiento sin bibliotecas pesadas de terceros. El resultado es un gráfico vectorizado, ultra nítido y legible en teléfonos y pantallas 4K.
- **Muestra todos los 13 horarios sin cortes**: A diferencia de capturas de pantalla comunes, la imagen exportada genera la tabla completa desde las 07:30 hasta las 21:00 hs sin barras de desplazamiento.
- **Dos modalidades de exportación**:
  1. 📅 **Turnera Semanal (Tiempo Real)**: con fechas exactas del lunes al viernes, ocupación en vivo, desglose de fijos/variables/recuperos y profesores.
  2. 📋 **Matriz Fija Semanal**: con alumnos fijos asignados y vacantes regulares.
- **Estilos Visuales**:
  - **Modo Oscuro (*KAHA Dark*)**: Estilo estético premium con fondo grafito/negro y acentos en verde lima, ideal para estados de WhatsApp e Instagram.
  - **Modo Claro (*Print Ready*)**: Fondo blanco de alto contraste para impresión en papel o envío formal en PDF.
- **Acciones Rápidas**:
  - 📥 **Descargar Imagen PNG**: Guarda el archivo directamente en la computadora o celular.
  - 📋 **Copiar al Portapapeles**: Copia la imagen directamente a la memoria para pegarla con `Ctrl+V` / `Cmd+V` en WhatsApp Web sin tener que buscar el archivo descargado.

---

## 💳 Módulo 4: Finanzas, Tesorería y Pagos

### 1. Registro de Cobranzas y Medios de Pago
- Admite tres vías de pago principales:
  - `EFECTIVO` (físico en recepción)
  - `TRANSFERENCIA` (bancaria o billetera virtual)
  - `MERCADO_PAGO` (online o link de pago)
- Imputación a mes correspondiente (ej. `2026-05`).
- Al seleccionar al socio, autocompleta el monto sugerido según su plan o su precio personalizado pactado.

### 2. Separación de Destinos Bancarios
Para gimnasios con cuentas bancarias independientes entre socios, cada ingreso se clasifica en:
- `JUANCHI`: Transferencias recibidas en la cuenta bancaria de Juanchi.
- `RULO`: Transferencias recibidas en la cuenta bancaria de Rulo.
- `EFECTIVO`: Dinero en mano en la caja registradora del gimnasio.
- Permite actualizar el destino de un pago con un solo clic desde la tabla.

### 3. Pagos Divididos (Multimedio)
- Resuelve situaciones reales donde el socio abona una parte en efectivo y otra por transferencia bancaria (ej. $15.000 en efectivo y $25.000 por transferencia).
- Valida que la suma de las partes cierre al centavo contra el arancel total.
- Genera automáticamente los registros independientes en cada caja contable vinculados al mismo pago.

### 4. Pagos Múltiples y Pago Adelantado
- Permite a un alumno saldar varios meses juntos o adelantar cuotas consecutivas.
- El sistema sugiere automáticamente los meses correlativos y disminuye acumulativamente la deuda del socio en cada paso.

### 5. Generador de Recibos Digitales para WhatsApp
- Emite comprobantes formales con el detalle del pago, monto en pesos argentinos, mes cancelado, turnos fijos asignados y recordatorio de baja de turnos.
- Botón directo que abre WhatsApp Web o la App oficial con el texto precargado y listo para enviar al número del alumno.

### 6. Conciliación Automática de Extractos Bancarios en CSV
- Herramienta para subir extractos descargados de Mercado Pago, Santander, Galicia o Ualá.
- Cruza importes, fechas y nombres para conciliar automáticamente los pagos pendientes y detectar cobranzas no registradas.

---

## 📉 Módulo 5: Gastos y Egresos del Gimnasio

Ubicado en la sub-pestaña **Egresos** de Finanzas:

### 1. Métricas en Tiempo Real (KPIs)
- **Total Egresos del período**.
- **Desglose de origen de fondos**: Total pagado con transferencias de Juanchi, total con transferencias de Rulo y total pagado desde el Efectivo de Caja.

### 2. Categorías de Gastos
- `ALQUILER`: Alquiler del salón, expensas y cánones inmobiliarios.
- `SERVICIOS`: Luz, gas, agua, internet, software y sistemas.
- `INSUMOS`: Elementos de limpieza, reposición de magnesio, bandas, tizas y discos.
- `PROFESORES`: Honorarios profesionales o adelantos de sueldos.
- `OTROS`: Gastos de mantenimiento y reparaciones varias.

### 3. Edición y Mantenimiento de Gastos
- Cada gasto registrado cuenta con botón de **edición (ícono de lápiz)** y **eliminación (ícono de papelera)**.
- El modal permite rectificar concepto, importe, fecha, categoría y quién efectuó el gasto.
- Los cambios se impactan de inmediato en el balance general y en el registro inmutable de auditoría.

### 4. Ordenamiento Multicriterio
- **Selector desplegable y cabeceras clickeables** para ordenar por:
  - **Alfabético**: A - Z y Z - A por concepto.
  - **Monto**: Menor a mayor ($) y Mayor a menor ($).
  - **Categoría**: Agrupación por rubro.
  - **Fecha**: Más recientes primero o más antiguos.
- Cabecera limpia y optimizada (se eliminó la columna innecesaria de "registrado por").

---

## 🧑‍🏫 Módulo 6: Liquidación de Sueldos a Profesores

Ubicado en la sub-pestaña **Liquidación**:

### 1. Cálculo Automatizado de Clases Dictadas
- El sistema cruza los turnos que tiene asignados cada profesor en la Matriz Fija contra los días hábiles del mes calendario (contando exactamente cuántos lunes, martes, miércoles, jueves y viernes hubo en ese mes).
- Multiplica las clases teóricas por el **Valor por Hora** configurado en el perfil de cada profesor.

### 2. Novedades y Reemplazos entre Profesores
- Permite cargar novedades del mes:
  - `AUSENCIA`: Profesor que faltó a su turno asignado. Se descuenta automáticamente de su haber.
  - `REEMPLAZO`: Profesor suplente que cubrió la clase del titular ausente. Se le suma automáticamente la hora dictada a su liquidación.
- Emite el resumen neto final a pagar a cada profesor al cierre del mes.

---

## ⚖️ Módulo 7: Balance General, Compensación y Facturación

Ubicado en la sub-pestaña **Balance**:

### 1. Estado de Resultados Mensual
- **Ingresos Totales**: Suma de todas las cuotas y cobros externos.
- **Egresos Totales**: Suma de gastos y liquidaciones.
- **Resultado Operativo Neto**: Superávit o déficit del mes en pesos argentinos.

### 2. Compensación Cruzada entre Socios Propietarios (Juanchi vs. Rulo)
- Resuelve la asimetría de fondos cuando los alumnos pagan en cuentas bancarias distintas y cada dueño solventa diferentes gastos de su propio bolsillo:
  - Total cobrado en cuenta Juanchi vs cuenta Rulo.
  - Total de gastos abonados por Juanchi vs Rulo.
  - **Fórmula de Compensación Exacta**: Calcula quién le debe a quién y el importe exacto a transferir para que ambos socios queden en paridad de aportes y retiros (50% / 50% o porcentaje acordado).

### 3. Modo Privacidad (Ofuscamiento de Cifras)
- Botón con ícono de ojo para **ocultar cifras monetarias** (`$ •••••••`).
- Permite operar la pantalla en el mostrador del gimnasio a la vista de los alumnos sin revelar la recaudación, balances o gastos del establecimiento.

### 4. Módulo de Facturación Rulo
- Resumen fiscal para el seguimiento de la facturación en blanco de la caja de Rulo:
  - Cálculo de topes de facturación de Monotributo / IVA.
  - Imputación de comprobantes fiscales emitidos.

---

## 🚨 Módulo 8: Control de Morosidad y Ronda de Cobranzas

### 1. Reglas de Vencimiento de Cuotas
- **Días 1 al 5 del mes**: Período normal de cobranza. El socio no figura como deudor moroso si estuvo al día el mes anterior.
- **Día 6 al 9 del mes**: El socio pasa al estado de cobro pendiente. Se le envía un recordatorio amistoso con la fecha límite de pago.
- **Día 10 a las 23:59 hs**: **Corte definitivo de cupos**. Si el socio no abonó, su estado pasa a `MOROSO` y **sus turnos fijos se liberan automáticamente** para los suplentes de la lista de espera.

### 2. Ronda de Recordatorios por WhatsApp
- Panel interactivo para enviar recordatorios masivos o individuales sin salir de la web.
- **Normalización de Teléfonos Celulares**: Limpia caracteres raros, espacios, guiones y antepone automáticamente el código internacional argentino `+54 9` (omitiendo el `0` de prefijo local y el `15`), garantizando que WhatsApp abra la conversación sin errores.
- **Mensajes Dinámicos Contextuales**:
  - *Antes del día 10*: Notifica la cuota adeudada con recordatorio de la fecha límite para conservar su lugar.
  - *A partir del día 10*: Informa amablemente que la fecha expiró, que su turno fue liberado para la lista de espera y los medios de pago para regularizar su ficha.

### 3. Acciones de Mitigación de Deuda
Desde el panel de morosidad, el administrador puede aplicar con un clic:
- 💰 **Cobrar Cuota**: Abre el modal de pago imputando la deuda exacta.
- 🎁 **Perdonar Deuda (Becar)**: Pasa al socio a estado Becado justificando la excepción.
- ⏳ **Prorrogar 1 Semana**: Otorga 7 días de gracia adicionales conservando sus turnos fijos.
- ⏸️ **Pausar Socio**: Pausa la membresía durante el mes corriente sin generar mora.
- 🩺 **Poner en Reposo**: Activa el congelamiento médico por 6 meses.

---

## 🏷️ Módulo 9: Planes, Precios y Estructura Arancelaria

Ubicado en la pestaña **Planes**:
- Abonos estructurados por frecuencia semanal:
  - **Plan 2 Días**: 2 clases semanales fijas.
  - **Plan 3 Días**: 3 clases semanales fijas.
  - **Plan 4 Días**: 4 clases semanales fijas.
  - **Plan 5 Días (Pase Libre)**: Entrenamiento ilimitado de lunes a viernes.
- **Actualización de Aranceles No Retroactiva**:
  - Al actualizar el valor de un plan, el nuevo precio aplica exclusivamente para las cuotas futuras y nuevos socios.
  - Respeta los contratos vigentes y pagos adelantados de socios que ya hayan congelado su tarifa.
- Estadísticas por plan: porcentaje de la masa societaria inscripta en cada categoría e ingresos proyectados.

---

## 📈 Módulo 10: Proyecciones e Inteligencia del Negocio

Ubicado en la pestaña **Proyecciones**:
- **Escenarios de Recaudación**:
  - *Escenario Óptimo (100% cobro)*: Ingresos teóricos máximos con cobranza perfecta.
  - *Escenario Esperado (75% cobro)*: Estimación realista con margen de morosidad.
  - *Escenario Pesimista (50% cobro)*: Piso mínimo de liquidez para cobertura de costos fijos.
- **Capacidad Vendida vs. Instalada**:
  - Cálculo de la tasa de ocupación global del establecimiento.
  - Identificación de horarios saturados (donde conviene elevar cupos o agregar entrenadores) y horarios valle (donde conviene ofrecer promociones específicas).

---

## 📱 Módulo 11: Portal de Autoservicio del Socio

Diseñado para que los alumnos operen desde su celular de forma autónoma:

1. **Ingreso con Google OAuth o Email**: El alumno inicia sesión y visualiza únicamente su información personal.
2. **Tablero de Estado**:
   - Estado de cuenta (Al día / Con deuda pendiente).
   - Sus turnos fijos semanales confirmados.
   - Cantidad de cupones de recupero disponibles y sus fechas de vencimiento.
3. **Aviso de Ausencia en 1 Clic**: El socio avisa que faltará a una clase con antelación, lo que libera el lugar en la turnera comunitaria y le acredita inmediatamente un cupón de recupero.
4. **Reserva de Clases y Recuperos**: Explora los días y horarios que tienen lugares vacíos y agenda su recupero sin necesidad de escribirle por WhatsApp a los dueños.
5. **Pago de Cuota Online con Mercado Pago**: Botón directo de pago que procesa la transacción mediante la pasarela de Mercado Pago y actualiza la base de datos automáticamente al completarse el pago.
6. **Notificación de Ascenso en Lista de Espera**: Si el alumno estaba en lista de espera y se liberó un lugar, al ingresar a la web un modal celebratorio le confirma que fue promovido y su horario ya está reservado.

---

## 📢 Módulo 12: Novedades, Feriados y Comunicaciones

Ubicado en la pestaña **Novedades**:
- Cartelera digital donde la administración publica avisos clave:
  - Feriados nacionales y días sin actividad.
  - Horarios especiales de fin de año o verano.
  - Torneos internos, capacitaciones y eventos.
  - Promociones de indumentaria y suplementos.
- Las novedades se ordenan cronológicamente y se destacan en el panel principal de los socios.

---

## 🛡️ Módulo 13: Auditoría y Trazabilidad Operativa

Ubicado en la pestaña **Auditoría**:
- **Log Inmutable de Operaciones**: Cada acción sensible ejecutada en la plataforma queda registrada con:
  - Tipo de evento (ej. `PAGO_REGISTRADO`, `PAGO_EDITADO`, `PAGO_ELIMINADO`, `GASTO_ACTUALIZADO`, `SOCIO_DADO_DE_BAJA`, `DEUDA_PERDONADA`, `TURNO_ASIGNADO`).
  - Usuario operador responsable (email de quien lo ejecutó).
  - Fecha y hora exacta según el huso horario de Argentina (`America/Argentina/Buenos_Aires`).
  - Carga útil (*payload*) con los valores anteriores y los nuevos valores guardados.
- Buscador en tiempo real de logs para auditorías de caja o resolución de controversias con alumnos.

---

## ☁️ Automatizaciones en la Nube (Edge Functions & Cron Jobs)

El directorio `/supabase` contiene la infraestructura de backend lista para producción:

1. **`check-morosidad` (Supabase Edge Function en Deno)**:
   - Se ejecuta diariamente mediante `pg_cron` a las 00:01 hs.
   - Evalúa los vencimientos del mes, actualiza estados a `CON_DEUDA` o `MOROSO` y libera cupos de turnos fijos a partir del día 10.
2. **`send-monthly-email` (Supabase Edge Function)**:
   - Envío automatizado de avisos de cuota e inicio de mes a la casilla de correo de los socios activos.
3. **Migraciones SQL Secuenciales**:
   - `001_initial_schema.sql`: Tablas relacionales con integridad referencial.
   - `002_rls_policies.sql`: Políticas de seguridad RLS segregadas por rol de usuario.
   - `003_seed_data.sql`: Carga inicial de turnos y planes base.
   - `004` a `021`: Migraciones incrementales con funciones de base de datos, triggers y conciliación externa.

---

## 🚀 Guía de Instalación y Puesta en Marcha

### Requisitos Previos
- **Node.js** v18 o superior instalado.
- Gestor de paquetes `npm` (incluido con Node).

### 1. Clonar e Instalar Dependencias
```bash
# Ingresar al directorio del proyecto
cd Gestión-de-Gimnasio-Argentina

# Instalar dependencias
npm install
```

### 2. Configurar Variables de Entorno (Opcional para modo Nube)
Si deseas conectar el sistema a tu proyecto físico de Supabase y Mercado Pago:
```bash
cp .env.example .env
```
Completa las claves en el archivo `.env`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_MP_ACCESS_TOKEN=tu-access-token-de-mercadopago
```
> *Nota: Si no se configuran credenciales en el archivo `.env`, la aplicación se inicializará automáticamente en **Modo Simulación Local Reactivo**, permitiendo probar la totalidad de las funciones con datos cargados en memoria y `localStorage`.*

### 3. Ejecutar en Modo Desarrollo
```bash
npm run dev
```
La aplicación se levantará en `http://localhost:3000` con recarga en caliente (*Hot Module Replacement*).

### 4. Ejecutar Pruebas Automatizadas
El repositorio cuenta con una suite completa de más de 250 pruebas unitarias y de integración que validan reglas críticas de negocio (deudas, reposos, pagos divididos, ocupación y fechas):
```bash
npm test
```

### 5. Compilar para Producción
```bash
npm run build
```
Generará el bundle optimizado y minificado en la carpeta `/dist`, listo para ser desplegado en Vercel, Netlify o cualquier servidor web estático.

---

*Desarrollado con dedicación y excelencia para la optimización integral de centros deportivos de alto rendimiento.*
