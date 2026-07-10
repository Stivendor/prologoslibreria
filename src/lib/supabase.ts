import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// El cliente solo se crea si hay credenciales configuradas. Mientras Prólogos
// entrega los datos de la cuenta, la app funciona con los datos semilla locales.
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const usandoSupabase = supabase !== null;
