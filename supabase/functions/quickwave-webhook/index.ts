export {};
declare const Deno: any;

// @ts-expect-error Deno edge functions support URL imports at runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type JsonObject = Record<string, unknown>;

type BookingRow = {
  id: number;
  booking_reference: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  club_name: string | null;
  caddie_name: string | null;
  date: string;
  time: string;
  players: number;
  total: number;
  status: 'pending' | 'confirmed' | 'cancelled';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-quickwave-signature, x-signature',
};

const SUCCESS_STATUSES = new Set(['success', 'successful', 'paid', 'completed', 'confirmed']);
const CANCELLED_STATUSES = new Set(['failed', 'cancelled', 'canceled', 'declined', 'reversed', 'voided']);

const PAYMENT_PROVIDER = 'quickwave';
const EXPECTED_CURRENCY = 'KES';
const MAX_WEBHOOKS_PER_REFERENCE_PER_5_MIN = 20;

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

function extractReference(payload: any): string | null {
  const direct = payload?.reference || payload?.booking_reference || payload?.tx_ref || payload?.order_id || payload?.merchant_reference;
  const nested =
    payload?.data?.reference ||
    payload?.data?.booking_reference ||
    payload?.data?.tx_ref ||
    payload?.data?.merchant_reference ||
    payload?.metadata?.booking_reference ||
    payload?.metadata?.reference ||
    payload?.meta?.booking_reference ||
    payload?.meta?.reference;
  const candidate = direct ?? nested;

  if (typeof candidate !== 'string') return null;
  const normalized = candidate.trim().toUpperCase();
  return normalized || null;
}

function extractStatus(payload: any): string {
  const raw =
    payload?.status ||
    payload?.payment_status ||
    payload?.data?.status ||
    payload?.data?.payment_status ||
    payload?.event ||
    payload?.event_name ||
    payload?.type ||
    payload?.data?.event ||
    payload?.data?.type ||
    '';
  return String(raw).trim().toLowerCase();
}

function extractEventId(payload: any): string | null {
  const direct = payload?.event_id || payload?.id || payload?.payment_id || payload?.transaction_id;
  const nested = payload?.data?.event_id || payload?.data?.id || payload?.data?.payment_id || payload?.data?.transaction_id;
  const candidate = direct ?? nested;

  if (typeof candidate !== 'string' && typeof candidate !== 'number') return null;
  const normalized = String(candidate).trim();
  return normalized || null;
}

