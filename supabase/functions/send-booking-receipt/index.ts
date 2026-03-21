type ReceiptBody = {
  bookingReference: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  clubName: string;
  caddieName: string;
  date: string;
  time: string;
  players: number;
  total: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') || 'ApexGolf Africa <bookings@apexgolf.africa>';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing RESEND_API_KEY in Supabase secrets' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const body = (await req.json()) as Partial<ReceiptBody>;

    if (!body.email || !body.bookingReference || !body.firstName || !body.lastName) {
      return new Response(JSON.stringify({ error: 'Missing required receipt fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const total = Number(body.total ?? 0);
    const players = Number(body.players ?? 0);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1f2937;">
        <h2 style="margin-bottom: 4px; color: #0f281e;">Booking Confirmed</h2>
        <p style="margin-top: 0; color: #4b5563;">Thank you for booking with ApexGolf Africa.</p>

        <div style="margin: 20px 0; padding: 14px 18px; border: 1px solid #e5d5a8; background: #f8f6f1; border-radius: 12px;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">Booking Reference</div>
          <div style="font-size: 24px; font-weight: 700; color: #0f281e; letter-spacing: 1px;">${body.bookingReference}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Name</td><td style="padding: 8px 0; font-weight: 600;">${body.firstName} ${body.lastName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Phone</td><td style="padding: 8px 0; font-weight: 600;">${body.phone ?? '-'}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Club</td><td style="padding: 8px 0; font-weight: 600;">${body.clubName ?? '-'}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="padding: 8px 0; font-weight: 600;">${formatDate(String(body.date ?? ''))}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Time</td><td style="padding: 8px 0; font-weight: 600;">${body.time ?? '-'}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Players</td><td style="padding: 8px 0; font-weight: 600;">${players}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Caddie</td><td style="padding: 8px 0; font-weight: 600;">${body.caddieName ?? '-'}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Total Paid</td><td style="padding: 8px 0; font-weight: 700; color: #0f281e;">Ksh ${total.toLocaleString('en-KE')}</td></tr>
        </table>

        <p style="margin-top: 20px; color: #4b5563;">Your caddie will greet you at the clubhouse entrance with your selected setup ready.</p>
        <p style="margin-top: 22px; font-size: 12px; color: #9ca3af;">ApexGolf Africa • Reach the Apex of Golf Service</p>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [body.email],
        subject: `ApexGolf Booking Confirmation: ${body.bookingReference}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      return new Response(JSON.stringify({ error: resendError }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await resendResponse.json();

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
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
