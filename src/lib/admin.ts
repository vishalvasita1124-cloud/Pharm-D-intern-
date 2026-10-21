import { supabase } from './supabase';
import type { AdminOrder, AdminProduct, AdminUserAccess, ProductInput, Resource } from '@/types';

// ── Email Notifications ───────────────────────────────────────────────────────

/** Sends a transactional email via the Supabase Edge Function. Fire-and-forget safe. */
export async function sendOrderEmail(
  type: 'payment_received' | 'approved' | 'rejected',
  orderId: string,
): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, order_id: orderId }),
      },
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { error: (json as { error?: string }).error ?? 'Email send failed' };
    }
    return { error: null };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ── Admin order operations ────────────────────────────────────────────────────

/** Fetches all orders (admin only). Optionally filter by status. */
export async function getAllOrders(status?: string): Promise<{ data: AdminOrder[]; error: string | null }> {
  // 1. First try RPC
  const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_get_orders', {
    p_status: status ?? null,
  });

  if (!rpcErr && rpcData && rpcData.length > 0) {
    return { data: rpcData as AdminOrder[], error: null };
  }

  // 2. Direct table fallback (catches any guest orders missed by RPC inner join)
  const { data: directOrders, error: directErr } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (!directErr && directOrders && directOrders.length > 0) {
    let filtered = directOrders;
    if (status) {
      filtered = filtered.filter((o) => o.status === status);
    }
    const mapped: AdminOrder[] = filtered.map((o) => ({
      ...o,
      user_email: o.customer_email || 'guest',
      user_name: o.customer_name || 'Guest Customer',
    }));
    return { data: mapped, error: null };
  }

  if (rpcErr) return { data: [], error: rpcErr.message };
  return { data: (rpcData as AdminOrder[]) ?? [], error: null };
}

/** Approves a pending_verification order. Creates user_access record. */
export async function approveOrder(orderId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_approve_order', { p_order_id: orderId });
  if (!error) return { error: null };

  // Fallback to direct update if RPC fails on user_id NULL
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (updateErr) return { error: error?.message || updateErr.message };
  return { error: null };
}

/** Rejects an order with a reason. */
export async function rejectOrder(orderId: string, reason: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_reject_order', {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (!error) return { error: null };

  // Fallback to direct update
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateErr) return { error: error?.message || updateErr.message };
  return { error: null };
}

/** Updates a site setting (admin only). */
export async function updateSetting(key: string, value: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_setting', { p_key: key, p_value: value });
  return { error: error?.message ?? null };
}

/** Returns order counts grouped by status. */
export async function getOrderStats(): Promise<{ data: Record<string, number>; error: string | null }> {
  const { data, error } = await getAllOrders();
  if (error) return { data: {}, error };
  const stats: Record<string, number> = {};
  (data ?? []).forEach((o) => {
    stats[o.status] = (stats[o.status] ?? 0) + 1;
  });
  return { data: stats, error: null };
}

// ── PDF Management ─────────────────────────────────────────────────────────────

/** Returns all products with full details for admin management. */
export async function getProductsWithPdf(): Promise<{ data: AdminProduct[]; error: string | null }> {
  const { data, error } = await supabase
    .from('products')
    .select('id, title, slug, description, short_description, category_id, price, pages, cover_url, preview_url, topics, is_published, file_path, updated_at')
    .order('title');
  if (error) return { data: [], error: error.message };
  return { data: (data as AdminProduct[]) ?? [], error: null };
}

