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

type VerifyQuickwavePaymentRequest = {
  bookingReference: string;
  bookingId?: number;
  receiptNumber?: string;
  transactionId?: string;
  statusHint?: string;
};

type VerifyQuickwavePaymentResponse = {
  status: 'confirmed' | 'pending' | 'cancelled' | 'failed';
  bookingId?: number;
  bookingReference?: string;
  message?: string;
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

export async function verifyQuickwavePayment(
  payload: VerifyQuickwavePaymentRequest,
): Promise<VerifyQuickwavePaymentResponse> {
  const { data, error } = await supabase.functions.invoke('verify-quickwave-payment', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Failed to verify Quickwave payment.');
  }

  return (data ?? { status: 'failed' }) as VerifyQuickwavePaymentResponse;
}
