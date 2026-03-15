// pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import BookingForm from '../components/BookingForm';
import ClientHelpWidget from '../components/ClientHelpWidget';
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
    <div className="min-h-screen bg-[#faf8f5] pb-28 pt-6">
      <header className="sticky top-4 z-40 mx-auto mb-6 flex max-w-6xl items-center justify-between rounded-full border border-white/60 bg-white/85 px-5 py-3 shadow-lg backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c2b24] text-[#c9a962] shadow-md">⛳</div>
          <span className="font-serif text-xl font-bold text-[#1c2b24]">ApexGolf</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link to="/client" className="rounded-full border border-gray-200 px-4 py-2 text-[#1c2b24] transition hover:bg-[#1c2b24] hover:text-white">
            Find Booking
          </Link>
          <Link to="/about" className="rounded-full border border-gray-200 px-4 py-2 text-[#1c2b24] transition hover:bg-[#1c2b24] hover:text-white">
            About
          </Link>
          <Link to="/help" className="rounded-full border border-gray-200 px-4 py-2 text-[#1c2b24] transition hover:bg-[#1c2b24] hover:text-white">
            Customer Help
          </Link>
        </div>
      </header>

      <BookingForm bookings={bookings} setBookings={setBookings} clubs={clubs} caddies={caddies} />
      <ClientHelpWidget />
    </div>
  );
};

export default Home;