import { supabase } from './supabase';

// ── PDF access (6-check security gate via DB RPC) ────────────────────────────

export type PdfAccessResult =
  | { ok: true; filePath: string; productTitle: string }
  | { ok: false; reason: 'not_authenticated' | 'no_access' | 'revoked' | 'not_approved' | 'not_found' | 'no_pdf' | 'unknown'; message: string };

/** Calls the get_pdf_access RPC and converts the DB file_path into a 15-minute signed URL. */
export async function getPdfAccess(productId: string): Promise<PdfAccessResult & { signedUrl?: string }> {
  const { data, error } = await supabase.rpc('get_pdf_access', {
    p_product_id: productId,
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('Not authenticated'))           return { ok: false, reason: 'not_authenticated', message: 'You must be logged in.' };
    if (msg.includes('No access record'))            return { ok: false, reason: 'no_access', message: 'You have not purchased this note.' };
    if (msg.includes('revoked'))                     return { ok: false, reason: 'revoked', message: 'Your access to this note has been revoked.' };
    if (msg.includes('not approved'))                return { ok: false, reason: 'not_approved', message: 'Payment is pending verification.' };
    if (msg.includes('Product not found'))           return { ok: false, reason: 'not_found', message: 'Product not found.' };
    if (msg.includes('PDF not yet available'))       return { ok: false, reason: 'no_pdf', message: 'The PDF for this note has not been uploaded yet.' };
    return { ok: false, reason: 'unknown', message: msg || 'An error occurred.' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.file_path) {
    return { ok: false, reason: 'no_pdf', message: 'PDF not available.' };
  }

  // Generate a 15-minute (900s) signed URL
  const { data: urlData, error: urlErr } = await supabase.storage
    .from('notes')
    .createSignedUrl(row.file_path, 900);

  if (urlErr || !urlData?.signedUrl) {
    return { ok: false, reason: 'unknown', message: 'Failed to generate PDF access link.' };
  }

  return { ok: true, filePath: row.file_path, productTitle: row.product_title, signedUrl: urlData.signedUrl };
}
