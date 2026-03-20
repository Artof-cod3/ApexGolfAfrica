const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReceiptPayload = {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') ?? 'ApexGolf Africa <bookings@apexgolf.africa>';

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing RESEND_API_KEY secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = (await req.json()) as Partial<ReceiptPayload>;

    if (!payload.email || !payload.bookingReference || !payload.firstName || !payload.lastName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const subject = `Booking Confirmed: ${payload.bookingReference}`;

    const html = `
      <div style="font-family: Georgia, 'Times New Roman', serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin: 0 0 12px; color: #0f281e;">ApexGolf Africa Booking Receipt</h2>
        <p style="margin: 0 0 16px;">Hi ${payload.firstName}, your booking has been confirmed.</p>
        <div style="border: 1px solid #e5d4a1; border-radius: 12px; padding: 16px; background: #faf8f5;">
          <p style="margin: 0 0 8px;"><strong>Reference:</strong> ${payload.bookingReference}</p>
          <p style="margin: 0 0 8px;"><strong>Name:</strong> ${payload.firstName} ${payload.lastName}</p>
          <p style="margin: 0 0 8px;"><strong>Club:</strong> ${payload.clubName}</p>
          <p style="margin: 0 0 8px;"><strong>Date:</strong> ${payload.date}</p>
          <p style="margin: 0 0 8px;"><strong>Time:</strong> ${payload.time}</p>
          <p style="margin: 0 0 8px;"><strong>Caddie:</strong> ${payload.caddieName}</p>
          <p style="margin: 0 0 8px;"><strong>Players:</strong> ${payload.players}</p>
          <p style="margin: 0;"><strong>Total Paid:</strong> Ksh ${Number(payload.total ?? 0).toLocaleString()}</p>
        </div>
        <p style="margin: 16px 0 0; color: #4b5563;">Your caddie will greet you at the clubhouse entrance with your selected setup ready.</p>
      </div>
    `;

    const text = [
      'ApexGolf Africa Booking Receipt',
      `Reference: ${payload.bookingReference}`,
      `Name: ${payload.firstName} ${payload.lastName}`,
      `Club: ${payload.clubName}`,
      `Date: ${payload.date}`,
      `Time: ${payload.time}`,
      `Caddie: ${payload.caddieName}`,
      `Players: ${payload.players}`,
      `Total Paid: Ksh ${Number(payload.total ?? 0).toLocaleString()}`,
    ].join('\n');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.email],
        subject,
        html,
        text,
      }),
    });

    const responseBody = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: responseBody }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true, data: responseBody }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
