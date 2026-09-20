import { supabase } from './supabase';
import type { AdminOrder } from '@/types';

// ── Admin order operations ────────────────────────────────────────────────────

/** Fetches all orders (admin only). Optionally filter by status. */
export async function getAllOrders(status?: string): Promise<{ data: AdminOrder[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_get_orders', {
    p_status: status ?? null,
  });
  if (error) return { data: [], error: error.message };
  return { data: (data as AdminOrder[]) ?? [], error: null };
}

/** Approves a pending_verification order. Creates user_access record. */
export async function approveOrder(orderId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_approve_order', { p_order_id: orderId });
  return { error: error?.message ?? null };
}

/** Rejects an order with a reason. */
export async function rejectOrder(orderId: string, reason: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_reject_order', {
    p_order_id: orderId,
    p_reason: reason,
  });
  return { error: error?.message ?? null };
}

/** Updates a site setting (admin only). */
export async function updateSetting(key: string, value: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_setting', { p_key: key, p_value: value });
  return { error: error?.message ?? null };
}

/** Returns order counts grouped by status. */
export async function getOrderStats(): Promise<{
  data: Record<string, number>;
  error: string | null;
}> {
  const { data, error } = await getAllOrders();
  if (error) return { data: {}, error };
  const stats: Record<string, number> = {};
  (data ?? []).forEach((o) => {
    stats[o.status] = (stats[o.status] ?? 0) + 1;
  });
  return { data: stats, error: null };
}

// ── Stage 3: PDF & Access Management ─────────────────────────────────────────

import type { AdminProduct, AdminUserAccess } from '@/types';

/** Returns all products with their PDF status (admin only). */
export async function getProductsWithPdf(): Promise<{ data: AdminProduct[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_get_products_with_pdf');
  if (error) return { data: [], error: error.message };
  return { data: (data as AdminProduct[]) ?? [], error: null };
}

/**
 * Uploads a PDF to private storage and sets the product's file_path.
 * Path: products/{productId}/{sanitizedFilename}
 */
export async function uploadProductPdf(
  productId: string,
  file: File,
): Promise<{ filePath: string | null; error: string | null }> {
  // Sanitize filename
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'pdf') return { filePath: null, error: 'Only PDF files are allowed.' };
  if (file.size > 50 * 1024 * 1024) return { filePath: null, error: 'File must be ≤50 MB.' };

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
  const storagePath = `products/${productId}/${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from('notes')
    .upload(storagePath, file, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) return { filePath: null, error: uploadErr.message };

  // Tell DB about the new path
  const { error: rpcErr } = await supabase.rpc('admin_set_product_pdf', {
    p_product_id: productId,
    p_file_path: storagePath,
  });

  if (rpcErr) return { filePath: null, error: rpcErr.message };
  return { filePath: storagePath, error: null };
}

/** Removes the PDF from storage and clears the product's file_path. */
export async function removeProductPdf(productId: string, filePath: string): Promise<{ error: string | null }> {
  // Remove from storage
  const { error: storageErr } = await supabase.storage.from('notes').remove([filePath]);
  if (storageErr) return { error: storageErr.message };

  // Clear DB path
  const { error: rpcErr } = await supabase.rpc('admin_set_product_pdf', {
    p_product_id: productId,
    p_file_path: null,
  });
  return { error: rpcErr?.message ?? null };
}

/** Returns all user access records (admin only). */
export async function getAdminUserAccessList(): Promise<{ data: AdminUserAccess[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_get_user_access');
  if (error) return { data: [], error: error.message };
  return { data: (data as AdminUserAccess[]) ?? [], error: null };
}

/** Revokes a user's access (admin only). */
export async function revokeAccess(accessId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_revoke_access', { p_access_id: accessId });
  return { error: error?.message ?? null };
}

/** Restores a revoked user's access (admin only). */
export async function restoreAccess(accessId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_restore_access', { p_access_id: accessId });
  return { error: error?.message ?? null };
}
