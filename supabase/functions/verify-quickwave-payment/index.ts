export {};
declare const Deno: any;

// @ts-expect-error Deno edge functions support URL imports at runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type VerifyPayload = {
  bookingReference?: string;
  bookingId?: number;
  receiptNumber?: string;
  transactionId?: string;
  statusHint?: string;
};

type BookingRow = {
  id: number;
  booking_reference: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  players: number;
  total: number;
  club_name: string | null;
  caddie_name: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUCCESS_HINTS = ['success', 'successful', 'paid', 'completed', 'confirmed'];
const CANCEL_HINTS = ['cancel', 'cancelled', 'canceled', 'failed', 'declined', 'reversed', 'voided'];

function normalizeStatus(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function isSuccessStatus(status: string): boolean {
  return SUCCESS_HINTS.some((hint) => status.includes(hint));
}

function isCancelledStatus(status: string): boolean {
  return CANCEL_HINTS.some((hint) => status.includes(hint));
}

function buildAuthorizationKey(input: {
  publicKey: string;
  privateKey: string;
  walletId: string;
  amount: number;
  timestamp: number;
}): string {
  const json = JSON.stringify(input);
  return btoa(json);
}

function extractVerificationStatus(payload: any): string {
  return normalizeStatus(
    payload?.status ||
      payload?.payment_status ||
      payload?.data?.status ||
      payload?.data?.payment_status ||
      payload?.transaction?.status ||
      payload?.data?.transaction?.status ||
      payload?.event ||
      payload?.type,
  );
}

async function notifyStatusEmail(admin: any, booking: BookingRow, templateType: 'payment_confirmed' | 'payment_cancelled'): Promise<void> {
  try {
    await admin.functions.invoke('send-booking-receipt', {
      body: {
        templateType,
        bookingReference: booking.booking_reference ?? `APX-${booking.id}`,
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        phone: booking.phone,
        clubName: booking.club_name ?? 'Selected Club',
        caddieName: booking.caddie_name ?? 'Assigned at Club',
        date: booking.date,
        time: booking.time,
        players: booking.players,
        total: booking.total,
      },
    });
  } catch (error) {
    console.error('Failed to trigger status email from verify-quickwave-payment:', error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as VerifyPayload;
    const bookingReference = String(body.bookingReference ?? '').trim().toUpperCase();
    const bookingId = Number(body.bookingId ?? 0) || null;
    const receiptNumber = String(body.receiptNumber ?? '').trim();
    const transactionId = String(body.transactionId ?? '').trim();
    const statusHint = normalizeStatus(body.statusHint);
    const hasPaymentProof = Boolean(receiptNumber || transactionId);

    if (!bookingReference && !bookingId) {
      return new Response(JSON.stringify({ error: 'bookingReference or bookingId is required.' }), {
        status: 400,
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

    let bookingQuery = admin.from('bookings').select('*');
    if (bookingReference) {
      bookingQuery = bookingQuery.eq('booking_reference', bookingReference);
    } else if (bookingId) {
      bookingQuery = bookingQuery.eq('id', bookingId);
    }

    const { data: booking, error: bookingError } = await bookingQuery.single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bookingRow = booking as BookingRow;
    if (bookingRow.status === 'confirmed' || bookingRow.status === 'cancelled') {
      return new Response(
        JSON.stringify({
          status: bookingRow.status,
          bookingId: bookingRow.id,
          bookingReference: bookingRow.booking_reference ?? `APX-${bookingRow.id}`,
          message: 'Booking already finalized.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const verifyEndpoint = String(Deno.env.get('QUICKWAVE_VERIFY_ENDPOINT') ?? '').trim();
    const quickwaveApiBase = String(Deno.env.get('QUICKWAVE_API_BASE_URL') ?? '').trim().replace(/\/$/, '');
    const fallbackVerifyEndpoint = quickwaveApiBase ? `${quickwaveApiBase}/api/v1/payment/verify` : '';
    const targetVerifyEndpoint = verifyEndpoint || fallbackVerifyEndpoint;

    const apiKey = String(Deno.env.get('QUICKWAVE_API_KEY') ?? '').trim();
    const publicKey = String(Deno.env.get('QUICKWAVE_PUBLIC_KEY') ?? '').trim();
    const privateKey = String(Deno.env.get('QUICKWAVE_PRIVATE_KEY') ?? '').trim();
    const walletId = String(Deno.env.get('QUICKWAVE_WALLET_ID') ?? '').trim();
    const hasKeyAuth = Boolean(publicKey && privateKey && walletId);

    let verificationStatus = '';

    if (targetVerifyEndpoint) {
      const timestamp = Date.now();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      if (hasKeyAuth) {
        headers.authorizationKey = buildAuthorizationKey({
          publicKey,
          privateKey,
          walletId,
          amount: Number(bookingRow.total ?? 0),
          timestamp,
        });
      }

      const query = new URLSearchParams();
      if (bookingRow.booking_reference) query.set('reference', bookingRow.booking_reference);
      if (receiptNumber) query.set('receipt', receiptNumber);
      if (transactionId) query.set('transactionId', transactionId);

      const getUrl = query.toString() ? `${targetVerifyEndpoint}?${query.toString()}` : targetVerifyEndpoint;

      let verificationResponse = await fetch(getUrl, {
        method: 'GET',
        headers,
      });

      if (!verificationResponse.ok) {
        verificationResponse = await fetch(targetVerifyEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            reference: bookingRow.booking_reference,
            bookingReference: bookingRow.booking_reference,
            receiptNumber,
            transactionId,
          }),
        });
      }

      if (verificationResponse.ok) {
        const verificationBody = await verificationResponse.json().catch(() => ({}));
        verificationStatus = extractVerificationStatus(verificationBody);
      }
    }

    if (!verificationStatus && statusHint) {
      if (isCancelledStatus(statusHint)) {
        verificationStatus = statusHint;
      } else if (isSuccessStatus(statusHint) && hasPaymentProof) {
        verificationStatus = statusHint;
      }
    }

    let nextStatus: 'confirmed' | 'cancelled' | 'pending' = 'pending';
    if (isSuccessStatus(verificationStatus)) {
      nextStatus = 'confirmed';
    } else if (isCancelledStatus(verificationStatus)) {
      nextStatus = 'cancelled';
    }

    if (nextStatus === 'confirmed' && !hasPaymentProof) {
      nextStatus = 'pending';
    }

    if (nextStatus === 'cancelled' && !hasPaymentProof && !isCancelledStatus(statusHint)) {
      nextStatus = 'pending';
    }

    if (nextStatus === 'pending') {
      return new Response(
        JSON.stringify({
          status: 'pending',
          bookingId: bookingRow.id,
          bookingReference: bookingRow.booking_reference ?? `APX-${bookingRow.id}`,
          message: 'Payment is still pending verification.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      payment_provider: 'quickwave',
      payment_status_updated_at: new Date().toISOString(),
      payment_reference: receiptNumber || transactionId || bookingRow.booking_reference,
      payment_currency: 'KES',
    };

    if (nextStatus === 'confirmed') {
      updatePayload.payment_confirmed_at = new Date().toISOString();
      updatePayload.payment_amount = Number(bookingRow.total ?? 0);
    }

    const { error: updateError } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingRow.id)
      .eq('status', 'pending');

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update booking.', details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await notifyStatusEmail(admin, bookingRow, nextStatus === 'confirmed' ? 'payment_confirmed' : 'payment_cancelled');

    return new Response(
      JSON.stringify({
        status: nextStatus,
        bookingId: bookingRow.id,
        bookingReference: bookingRow.booking_reference ?? `APX-${bookingRow.id}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
