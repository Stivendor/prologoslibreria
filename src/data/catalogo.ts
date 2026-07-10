import type { Categoria, Libro } from '../types';
import { supabase } from '../lib/supabase';
import { categoriasSeed, librosSeed } from './seed';

// Capa de acceso a datos del catálogo.
// Si hay conexión a Supabase se consulta la base de datos; de lo contrario se
// devuelven los datos semilla locales, de modo que la app corre en cualquier
// entorno sin bloquear el desarrollo del frontend.

export async function obtenerCategorias(): Promise<Categoria[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('orden', { ascending: true });
    if (error) throw error;
    return data as Categoria[];
  }
  return [...categoriasSeed].sort((a, b) => a.orden - b.orden);
}

export async function obtenerLibros(): Promise<Libro[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .eq('activo', true)
      .order('creado_en', { ascending: false });
    if (error) throw error;
    return data as Libro[];
  }
  return librosSeed.filter((l) => l.activo);
}

export async function obtenerLibro(id: string): Promise<Libro | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Libro) ?? null;
  }
  return librosSeed.find((l) => l.id === id) ?? null;
}
