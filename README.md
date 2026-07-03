# Kaha Gym Gestor — Sistema Web de Gestión Integral 🇦🇷

Un sistema comercial full-stack llave en mano desarrollado para la administración diaria de gimnasios y centros de entrenamiento en Argentina. Diseñado con una interfaz intuitiva para personal administrativo no técnico, combinando automatizaciones de bases de datos con RLS estricto y un entorno de simulación reactivo.

---

## 🚀 Características Clave del Sistema

1. **Gestión de Socios (CRUD Clínico)**:
   - Registro de perfiles, datos de contacto, asignaciones de planes bases, fecha de facturación y estados vigentes.
   - Prevención integrada de registros duplicados por algoritmo de proximidad (Fuzzy Matching).
   - Altas rápidas y migraciones mediante importación y exportación masiva en formato CSV.

2. **Control Multitarifa (No Retroactivo)**:
   - Abonos fijos estructurados de **2, 3, 4 y 5 días semanales**.
   - Ajustes de precios en pesos argentinos (ARS) protegidos por privilegios de Administrador.
   - Guardado automático en el historial contable de auditorías, respetando contratos existentes sin alterarlos retroactivamente.

3. **Grilla de Horarios Semanal Dinámica**:
   - Calendario semanal unificado (Lunes a Viernes) dividido por bloques de hora.
   - Gráfica e indicador de ocupación por código de semáforo: **Verde (<70%), Amarillo (70-90%) y Rojo (>=90%)**.
   - Listas de espera inteligentes: ascenso automático del primer suplente cuando se libera un cupo.
   - Registro de ausencias con un gestor para programar recuperaciones sin sobrepasar los límites de capacidad.

4. **Auditoría Financiera y Conciliación**:
   - Registro manual de transacciones con autocompletado según el plan del socio.
   - Herramienta para conciliar extractos bancarios en CSV descargados de billeteras virtuales (Mercado Pago o Ualá).
   - Generador automático de recibos de pago formateados para envío mediante enlaces directos a WhatsApp.

5. **Módulo Inteligente de Morosidad**:
   - Regla de negocio estricta: vencimiento los días **5 de cada mes a las 23:59hs**.
   - Simulador interactivo en tiempo real de la base de datos para simular pasos en el tiempo y ejecutar el Cron Job diario de facturación (Edge Function en Deno).
   - Tabla de cobros de emergencia y KPIS analíticos para ver mermas y pasivos.

6. **Previsiones y Proyecciones**:
   - Proyecciones de ingresos mensuales al 100%, 75% y 50% de cobros efectivos.
   - Cálculo del porcentaje de capacidad vendida vs. instalada e identificación de turnos saturados y subutilizados.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 18+ (Vite, TypeScript, Tailwind CSS, Lucide icons)
- **Backend / DB (Listo para Producción)**: 
  - PostgreSQL (Tablas relacionales estructuradas en triggers y llaves foráneas).
  - Row Level Security (RLS) para segregación de roles de usuario (ADMIN vs OPERADOR).
  - Cron Jobs automatizados mediante Supabase Edge Functions escritas en Deno.
- **Entorno de Simulación**: Engine reactivo montado sobre la API `localStorage` del navegador para probar el flujo de datos completo localmente sin necesidad de credenciales en la nube.

---

## 📋 Estructura de Turnos Semanal (Carga SEED)

| Hora | Lunes | Martes | Miércoles | Jueves | Viernes | Sábado |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **07:30** | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Libre |
| **08:30** | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Libre |
| **09:30** | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Libre |
| **10:30** | Cupo 5 | Cupo 5 | Cupo 5 | Cupo 5 | Cupo 5 | Libre |
| **11:00** | Cupo 3 | Cupo 3 | Cupo 3 | Cupo 3 | Cupo 3 | Libre |
| **12:00** | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Libre |
| **15:00** | No Disp | Cupo 7 | No Disp | Cupo 7 | Cupo 7 | Libre |
| **16:00** | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Libre |
| **17:00** | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Libre |
| **18:00** | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Libre |
| **19:00** | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Libre |
| **20:00** | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Cupo 7 | Libre |
| **21:00** | Cupo 8 | Cupo 8 | Cupo 8 | Cupo 8 | Cupo 8 | Libre |

---

## ⚙️ Despliegue e Instalación Local

### Requisitos Previos
- Tener instalado **Node.js** (versión 18 o superior).

### Instrucciones paso a paso para usuarios:

1. **Clonar o descargar el proyecto**:
   Extrae el archivo ZIP en una carpeta de tu ordenador.

2. **Instalar Dependencias**:
   Abre una terminal en la carpeta raíz del proyecto y ejecuta:
   ```bash
   npm install
   ```

3. **Configurar el Entorno**:
   El sistema funciona por defecto en un entorno de simulación local interactivo. Si deseas conectarlo un proyecto físico en la nube con Supabase, renombra `.env.example` a `.env` y completa la inicialización con el script SQL de esquemas.

4. **Compilar y Arrancar el Servidor**:
   Inicia el servidor local de desarrollo ejecutando:
   ```bash
   npm run dev
   ```
   Abre tu navegador predilecto en `http://localhost:3000` para iniciar la gestión operativa del gimnasio.

---

## 🔒 Despliegue en la Nube con Postgres y Supabase

Los archivos ubicados en el directorio `/supabase` contienen tres migraciones secuenciales listas para cargarse en la consola SQL del panel de Supabase:

1. **001_initial_schema.sql**: Genera la estructura relacional con integridad referencial.
2. **002_rls_policies.sql**: Activa Row Level Security separando llamadas de lectura y escritura entre perfiles `Admin` y `Operator`.
3. **003_seed_data.sql**: Llena las bases relacionales con los 4 abonos básicos y los turnos semanales correspondientes.
4. **functions/check-morosidad**: Deploya la Edge Function en Deno para ser programada como Cron Job diario.

---

*Desarrollado para la optimización de centros deportivos y gimnasios de alto rendimiento.*
