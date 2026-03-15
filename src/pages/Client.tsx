// pages/Client.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Booking } from '../types/booking';
import type { Caddie, Club } from '../types/entities';
import { fetchBookingByReference, fetchBookingsByEmail } from '../services/database';
import ClientHelpWidget from '../components/ClientHelpWidget';

type Props = {
  clubs: Club[];
  caddies: Caddie[];
};

const Client: React.FC<Props> = ({ clubs, caddies }) => {
  const [searchRef, setSearchRef] = useState('');
  const [foundBooking, setFoundBooking] = useState<Booking | null>(null);

  const handleSearch = async () => {
    const query = searchRef.trim();
    if (!query) return;

    const isReference = /^APX-\d+$/i.test(query);

    if (isReference) {
      const booking = await fetchBookingByReference(query.toUpperCase());
      setFoundBooking(booking);
      return;
    }

    const byEmail = await fetchBookingsByEmail(query.toLowerCase());
    setFoundBooking(byEmail[0] ?? null);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] px-4 py-6 md:px-6">
      <header className="sticky top-4 z-40 mx-auto mb-6 flex max-w-6xl items-center justify-between rounded-full border border-white/60 bg-white/85 px-5 py-3 shadow-lg backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c2b24] text-[#c9a962] shadow-md">⛳</div>
          <span className="font-serif text-xl font-bold text-[#1c2b24]">ApexGolf</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link to="/" className="rounded-full border border-gray-200 px-4 py-2 text-[#1c2b24] transition hover:bg-[#1c2b24] hover:text-white">Book</Link>
          <Link to="/about" className="rounded-full border border-gray-200 px-4 py-2 text-[#1c2b24] transition hover:bg-[#1c2b24] hover:text-white">About</Link>
          <Link to="/help" className="rounded-full border border-gray-200 px-4 py-2 text-[#1c2b24] transition hover:bg-[#1c2b24] hover:text-white">Help</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl">
        <div
          className="relative overflow-hidden rounded-4xl px-8 py-12 text-white shadow-2xl md:px-12 md:py-16"
          style={{ background: 'linear-gradient(135deg, rgba(28,43,36,0.96) 0%, rgba(45,74,62,0.88) 100%)' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,98,0.22),transparent_35%)]" />
          <div className="relative max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-[#c9a962]">ApexGolf Africa</p>
            <h1 className="font-serif text-4xl font-bold md:text-5xl">Find Your Booking</h1>
            <p className="mt-4 text-base leading-7 text-gray-200 md:text-lg">
              Retrieve your round details using your APX reference or the email used during booking.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-md">
          <div className="mb-6 rounded-[28px] border border-[#e9dfca] bg-white p-6 shadow-sm">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                placeholder="Enter booking reference (APX-XXXXX) or email"
                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#c9a962] focus:ring-4 focus:ring-[#c9a962]/10"
              />
              <button
                onClick={handleSearch}
                className="rounded-xl bg-[linear-gradient(135deg,#1c2b24_0%,#2d4a3e_100%)] px-4 py-2 font-medium text-white shadow-md transition hover:-translate-y-0.5"
              >
                Search
              </button>
            </div>
          </div>

          {foundBooking ? (
            <div className="overflow-hidden rounded-[28px] border border-[#e9dfca] bg-white shadow-xl animate-fadeIn">
              <div className="border-b border-[#c9a962]/30 bg-[linear-gradient(135deg,rgba(201,169,98,0.2)_0%,rgba(250,248,245,1)_100%)] p-5 text-center">
                <span className="font-mono text-2xl font-bold text-[#0f281e]">APX-{foundBooking.id.toString().slice(-5)}</span>
                <p className="mt-1 text-sm text-gray-600">Booking Reference</p>
              </div>

              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-sm text-gray-500">Status</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      foundBooking.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : foundBooking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {foundBooking.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm"><span className="text-gray-500">Name:</span> <span className="font-medium">{foundBooking.firstName} {foundBooking.lastName}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Club:</span> <span className="font-medium">{clubs.find((club) => club.id === foundBooking.clubId)?.name}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(foundBooking.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Time:</span> <span className="font-medium">{foundBooking.time}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Caddie:</span> <span className="font-medium">{caddies.find((caddie) => caddie.id === foundBooking.caddieId)?.name}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Players:</span> <span className="font-medium">{foundBooking.players}</span></p>
                </div>

                <div className="mt-4 rounded-2xl bg-[linear-gradient(135deg,#f5f3ef_0%,#ede8e0_100%)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Paid</span>
                    <span className="font-serif text-xl font-bold text-[#0f281e]">Ksh {foundBooking.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Your caddie will greet you at the clubhouse entrance with your Cool Box and all hired equipment ready.
                  </p>
                </div>
              </div>
            </div>
          ) : searchRef ? (
            <div className="rounded-[28px] border border-[#e9dfca] bg-white p-6 text-center text-[#1c2b24] shadow-sm">
              <p>No booking found. Please check your reference number.</p>
            </div>
          ) : null}
        </div>
      </div>

      <ClientHelpWidget />
    </div>
  );
};

export default Client;