import { supabase } from './supabase';

// ── PDF access (6-check security gate via DB RPC) ────────────────────────────

export type PdfAccessResult =
  | { ok: true; filePath: string; productTitle: string }
  | { ok: false; reason: 'not_authenticated' | 'no_access' | 'revoked' | 'not_approved' | 'not_found' | 'no_pdf' | 'unknown'; message: string };

/** Calls the get_pdf_access RPC and converts the DB file_path into a signed or blob URL. */
export async function getPdfAccess(productId: string): Promise<PdfAccessResult & { signedUrl?: string; blobUrl?: string }> {
  // Sync any guest orders by email before checking PDF access
  try {
    await supabase.rpc('sync_my_orders_and_access');
  } catch (e) {
    // Non-blocking sync
  }

  const { data, error } = await supabase.rpc('get_pdf_access', {
    p_product_id: productId,
  });

  if (error) {
    console.error('[getPdfAccess] RPC get_pdf_access error:', error);
    const msg = error.message ?? '';
    if (msg.includes('Not authenticated'))     return { ok: false, reason: 'not_authenticated', message: 'You must be logged in to view your notes.' };
    if (msg.includes('No access record'))      return { ok: false, reason: 'no_access', message: 'Payment is pending verification or note has not been purchased yet.' };
    if (msg.includes('revoked'))               return { ok: false, reason: 'revoked', message: 'Your access to this note has been revoked.' };
    if (msg.includes('not approved'))          return { ok: false, reason: 'not_approved', message: 'Payment is pending verification. Please allow a short time for verification.' };
    if (msg.includes('Product not found'))     return { ok: false, reason: 'not_found', message: 'Product not found.' };
    if (msg.includes('PDF not yet available') || msg.includes('not yet uploaded')) {
      return { ok: false, reason: 'no_pdf', message: 'The PDF for this note has not been uploaded yet. Please check back soon or contact support.' };
    }
    return { ok: false, reason: 'unknown', message: msg || 'An error occurred while verifying access.' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.file_path) {
    return { ok: false, reason: 'no_pdf', message: 'PDF file is not available for this note.' };
  }

  // Handle direct HTTP/HTTPS URLs
  if (row.file_path.startsWith('http://') || row.file_path.startsWith('https://')) {
    return {
      ok: true,
      filePath: row.file_path,
      productTitle: row.product_title,
      signedUrl: row.file_path,
    };
  }

  // Clean storage path (strip leading bucket name or slashes)
  const cleanPath = row.file_path.replace(/^notes\//, '').replace(/^\//, '');

  // 1. Try to generate a 1-hour (3600s) signed URL
  const { data: urlData, error: urlErr } = await supabase.storage
    .from('notes')
    .createSignedUrl(cleanPath, 3600);

  let signedUrl = urlData?.signedUrl;
  let blobUrl: string | undefined;

  // 2. If signedUrl failed, attempt publicUrl fallback
  if (urlErr || !signedUrl) {
    console.warn('[getPdfAccess] createSignedUrl failed, trying publicUrl fallback:', urlErr);
    const { data: pubData } = supabase.storage.from('notes').getPublicUrl(cleanPath);
    if (pubData?.publicUrl) {
      signedUrl = pubData.publicUrl;
    }
  }

  // 3. Also fetch as blob for bulletproof local rendering (immune to iframe restrictions & mobile issues)
  try {
    const { data: blob, error: blobErr } = await supabase.storage
      .from('notes')
      .download(cleanPath);

    if (!blobErr && blob) {
      blobUrl = URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn('[getPdfAccess] Blob download fallback error:', e);
  }

  const finalUrl = blobUrl || signedUrl;

  if (!finalUrl) {
    console.error('[getPdfAccess] Could not generate signed or public URL for:', cleanPath, urlErr);
    return {
      ok: false,
      reason: 'unknown',
      message: urlErr?.message || 'Failed to generate PDF access link. Please verify that the PDF file exists in storage.',
    };
  }

  return {
    ok: true,
    filePath: row.file_path,
    productTitle: row.product_title,
    signedUrl: finalUrl,
    blobUrl,
  };
}
