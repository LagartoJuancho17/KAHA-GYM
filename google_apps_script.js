/**
 * SISTEMA KAHA GYM - SINCRONIZACIÓN AUTOMÁTICA DE FACTURACIÓN (RULO)
 * 
 * Instrucciones:
 * 1. En Google Sheets ve a Extensiones > Apps Script.
 * 2. Borra lo que haya en Código.gs y pega este archivo completo.
 * 3. Guarda (Cmd + S).
 * 4. Haz clic en "Ejecutar" arriba con la función `sincronizarFacturacionRulo`.
 *    (Google te pedirá autorizar por única vez: Revisar permisos > Avanzado > Ir a proyecto > Permitir).
 * 5. ¡Listo! La hoja se llena automáticamente con los 114 pagos de Rulo.
 */

const CONFIG = {
  SUPABASE_URL: "https://hiurcmchhtrcqdqurqrn.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdXJjbWNoaHRyY3FkcXVycXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjM4MzQsImV4cCI6MjA5ODU5OTgzNH0.VqNs7vjYB3dnOiOL0E9hngFtxF6negeTMGe70nBf-d4"
};

// 1. Crea un menú en la barra superior de Google Sheets al abrir la hoja
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏋️ Gimnasio KAHA')
    .addItem('⚡ Sincronizar Facturación Rulo', 'sincronizarFacturacionRulo')
    .addToUi();
}

// 2. Función que consulta Supabase y escribe directamente en la hoja
function sincronizarFacturacionRulo() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const mesFiltro = '2026-09';
  
  const headers = {
    'apikey': CONFIG.SUPABASE_KEY,
    'Authorization': 'Bearer ' + CONFIG.SUPABASE_KEY
  };
  
  // Consultas directas a Supabase
  const resPagos = UrlFetchApp.fetch(`${CONFIG.SUPABASE_URL}/rest/v1/pagos?destino_transferencia=eq.RULO&mes_correspondiente=eq.${mesFiltro}&select=*`, { headers: headers });
  const resClientes = UrlFetchApp.fetch(`${CONFIG.SUPABASE_URL}/rest/v1/clientes?select=id,nombre,apellido,email,plan_id`, { headers: headers });
  const resPlanes = UrlFetchApp.fetch(`${CONFIG.SUPABASE_URL}/rest/v1/planes?select=id,nombre,dias_por_semana`, { headers: headers });
  
  const pagos = JSON.parse(resPagos.getContentText());
  const clientes = JSON.parse(resClientes.getContentText());
  const planes = JSON.parse(resPlanes.getContentText());
  
  if (!pagos || pagos.length === 0) {
    SpreadsheetApp.getUi().alert('No se encontraron pagos a Rulo para el mes ' + mesFiltro);
    return;
  }
  
  const rows = [];
  
  for (let i = 0; i < pagos.length; i++) {
    const p = pagos[i];
    const cli = clientes.find(c => c.id === p.cliente_id);
    const plan = planes.find(pl => pl.id === cli?.plan_id);
    
    let fechaComp = '28/09/26';
    if (p.fecha_pago) {
      const d = p.fecha_pago.slice(8, 10);
      const m = p.fecha_pago.slice(5, 7);
      const y = p.fecha_pago.slice(2, 4);
      fechaComp = `${d}/${m}/${y}`;
    }
    
    let descripcion = '2 veces por semana';
    if (p.es_externo) {
      descripcion = p.concepto || 'Alquiler consultorio / masajes';
    } else if (plan && plan.dias_por_semana) {
      descripcion = plan.dias_por_semana + ' veces por semana';
    } else if (plan && plan.nombre) {
      if (plan.nombre.indexOf('2') !== -1) descripcion = '2 veces por semana';
      else if (plan.nombre.indexOf('3') !== -1) descripcion = '3 veces por semana';
      else if (plan.nombre.indexOf('4') !== -1) descripcion = '4 veces por semana';
      else if (plan.nombre.indexOf('5') !== -1) descripcion = '5 veces por semana';
      else descripcion = plan.nombre;
    }
    
    const monto = Number(p.monto || 0);
    const montoStr = monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const montoFormatted = ' $  ' + montoStr + ' ';
    
    rows.push([
      fechaComp,
      descripcion,
      montoFormatted,
      1,
      montoFormatted,
      'SERVICIO',
      '01/09/26',
      '30/09/26',
      'TRANSFERENCIA',
      'CONSUMIDOR FINAL',
      '',
      cli && cli.email ? cli.email : ''
    ]);
  }
  
  // Limpiar contenido anterior desde fila 2 en adelante
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 12).clearContent();
  }
  
  // Escribir todas las filas generadas
  sheet.getRange(2, 1, rows.length, 12).setValues(rows);
  
  Logger.log('¡Sincronizadas ' + rows.length + ' filas con éxito!');
}

// 3. Webhook compatible por si se ejecuta externamente
function doPost(e) {
  try {
    sincronizarFacturacionRulo();
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
