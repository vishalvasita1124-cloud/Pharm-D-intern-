import { supabase } from './supabase';
import type { Product, Category } from '@/types';

// ── Fetch all published products ──────────────────────────────────────────────

export async function getPublishedProducts(): Promise<{ data: Product[]; error: string | null }> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as Product[]) ?? [], error: null };
}

// ── Fetch single product by slug ──────────────────────────────────────────────

export async function getProductBySlug(slug: string): Promise<{ data: Product | null; error: string | null }> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Product, error: null };
}

// ── Fetch single product by ID ────────────────────────────────────────────────

export async function getProductById(id: string): Promise<{ data: Product | null; error: string | null }> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Product, error: null };
}

// ── Fetch all categories ──────────────────────────────────────────────────────

export async function getCategories(): Promise<{ data: Category[]; error: string | null }> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) return { data: [], error: error.message };
  return { data: (data as Category[]) ?? [], error: null };
}
