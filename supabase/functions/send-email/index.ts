import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const APP_URL = 'https://pharm-d-intern.vishalvasita1124.workers.dev';
const FROM_EMAIL = 'Pharm D Intern Notes <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Email HTML Templates ──────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pharm D Intern Notes</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f3460,#0d7377);padding:32px 36px;border-radius:16px 16px 0 0;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">
              📘 Pharm D Intern Notes
            </p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">
              pharmdintern.com
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px;border-radius:0 0 16px 16px;border:1px solid #e8ecf0;border-top:none;">
            ${content}
            <!-- Footer -->
            <div style="margin-top:36px;padding-top:24px;border-top:1px solid #f0f2f5;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                You're receiving this because you have an account at Pharm D Intern Notes.<br/>
                Questions? Reply to this email or visit <a href="${APP_URL}" style="color:#0d7377;">pharmdintern.com</a>
              </p>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function paymentReceivedEmail(order: Record<string, unknown>, name: string): { subject: string; html: string } {
  return {
    subject: `Payment received — Order #${order.order_number}`,
    html: baseLayout(`
      <p style="margin:0 0 8px;color:#374151;font-size:15px;font-weight:600;">Hi ${name || 'there'} 👋</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">
        We've received your payment reference for <strong style="color:#111827;">${order.product_title}</strong>.
        Our team will verify it and grant your access shortly.
      </p>

      <!-- Order card -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;">Order Details</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Order Number</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;font-family:monospace;">${order.order_number}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Product</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;">${order.product_title}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Amount Paid</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;">₹${order.amount}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">UTR / Reference</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;font-family:monospace;">${order.utr_number || '—'}</td>
          </tr>
        </table>
      </div>

      <!-- Status badge -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:20px;">⏳</span>
        <p style="margin:0;color:#1d4ed8;font-size:13px;line-height:1.5;">
          <strong>Review in progress.</strong> We usually approve within a few hours. You'll get another email once it's done.
        </p>
      </div>

      <a href="${APP_URL}/orders/${order.id}" style="display:inline-block;background:#0f3460;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:10px;">
        Track Order Status →
      </a>
    `),
  };
}

function approvedEmail(order: Record<string, unknown>, name: string): { subject: string; html: string } {
  return {
    subject: `🎉 Access granted — ${order.product_title}`,
    html: baseLayout(`
      <p style="margin:0 0 8px;color:#374151;font-size:15px;font-weight:600;">Hi ${name || 'there'} 🎉</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">
        Great news! Your order for <strong style="color:#111827;">${order.product_title}</strong> has been <strong style="color:#059669;">approved</strong>.
        Your PDF is ready to access right now.
      </p>

      <!-- Success badge -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:28px;">✅</p>
        <p style="margin:0;color:#065f46;font-size:15px;font-weight:700;">Payment Verified · Access Granted</p>
        <p style="margin:4px 0 0;color:#059669;font-size:13px;">Order #${order.order_number}</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#0d7377,#14a085);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 36px;border-radius:12px;box-shadow:0 4px 12px rgba(13,115,119,0.3);">
          📘 Open My Notes
        </a>
      </div>

      <!-- Order summary -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;">Order Summary</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Product</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;">${order.product_title}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Amount</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;">₹${order.amount}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Access</td>
            <td style="color:#059669;font-size:13px;font-weight:700;text-align:right;">Lifetime ♾️</td>
          </tr>
        </table>
      </div>
    `),
  };
}

function rejectedEmail(order: Record<string, unknown>, name: string): { subject: string; html: string } {
  return {
    subject: `Order update — Action needed (#${order.order_number})`,
    html: baseLayout(`
      <p style="margin:0 0 8px;color:#374151;font-size:15px;font-weight:600;">Hi ${name || 'there'},</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">
        Unfortunately, we were unable to verify your payment for
        <strong style="color:#111827;">${order.product_title}</strong>.
      </p>

      <!-- Rejection reason -->
      ${order.rejection_reason ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#991b1b;font-size:12px;font-weight:700;text-transform:uppercase;">Reason</p>
        <p style="margin:0;color:#b91c1c;font-size:14px;line-height:1.6;">${order.rejection_reason}</p>
      </div>` : ''}

      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">
        If you believe this is a mistake or have a valid payment screenshot, please try again or contact us.
      </p>

      <!-- CTA -->
      <a href="${APP_URL}/notes" style="display:inline-block;background:#0f3460;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:10px;margin-right:12px;">
        Try Again →
      </a>

      <!-- Order info -->
      <div style="margin-top:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Order Number</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;font-family:monospace;">${order.order_number}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Amount</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;">₹${order.amount}</td>
          </tr>
        </table>
      </div>
    `),
  };
}

// ── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, order_id } = await req.json() as { type: string; order_id: string };

    if (!type || !order_id) throw new Error('Missing type or order_id');

    // Verify caller's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error('Not authenticated');

    // Admin client (bypasses RLS)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check caller is admin for approve/reject emails
    if (type === 'approved' || type === 'rejected') {
      const { data: prof } = await admin
        .from('profiles')
        .select('role')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();
      if (prof?.role !== 'admin') throw new Error('Not authorized');
    }

    // Fetch order
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();
    if (orderErr || !order) throw new Error('Order not found');

    // For payment_received, verify the caller owns the order (if logged in)
    if (type === 'payment_received' && order.user_id && order.user_id !== user.id) {
      throw new Error('Not authorized');
    }

    // Fetch recipient: either from profile or directly from guest order fields
    let recipientEmail = order.customer_email || '';
    let recipientName = order.customer_name || 'Valued Customer';

    if (order.user_id) {
      const { data: recipient } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', order.user_id)
        .maybeSingle();

      if (recipient?.email) {
        recipientEmail = recipient.email;
        recipientName = recipient.full_name || recipientName;
      }
    }

    if (!recipientEmail) throw new Error('Customer email not found on order');

    // Build email
    let email: { subject: string; html: string };
    if (type === 'payment_received') {
      email = paymentReceivedEmail(order, recipientName);
    } else if (type === 'approved') {
      email = approvedEmail(order, recipientName);
    } else if (type === 'rejected') {
      email = rejectedEmail(order, recipientName);
    } else {
      throw new Error(`Unknown email type: ${type}`);
    }

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipientEmail],
        subject: email.subject,
        html: email.html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      throw new Error(`Resend error: ${errText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
