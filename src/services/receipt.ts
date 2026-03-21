import { supabase } from '../lib/supabase';

export type BookingReceiptPayload = {
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

export async function sendBookingReceiptEmail(payload: BookingReceiptPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-booking-receipt', {
      body: payload,
    });

    if (error) {
      console.error('Failed to send booking receipt email:', error.message || error);
    }
  } catch (err) {
    console.error('Unexpected error sending booking receipt email:', err);
  }
}
