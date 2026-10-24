import { createClient } from '@supabase/supabase-js';

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const supabaseUrl = env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

