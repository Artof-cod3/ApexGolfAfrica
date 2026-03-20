import { supabase } from '../lib/supabase';

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

export async function sendBookingReceiptEmail(payload: ReceiptPayload): Promise<boolean> {
  const { error } = await supabase.functions.invoke('send-booking-receipt', {
    body: payload,
  });

  if (error) {
    console.error('Failed to send booking receipt email:', error);
    return false;
  }

  return true;
}
