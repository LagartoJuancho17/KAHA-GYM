import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load variables from .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('\n======================================');
console.log('🔌 Verificando conexión a Supabase...');
console.log('--------------------------------------');
console.log('URL:', supabaseUrl);
console.log('Key configurada:', supabaseKey ? 'Sí (válida)' : 'No');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL o SUPABASE_ANON_KEY no están definidos en el archivo .env\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('clientes').select('id').limit(1);
    
    if (error) {
      // 42P01 is Postgres code for "relation does not exist" (meaning table is missing)
      if (error.code === '42P01') {
        console.log('✅ ¡Conexión exitosa a Supabase!');
        console.log('ℹ️ Estado: Se conectó al servidor pero la tabla "clientes" aún no ha sido creada.');
        console.log('👉 Recuerda ejecutar las migraciones SQL (001_initial_schema.sql) en el SQL Editor de Supabase.');
      } else {
        console.error('❌ Error en consulta a Supabase:', error.message, `(Código: ${error.code})`);
      }
    } else {
      console.log('✅ ¡Conexión exitosa a Supabase!');
      console.log('🎉 La tabla "clientes" existe y se pudo consultar correctamente.');
    }
  } catch (err) {
    console.error('❌ Error inesperado al intentar conectar:', err.message);
  }
  console.log('======================================\n');
}

testConnection();