/** Uploads a paid PDF to private storage and sets product.file_path. */
export async function uploadProductPdf(
  productId: string,
  file: File,
): Promise<{ filePath: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'pdf') return { filePath: null, error: 'Only PDF files are allowed.' };
  if (file.size > 50 * 1024 * 1024) return { filePath: null, error: 'File must be ≤50 MB.' };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const storagePath = `products/${productId}/${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from('notes')
    .upload(storagePath, file, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) return { filePath: null, error: uploadErr.message };

  const { error: dbErr } = await supabase
    .from('products')
    .update({ file_path: storagePath, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (dbErr) return { filePath: null, error: dbErr.message };
  return { filePath: storagePath, error: null };
}

/** Removes the paid PDF from storage and clears product.file_path. */
export async function removeProductPdf(productId: string, filePath: string): Promise<{ error: string | null }> {
  const { error: storageErr } = await supabase.storage.from('notes').remove([filePath]);
  if (storageErr) return { error: storageErr.message };

  const { error: dbErr } = await supabase
    .from('products')
    .update({ file_path: null, updated_at: new Date().toISOString() })
    .eq('id', productId);
  return { error: dbErr?.message ?? null };
}

/** Uploads a free preview PDF to public storage and updates product.preview_url. */
export async function uploadPreviewPdf(
  productId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'pdf') return { url: null, error: 'Only PDF files are allowed.' };
  if (file.size > 20 * 1024 * 1024) return { url: null, error: 'Preview must be ≤20 MB.' };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const storagePath = `previews/${productId}/${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from('public-pdfs')
    .upload(storagePath, file, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) return { url: null, error: uploadErr.message };

  const { data: urlData } = supabase.storage.from('public-pdfs').getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  const { error: dbErr } = await supabase
    .from('products')
    .update({ preview_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (dbErr) return { url: null, error: dbErr.message };
  return { url: publicUrl, error: null };
}

/** Removes the preview PDF from public storage and clears product.preview_url. */
export async function removePreviewPdf(productId: string, previewUrl: string): Promise<{ error: string | null }> {
  const urlParts = previewUrl.split('/public-pdfs/');
  if (urlParts.length < 2) return { error: 'Invalid preview URL.' };
  await supabase.storage.from('public-pdfs').remove([urlParts[1]]);

  const { error: dbErr } = await supabase
    .from('products')
    .update({ preview_url: null, updated_at: new Date().toISOString() })
    .eq('id', productId);
  return { error: dbErr?.message ?? null };
}

// ── Product CRUD ───────────────────────────────────────────────────────────────

/** Creates a new product. Returns the created product. */
export async function createProduct(input: ProductInput): Promise<{ data: AdminProduct | null; error: string | null }> {
  const topics = input.topics.split(',').map((t) => t.trim()).filter(Boolean);
  const slug = input.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const { data, error } = await supabase
    .from('products')
    .insert({
      title: input.title,
      slug,
      description: input.description,
      short_description: input.short_description,
      category_id: input.category_id || null,
      price: input.price,
      pages: input.pages || 0,
      cover_url: input.cover_url || null,
      preview_url: input.preview_url || null,
      topics,
      is_published: input.is_published,
    })
    .select('id, title, slug, description, short_description, category_id, price, pages, cover_url, preview_url, topics, is_published, file_path, updated_at')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as AdminProduct, error: null };
}

/** Updates an existing product's fields. */
export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<{ error: string | null }> {
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) updateData.title = input.title;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.short_description !== undefined) updateData.short_description = input.short_description;
  if (input.category_id !== undefined) updateData.category_id = input.category_id || null;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.pages !== undefined) updateData.pages = input.pages;
  if (input.cover_url !== undefined) updateData.cover_url = input.cover_url || null;
  if (input.preview_url !== undefined) updateData.preview_url = input.preview_url || null;
  if (input.is_published !== undefined) updateData.is_published = input.is_published;
  if (input.topics !== undefined) {
    updateData.topics = input.topics.split(',').map((t) => t.trim()).filter(Boolean);
  }

  const { error } = await supabase.from('products').update(updateData).eq('id', id);
  return { error: error?.message ?? null };
}

/** Deletes a product (admin only). */
export async function deleteProduct(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ── Resources ─────────────────────────────────────────────────────────────────

/** Fetches all standalone resources. */
export async function getResources(): Promise<{ data: Resource[]; error: string | null }> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data as Resource[]) ?? [], error: null };
}

/** Creates a new resource record (without a file yet). */
export async function createResourceRecord(
  title: string,
  description: string,
  is_free: boolean,
): Promise<{ data: Resource | null; error: string | null }> {
  const { data, error } = await supabase
    .from('resources')
    .insert({ title, description, is_free, file_url: '' })
    .select('*')
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as Resource, error: null };
}

/** Uploads a resource file to public storage and updates the resource record. */
export async function uploadResourceFile(
  resourceId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  if (file.size > 50 * 1024 * 1024) return { url: null, error: 'File must be ≤50 MB.' };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const storagePath = `resources/${resourceId}/${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from('public-pdfs')
    .upload(storagePath, file, { upsert: true });

  if (uploadErr) return { url: null, error: uploadErr.message };

  const { data: urlData } = supabase.storage.from('public-pdfs').getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  const { error: dbErr } = await supabase
    .from('resources')
    .update({ file_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', resourceId);

  if (dbErr) return { url: null, error: dbErr.message };
  return { url: publicUrl, error: null };
}

/** Deletes a resource record and its file from storage. */
export async function deleteResource(id: string, fileUrl?: string): Promise<{ error: string | null }> {
  if (fileUrl) {
    const urlParts = fileUrl.split('/public-pdfs/');
    if (urlParts.length >= 2) {
      await supabase.storage.from('public-pdfs').remove([urlParts[1]]);
    }
  }
  const { error } = await supabase.from('resources').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ── User Access Management ─────────────────────────────────────────────────────

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
