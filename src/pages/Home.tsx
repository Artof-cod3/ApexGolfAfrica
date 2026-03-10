// pages/Home.tsx
import React from 'react';
import BookingForm from '../components/BookingForm';
import type { Booking } from '../types/booking';
import type { Caddie, Club } from '../types/entities';

type Props = {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  clubs: Club[];
  caddies: Caddie[];
};

const Home: React.FC<Props> = ({ bookings, setBookings, clubs, caddies }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <BookingForm bookings={bookings} setBookings={setBookings} clubs={clubs} caddies={caddies} />
    </div>
  );
};

export default Home;