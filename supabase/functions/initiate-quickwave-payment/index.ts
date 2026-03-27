export {};
declare const Deno: any;

type QuickwavePayload = {
  bookingReference: string;
  amount: number;
  currency: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  successUrl: string;
  cancelUrl: string;
  identifier?: string;
  real?: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;

  return value;
}

function buildAuthorizationKey(input: {
  publicKey: string;
  privateKey: string;
  walletId: string;
  amount: number;
  timestamp: number;
}): string {
  const payload = {
    publicKey: input.publicKey,
    privateKey: input.privateKey,
    amount: input.amount,
    walletId: input.walletId,
    timestamp: input.timestamp,
  };

  const json = JSON.stringify(payload);
  return btoa(json);
}

function resolveInitiateEndpoint(apiBaseUrl: string): string {
  const base = apiBaseUrl.replace(/\/$/, '');
  if (base.endsWith('/api/v1')) {
    return `${base}/payment/initiate`;
  }
  return `${base}/api/v1/payment/initiate`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('QUICKWAVE_API_KEY');
    const publicKey = (Deno.env.get('QUICKWAVE_PUBLIC_KEY') || '').trim();
    const privateKey = (Deno.env.get('QUICKWAVE_PRIVATE_KEY') || '').trim();
    const walletId = (Deno.env.get('QUICKWAVE_WALLET_ID') || '').trim();
    const apiBaseUrl = (Deno.env.get('QUICKWAVE_API_BASE_URL') || '').trim();
    const hasKeyAuth = Boolean(publicKey && privateKey && walletId);
    const hasApiKeyAuth = Boolean(apiKey);

    if ((!hasApiKeyAuth && !hasKeyAuth) || !apiBaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing Quickwave auth secrets. Set either QUICKWAVE_API_KEY or QUICKWAVE_PUBLIC_KEY + QUICKWAVE_PRIVATE_KEY + QUICKWAVE_WALLET_ID, plus QUICKWAVE_API_BASE_URL.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const body = (await req.json()) as Partial<QuickwavePayload>;

    if (!body.bookingReference || !body.email || !body.firstName || !body.lastName || !body.phone || !body.successUrl || !body.cancelUrl) {
      return new Response(JSON.stringify({ error: 'Missing required payment fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amount = Number(body.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid payment amount.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const endpoint = resolveInitiateEndpoint(apiBaseUrl);
    const timestamp = Date.now();
    const authorizationKey = hasKeyAuth
      ? buildAuthorizationKey({
          publicKey,
          privateKey,
          walletId,
          amount,
          timestamp,
        })
      : null;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (hasApiKeyAuth && apiKey) {
      requestHeaders.Authorization = `Bearer ${apiKey}`;
    }

    if (authorizationKey) {
      requestHeaders.authorizationKey = authorizationKey;
    }

    const quickwaveResponse = await fetch(endpoint, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        authorizationKey,
        amount,
        currency: body.currency || 'KES',
        reference: body.bookingReference,
        redirectUrl: body.successUrl,
        phoneNumber: normalizePhone(body.phone),
        ...(body.identifier ? { identifier: body.identifier } : {}),
        ...(typeof body.real === 'boolean' ? { real: body.real } : {}),
      }),
    });

    if (!quickwaveResponse.ok) {
      const quickwaveError = await quickwaveResponse.text();
      return new Response(JSON.stringify({ error: quickwaveError }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await quickwaveResponse.json();
    const checkoutUrl =
      result?.checkout_url ||
      result?.checkoutUrl ||
      result?.payment_url ||
      result?.paymentUrl ||
      result?.data?.checkout_url ||
      result?.data?.checkoutUrl ||
      result?.data?.payment_url ||
      result?.data?.paymentUrl;

    if (!checkoutUrl) {
      return new Response(JSON.stringify({ error: 'Quickwave response did not include checkout URL.', raw: result }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        checkoutUrl,
        paymentReference:
          result?.reference ||
          result?.data?.reference ||
          result?.data?.waveTransactionId ||
          body.bookingReference,
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
