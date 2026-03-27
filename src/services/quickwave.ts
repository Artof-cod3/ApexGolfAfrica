import { supabase } from '../lib/supabase';

export type QuickwaveCheckoutRequest = {
  bookingReference: string;
  amount: number;
  currency: 'KES';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  successUrl: string;
  cancelUrl: string;
};

type QuickwaveCheckoutResponse = {
  checkoutUrl: string;
  paymentReference?: string;
};

export async function initiateQuickwaveCheckout(
  payload: QuickwaveCheckoutRequest,
): Promise<QuickwaveCheckoutResponse> {
  const { data, error } = await supabase.functions.invoke('initiate-quickwave-payment', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Failed to initiate Quickwave payment.');
  }

  if (!data?.checkoutUrl) {
    throw new Error('Quickwave did not return a checkout URL.');
  }

  return data as QuickwaveCheckoutResponse;
}
