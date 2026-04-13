export {};
declare const Deno: any;

// @ts-expect-error Deno edge functions support URL imports at runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const body = (await req.json()) as {
      bookingId?: number;
      bookingReference?: string;
      amount?: number;
    };

    const bookingId = Number(body.bookingId ?? 0) || null;
    const bookingReference = String(body.bookingReference ?? '').trim().toUpperCase();
    const amount = Number(body.amount ?? 0) || null;

    if (!bookingId && !bookingReference) {
      return new Response(
        JSON.stringify({ error: 'bookingId or bookingReference is required.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    let bookingQuery = admin.from('bookings').select('*');
    if (bookingId) {
      bookingQuery = bookingQuery.eq('id', bookingId);
    } else if (bookingReference) {
      bookingQuery = bookingQuery.eq('booking_reference', bookingReference);
    }

    const { data: booking, error: bookingError } = await bookingQuery.single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const updatePayload: Record<string, unknown> = {
      status: 'confirmed',
      payment_status_updated_at: new Date().toISOString(),
      payment_confirmed_at: new Date().toISOString(),
    };

    if (amount !== null) {
      updatePayload.payment_amount = amount;
    } else if (!booking.payment_amount) {
      updatePayload.payment_amount = booking.total;
    }

    const { error: updateError } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', booking.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to confirm booking.', details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        bookingId: booking.id,
        bookingReference: booking.booking_reference ?? `APX-${booking.id}`,
        message: 'Booking confirmed successfully.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
