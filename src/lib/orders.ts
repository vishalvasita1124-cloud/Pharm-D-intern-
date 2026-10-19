import { supabase } from './supabase';
import type { Order, UserAccess, SiteSetting } from '@/types';

// ── Order creation ────────────────────────────────────────────────────────────

/** Creates a new order or returns an existing active one. Price comes from DB. */
export async function createOrder(productId: string): Promise<{ data: Order | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_order', { p_product_id: productId });
  if (error) return { data: null, error: error.message };
  return { data: data as Order, error: null };
}

/** Creates a guest order (no login needed). Also works for logged-in users. */
export async function createGuestOrder(
  productId: string,
  email: string,
  name: string,
  mobile: string
): Promise<{ data: Order | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_guest_order', {
    p_product_id: productId,
    p_email: email,
    p_name: name,
    p_mobile: mobile,
  });
  if (error) return { data: null, error: error.message };
  return { data: data as Order, error: null };
}

// ── UTR submission ────────────────────────────────────────────────────────────

/** Submits the UPI UTR number for an order (supports both logged-in and guest users). */
export async function submitUTR(orderId: string, utr: string): Promise<{ data: Order | null; error: string | null }> {
  // Try submit_guest_utr first (works for all orders)
  const { data, error } = await supabase.rpc('submit_guest_utr', {
    p_order_id: orderId,
    p_utr: utr,
  });

  if (!error) return { data: data as Order, error: null };

  // Fallback to standard submit_utr
  const fallback = await supabase.rpc('submit_utr', {
    p_order_id: orderId,
    p_utr: utr,
  });
  if (fallback.error) return { data: null, error: fallback.error.message };
  return { data: fallback.data as Order, error: null };
}

// ── Fetching orders ───────────────────────────────────────────────────────────

/** Fetches all orders for the current user (most recent first). */
export async function getUserOrders(): Promise<{ data: Order[]; error: string | null }> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as Order[]) ?? [], error: null };
}

/** Fetches a single order by ID (supports both logged-in and guest orders). */
export async function getOrderById(orderId: string): Promise<{ data: Order | null; error: string | null }> {
  // Try get_guest_order RPC (bypasses RLS safely by order UUID)
  const { data: guestData, error: guestErr } = await supabase.rpc('get_guest_order', {
    p_order_id: orderId,
  });

  if (!guestErr && guestData) {
    return { data: guestData as Order, error: null };
  }

  // Fallback direct query
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Order, error: null };
}

/** Fetches a pending/active order for a specific product (if one exists). */
export async function getActiveOrderForProduct(productId: string): Promise<{ data: Order | null; error: string | null }> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('product_id', productId)
    .not('status', 'in', '("rejected","cancelled")')
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as Order | null, error: null };
}

// ── Access check ──────────────────────────────────────────────────────────────

/** Checks whether the current user has approved access to a product. */
export async function checkUserAccess(productId: string): Promise<{ hasAccess: boolean; access: UserAccess | null; error: string | null }> {
  const { data, error } = await supabase
    .from('user_access')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();

  if (error) return { hasAccess: false, access: null, error: error.message };
  return { hasAccess: !!data, access: data as UserAccess | null, error: null };
}

/** Fetches all user_access records for the current user. */
export async function getUserAccessList(): Promise<{ data: UserAccess[]; error: string | null }> {
  const { data, error } = await supabase
    .from('user_access')
    .select('*')
    .order('granted_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as UserAccess[]) ?? [], error: null };
}

// ── Site settings ─────────────────────────────────────────────────────────────

/** Fetches all site settings as a record map. */
export async function getSiteSettings(): Promise<{ data: Record<string, string>; error: string | null }> {
  const { data, error } = await supabase.from('site_settings').select('*');

  if (error) return { data: {}, error: error.message };
  const map: Record<string, string> = {};
  (data as SiteSetting[]).forEach((s) => { map[s.key] = s.value; });
  return { data: map, error: null };
}

// ── Razorpay Online Payment ───────────────────────────────────────────────────

/** Completes an order using Razorpay payment ID and instantly grants user access. */
export async function completeRazorpayPayment(
  orderId: string,
  paymentId: string
): Promise<{ data: Order | null; error: string | null }> {
  const { data, error } = await supabase.rpc('complete_razorpay_payment', {
    p_order_id: orderId,
    p_payment_id: paymentId,
  });

  if (error) return { data: null, error: error.message };
  return { data: data as Order, error: null };
}

