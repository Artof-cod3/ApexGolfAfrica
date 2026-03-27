import { supabase } from '../lib/supabase';
import type { Booking } from '../types/booking';
import type { Caddie, Club } from '../types/entities';

type CommunicationTemplate = 'booking_pending_payment' | 'payment_confirmed' | 'payment_cancelled';

type NotifyBookingInput = {
  booking: Booking;
  clubs: Club[];
  caddies: Caddie[];
  templateType: CommunicationTemplate;
};

export async function notifyCustomerForBooking(input: NotifyBookingInput): Promise<void> {
  const { booking, clubs, caddies, templateType } = input;

  if (!booking.email) return;

  const clubName = clubs.find((club) => club.id === booking.clubId)?.name ?? 'Selected Club';
  const caddieName = caddies.find((caddie) => caddie.id === booking.caddieId)?.name ?? 'Assigned at Club';

  const payload = {
    templateType,
    bookingReference: booking.bookingReference ?? `APX-${booking.id}`,
    firstName: booking.firstName,
    lastName: booking.lastName,
    email: booking.email,
    phone: booking.phone,
    clubName,
    caddieName,
    date: booking.date,
    time: booking.time,
    players: booking.players,
    total: booking.total,
  };

  const { error } = await supabase.functions.invoke('send-booking-receipt', {
    body: payload,
  });

  if (error) {
    console.error('Customer communication automation failed:', error);
  }
}
