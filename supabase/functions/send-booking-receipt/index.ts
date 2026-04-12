export {};
declare const Deno: any;

type ReceiptBody = {
  templateType?: 'booking_pending_payment' | 'payment_confirmed' | 'payment_cancelled';
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
  supportPhone?: string;
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

function buildEmailTemplate(payload: Required<ReceiptBody>): { subject: string; html: string } {
  const templateType = payload.templateType;
  const formattedDate = formatDate(payload.date);
  const total = Number(payload.total || 0).toLocaleString('en-KE');

  const commonDetails = `
    <div style="padding:8px 20px 0;">
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;width:42%;">Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${payload.firstName} ${payload.lastName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Phone</td>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${payload.phone || '-'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Club</td>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${payload.clubName || '-'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Date</td>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Time</td>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${payload.time || '-'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Players</td>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${payload.players}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#536745;font-weight:600;">Caddie</td>
          <td style="padding:10px 0;border-bottom:1px solid #edf1eb;color:#2f3729;font-weight:700;text-align:right;">${payload.caddieName || '-'}</td>
        </tr>
      </table>
    </div>
  `;

  const headerByTemplate: Record<Required<ReceiptBody>['templateType'], { badge: string; title: string; subtitle: string; subject: string; amountLabel: string; accent: string }> = {
    booking_pending_payment: {
      badge: 'Payment Pending',
      title: 'Booking Reserved',
      subtitle: 'Your booking is reserved while payment is completed.',
      subject: `ApexGolf Booking Reserved: ${payload.bookingReference}`,
      amountLabel: 'Amount Due',
      accent: '#9a7f30',
    },
    payment_confirmed: {
      badge: 'Payment Verified',
      title: 'Booking Confirmed',
      subtitle: 'Your payment has been verified and your booking is confirmed.',
      subject: `ApexGolf Payment Verified: ${payload.bookingReference}`,
      amountLabel: 'Total Paid',
      accent: '#2f3729',
    },
    payment_cancelled: {
      badge: 'Payment Cancelled',
      title: 'Booking Cancelled',
      subtitle: 'Your payment was not completed. You can book again anytime.',
      subject: `ApexGolf Payment Cancelled: ${payload.bookingReference}`,
      amountLabel: 'Cancelled Amount',
      accent: '#7a2e2e',
    },
  };

  const selection = headerByTemplate[templateType];

  const html = `
    <div style="margin:0;padding:24px 10px;background:#f2f4ef;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #dde4d8;border-radius:18px;overflow:hidden;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f2937;box-shadow:0 16px 40px -24px rgba(15,40,30,0.55);">
        <div style="padding:22px 20px 30px;background:linear-gradient(180deg,#e8ebe4 0%,#f7f8f5 65%,#ffffff 100%);text-align:center;border-bottom:1px solid #e6ece2;">
          <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:${selection.accent};color:#ffffff;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:700;">${selection.badge}</div>
          <h1 style="margin:14px 0 6px;font-size:30px;line-height:1.2;color:#2f3729;font-family:Georgia,'Times New Roman',serif;">${selection.title}</h1>
          <p style="margin:0;font-size:13px;color:#536745;">${selection.subtitle}</p>
        </div>

        <div style="padding:18px 20px 8px;">
          <div style="border:1px solid #d1d8c9;border-radius:14px;background:linear-gradient(135deg,#f6f7f4 0%,#eef2ea 100%);padding:16px 16px 18px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b8259;letter-spacing:1.2px;text-transform:uppercase;">Booking Reference</p>
            <p style="margin:0 0 8px;font-size:30px;line-height:1.2;font-weight:800;letter-spacing:1.1px;color:#374230;">${payload.bookingReference}</p>
            <p style="margin:0;font-size:12px;color:#536745;">Keep this reference for support and quick lookup.</p>
          </div>
        </div>

        ${commonDetails}

        <div style="padding:16px 20px 0;">
          <div style="background:${selection.accent};border-radius:14px;padding:16px 18px;color:#ffffff;">
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d1d8c9;font-weight:700;">${selection.amountLabel}</td>
                <td style="text-align:right;font-size:27px;line-height:1.2;font-weight:800;color:#ffffff;">Ksh ${total}</td>
              </tr>
            </table>
          </div>
        </div>

        <div style="padding:14px 20px 0;">
          <div style="background:#f6f7f4;border-left:4px solid #6b8259;border-radius:0 10px 10px 0;padding:12px 12px 12px 14px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#435239;">Need help? Contact support at ${payload.supportPhone || '+254700000000'}.</p>
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

  return {
    subject: selection.subject,
    html,
  };
}

function buildWhatsAppText(payload: Required<ReceiptBody>): string {
  const statusTextByTemplate: Record<Required<ReceiptBody>['templateType'], string> = {
    booking_pending_payment: 'Your booking is reserved and waiting for payment confirmation.',
    payment_confirmed: 'Your payment is confirmed and your booking is now fully confirmed.',
    payment_cancelled: 'Your payment was not completed and this booking has been cancelled.',
  };

  return [
    'ApexGolf Africa',
    `${payload.firstName}, ${statusTextByTemplate[payload.templateType]}`,
    `Reference: ${payload.bookingReference}`,
    `Club: ${payload.clubName}`,
    `Date: ${formatDate(payload.date)} at ${payload.time}`,
    `Players: ${payload.players}`,
    `Amount: Ksh ${Number(payload.total || 0).toLocaleString('en-KE')}`,
  ].join('\n');
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

    const normalizedPayload: Required<ReceiptBody> = {
      templateType: body.templateType ?? 'payment_confirmed',
      bookingReference: String(body.bookingReference),
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      email: String(body.email),
      phone: String(body.phone ?? ''),
      clubName: String(body.clubName ?? '-'),
      caddieName: String(body.caddieName ?? '-'),
      date: String(body.date ?? ''),
      time: String(body.time ?? ''),
      players: Number(body.players ?? 0),
      total: Number(body.total ?? 0),
      supportPhone: String(body.supportPhone ?? Deno.env.get('CUSTOMER_CARE_PHONE') ?? Deno.env.get('SUPPORT_WHATSAPP_NUMBER') ?? '+254700000000'),
    };

    const { subject, html } = buildEmailTemplate(normalizedPayload);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [body.email],
        subject,
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

    let whatsappSent = false;
    const whatsappWebhookUrl = (Deno.env.get('WHATSAPP_NOTIFIER_WEBHOOK_URL') || '').trim();
    if (whatsappWebhookUrl && normalizedPayload.phone) {
      const whatsappMessage = buildWhatsAppText(normalizedPayload);
      const whatsappResponse = await fetch(whatsappWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: normalizedPayload.phone,
          bookingReference: normalizedPayload.bookingReference,
          templateType: normalizedPayload.templateType,
          message: whatsappMessage,
        }),
      });

      whatsappSent = whatsappResponse.ok;
    }

    const result = await resendResponse.json();

    return new Response(JSON.stringify({ ok: true, id: result.id, whatsappSent }), {
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