function extractPaidAmount(payload: any): number | null {
  const amount =
    payload?.amount ??
    payload?.paid_amount ??
    payload?.paidAmount ??
    payload?.data?.amount ??
    payload?.data?.paid_amount ??
    payload?.data?.paidAmount ??
    payload?.data?.transaction?.amount ??
    payload?.transaction?.amount;

  const normalizedAmount =
    typeof amount === 'string'
      ? amount.replace(/,/g, '').replace(/[^0-9.-]/g, '')
      : amount;

  const parsed = Number(normalizedAmount);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function extractCurrency(payload: any): string {
  const currency =
    payload?.currency ??
    payload?.data?.currency ??
    payload?.data?.transaction?.currency ??
    payload?.transaction?.currency ??
    EXPECTED_CURRENCY;

  const normalized = String(currency).trim().toUpperCase();
  if (normalized === 'KSH') return 'KES';
  return normalized;
}

function normalizeStatusForComparison(status: string): string {
  return status.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function isSuccessStatus(status: string): boolean {
  const normalized = normalizeStatusForComparison(status);
  if (SUCCESS_STATUSES.has(normalized)) return true;

  return (
    normalized.includes('success') ||
    normalized.includes('successful') ||
    normalized.includes('paid') ||
    normalized.includes('complete') ||
    normalized.includes('confirm')
  );
}

function isCancelledStatus(status: string): boolean {
  const normalized = normalizeStatusForComparison(status);
  if (CANCELLED_STATUSES.has(normalized)) return true;

  return (
    normalized.includes('fail') ||
    normalized.includes('cancel') ||
    normalized.includes('declin') ||
    normalized.includes('revers') ||
    normalized.includes('void')
  );
}

function normalizeSignature(rawSignature: string): string {
  const trimmed = rawSignature.trim().toLowerCase();
  return trimmed.startsWith('sha256=') ? trimmed.slice('sha256='.length) : trimmed;
}

async function sha256Hex(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function createStatusEmailHtml(booking: BookingRow, targetStatus: 'confirmed' | 'cancelled'): string {
  const isConfirmed = targetStatus === 'confirmed';
  const badge = isConfirmed ? 'Payment Verified' : 'Payment Cancelled';
  const title = isConfirmed ? 'Booking Confirmed' : 'Booking Cancelled';
  const subtitle = isConfirmed
    ? 'Your payment has been verified and your booking is confirmed.'
    : 'Your payment was not completed. You can place a new booking anytime.';
  const amountLabel = isConfirmed ? 'Total Paid' : 'Cancelled Amount';
  const accent = isConfirmed ? '#2f3729' : '#7a2e2e';

  return `
    <div style="margin:0;padding:24px 10px;background:#f2f4ef;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #dde4d8;border-radius:18px;overflow:hidden;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f2937;box-shadow:0 16px 40px -24px rgba(15,40,30,0.55);">
        <div style="padding:22px 20px 30px;background:linear-gradient(180deg,#e8ebe4 0%,#f7f8f5 65%,#ffffff 100%);text-align:center;border-bottom:1px solid #e6ece2;">
          <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:${accent};color:#ffffff;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:700;">${badge}</div>
          <h1 style="margin:14px 0 6px;font-size:30px;line-height:1.2;color:#2f3729;font-family:Georgia,'Times New Roman',serif;">${title}</h1>
          <p style="margin:0;font-size:13px;color:#536745;">${subtitle}</p>
        </div>

        <div style="padding:18px 20px 8px;">
          <div style="border:1px solid #d1d8c9;border-radius:14px;background:linear-gradient(135deg,#f6f7f4 0%,#eef2ea 100%);padding:16px 16px 18px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b8259;letter-spacing:1.2px;text-transform:uppercase;">Booking Reference</p>
            <p style="margin:0 0 8px;font-size:30px;line-height:1.2;font-weight:800;letter-spacing:1.1px;color:#374230;">${booking.booking_reference ?? `APX-${booking.id}`}</p>
            <p style="margin:0;font-size:12px;color:#536745;">Keep this reference for quick support and check-in.</p>
          </div>
        </div>

        <div style="padding:8px 20px 0;">
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;width:42%;">Name</td>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${booking.first_name} ${booking.last_name}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Phone</td>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${booking.phone ?? '-'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Club</td>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${booking.club_name ?? '-'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Date</td>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${formatDate(booking.date)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Time</td>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${booking.time ?? '-'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Players</td>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${booking.players}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Caddie</td>
              <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${booking.caddie_name ?? '-'}</td>
            </tr>
          </table>
        </div>

        <div style="padding:16px 20px 0;">
            <div style="background:${accent};border-radius:14px;padding:16px 18px;color:#ffffff;">
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              <tr>
                  <td style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d1d8c9;font-weight:700;">${amountLabel}</td>
                <td style="text-align:right;font-size:27px;line-height:1.2;font-weight:800;color:#ffffff;">Ksh ${Number(booking.total ?? 0).toLocaleString('en-KE')}</td>
              </tr>
            </table>
          </div>
        </div>

        <div style="padding:14px 20px 0;">
          <div style="background:#f6f7f4;border-left:4px solid #6b8259;border-radius:0 10px 10px 0;padding:12px 12px 12px 14px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#435239;font-style:italic;">"Your caddie will greet you at the clubhouse entrance with your selected setup ready."</p>
          </div>
        </div>

        <div style="padding:20px 20px 22px;text-align:center;">
          <p style="margin:0 0 4px;font-size:20px;line-height:1.3;color:#2f3729;font-family:Georgia,'Times New Roman',serif;font-weight:700;">ApexGolf Africa</p>
          <p style="margin:0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#6b8259;font-weight:700;">Reach the Apex of Golf Service</p>
        </div>

        <div style="height:8px;background:linear-gradient(90deg,#536745 0%,#6b8259 50%,#536745 100%);"></div>
      </div>
    </div>
  `;
}

async function sendStatusEmail(booking: BookingRow, targetStatus: 'confirmed' | 'cancelled'): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') || 'ApexGolf Africa <onboarding@resend.dev>';

  if (!apiKey || !booking.email) return;

  const html = createStatusEmailHtml(booking, targetStatus);
  const reference = booking.booking_reference ?? `APX-${booking.id}`;
  const subject = targetStatus === 'confirmed'
    ? `ApexGolf Booking Confirmation: ${reference}`
    : `ApexGolf Payment Cancelled: ${reference}`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [booking.email],
      subject,
      html,
    }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, message: 'Quickwave webhook endpoint is reachable.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();

  try {
    const webhookSecret = (Deno.env.get('QUICKWAVE_WEBHOOK_SECRET') || '').trim();
    const requireSignature = (Deno.env.get('QUICKWAVE_REQUIRE_SIGNATURE') || 'true').trim().toLowerCase() !== 'false';
    if (requireSignature && (!webhookSecret || webhookSecret === 'YOUR_REAL_WEBHOOK_SECRET')) {
      return new Response(JSON.stringify({ error: 'Webhook signature is required but QUICKWAVE_WEBHOOK_SECRET is not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const incomingSignature = normalizeSignature(req.headers.get('x-quickwave-signature') || req.headers.get('x-signature') || '');
    if (requireSignature && !incomingSignature) {
      return new Response(JSON.stringify({ error: 'Missing webhook signature header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (incomingSignature && webhookSecret) {
      const expectedSignature = await hmacSha256Hex(webhookSecret, rawBody);
      if (!timingSafeEqual(incomingSignature, expectedSignature)) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const reference = extractReference(payload);
    const status = extractStatus(payload);
    const webhookAmount = extractPaidAmount(payload);
    const webhookCurrency = extractCurrency(payload);
    const payloadHash = await sha256Hex(rawBody);
    const eventId = extractEventId(payload) ?? `${reference ?? 'unknown'}:${status}:${payloadHash}`;

    if (!reference) {
      return new Response(JSON.stringify({ ok: true, ignored: 'No booking reference in payload.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isSuccess = isSuccessStatus(status);
    const isCancelled = isCancelledStatus(status);

    if (!isSuccess && !isCancelled) {
      return new Response(JSON.stringify({ ok: true, ignored: `Unhandled status: ${status}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const throttledSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount, error: rateError } = await admin
      .from('quickwave_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('payment_provider', PAYMENT_PROVIDER)
      .eq('booking_reference', reference)
      .gte('created_at', throttledSince);

    if (rateError) {
      return new Response(JSON.stringify({ error: 'Webhook audit table unavailable. Run the latest migrations first.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((recentCount ?? 0) > MAX_WEBHOOKS_PER_REFERENCE_PER_5_MIN) {
      return new Response(JSON.stringify({ error: 'Too many webhook attempts for reference in short window.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: booking, error: bookingError } = await admin
      .from('bookings')
      .select('*')
      .eq('booking_reference', reference)
      .single();

    const eventInsertPayload = {
      payment_provider: PAYMENT_PROVIDER,
      event_id: eventId,
      booking_reference: reference,
      booking_id: booking?.id ?? null,
      event_status: status,
      signature: incomingSignature,
      payload_hash: payloadHash,
      payload: payload as JsonObject,
      processed: false,
    };

    const { data: insertedEvent, error: eventInsertError } = await admin
      .from('quickwave_webhook_events')
      .insert(eventInsertPayload)
      .select('id')
      .single();

    if (eventInsertError && eventInsertError.code === '23505') {
      const { data: existingEvent } = await admin
        .from('quickwave_webhook_events')
        .select('id, processed, event_status, created_at')
        .eq('payment_provider', PAYMENT_PROVIDER)
        .eq('event_id', eventId)
        .single();

      return new Response(JSON.stringify({ ok: true, idempotent: true, event: existingEvent }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (eventInsertError || !insertedEvent) {
      return new Response(JSON.stringify({ error: 'Failed to persist webhook event.', details: eventInsertError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (bookingError || !booking) {
      await admin
        .from('quickwave_webhook_events')
        .update({ processed: true, processing_error: 'Booking not found', processed_at: new Date().toISOString() })
        .eq('id', insertedEvent.id);

      return new Response(JSON.stringify({ ok: true, ignored: 'Booking not found for reference.', reference }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (isSuccess) {
      if (!webhookAmount) {
        await admin
          .from('quickwave_webhook_events')
          .update({ processed: true, processing_error: 'Missing amount', processed_at: new Date().toISOString() })
          .eq('id', insertedEvent.id);

        return new Response(JSON.stringify({ error: 'Success webhook missing amount.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const bookingTotal = Number(booking.total ?? 0);
      const amountAsMajor = webhookAmount;
      const amountAsMinor = webhookAmount / 100;
      const amountMatches =
        Math.round(amountAsMajor * 100) === Math.round(bookingTotal * 100) ||
        Math.round(amountAsMinor * 100) === Math.round(bookingTotal * 100) ||
        Math.abs(amountAsMajor - bookingTotal) < 0.01;
      const currencyMatches = webhookCurrency === EXPECTED_CURRENCY;

      if (!amountMatches || !currencyMatches) {
        await admin
          .from('quickwave_webhook_events')
          .update({
            processed: true,
            processing_error: `Amount/currency mismatch. expected ${bookingTotal} ${EXPECTED_CURRENCY}, got ${webhookAmount} ${webhookCurrency}`,
            processed_at: new Date().toISOString(),
          })
          .eq('id', insertedEvent.id);

        return new Response(JSON.stringify({
          error: 'Payment validation failed.',
          expected: { amount: bookingTotal, currency: EXPECTED_CURRENCY },
          received: { amount: webhookAmount, currency: webhookCurrency },
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const targetStatus: 'confirmed' | 'cancelled' = isSuccess ? 'confirmed' : 'cancelled';

    if (booking.status === targetStatus) {
      await admin
        .from('quickwave_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', insertedEvent.id);

      return new Response(JSON.stringify({ ok: true, idempotent: true, bookingId: booking.id, status: targetStatus }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (booking.status !== 'pending') {
      await admin
        .from('quickwave_webhook_events')
        .update({
          processed: true,
          processing_error: `Invalid transition from ${booking.status} to ${targetStatus}`,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedEvent.id);

      return new Response(JSON.stringify({
        error: 'Invalid booking state transition.',
        currentStatus: booking.status,
        requestedStatus: targetStatus,
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
      payment_provider: PAYMENT_PROVIDER,
      payment_reference: eventId,
      payment_status_updated_at: new Date().toISOString(),
      payment_currency: isSuccess ? webhookCurrency : EXPECTED_CURRENCY,
    };

    if (isSuccess && webhookAmount) {
      updatePayload.payment_amount = webhookAmount;
      updatePayload.payment_confirmed_at = new Date().toISOString();
    }

    const { error: updateError } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', booking.id);

    if (updateError) {
      await admin
        .from('quickwave_webhook_events')
        .update({ processed: true, processing_error: updateError.message, processed_at: new Date().toISOString() })
        .eq('id', insertedEvent.id);

      return new Response(JSON.stringify({ error: 'Failed to update booking status.', details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const latestBooking = { ...booking, status: targetStatus } as BookingRow;
    await sendStatusEmail(latestBooking, targetStatus);

    await admin
      .from('quickwave_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', insertedEvent.id);

    return new Response(JSON.stringify({ ok: true, bookingId: booking.id, status: targetStatus }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
