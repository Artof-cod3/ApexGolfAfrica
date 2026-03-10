// pages/Client.tsx
import React, { useState } from 'react';
import type { Booking } from '../types/booking';
import type { Caddie, Club } from '../types/entities';
import { fetchBookingByReference, fetchBookingsByEmail } from '../services/database';

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
    <div className="min-h-screen bg-[#0f281e] p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-white mb-2">ApexGolf <span className="text-[#c5a059] italic">Africa</span></h1>
          <p className="text-gray-300 text-sm">Find your booking</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-xl mb-6">
          <div className="flex gap-2">
            <input 
              type="text"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              placeholder="Enter booking reference (APX-XXXXX) or email"
              className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#c5a059]"
            />
            <button 
              onClick={handleSearch}
              className="bg-[#c5a059] text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition"
            >
              Search
            </button>
          </div>
        </div>

        {foundBooking ? (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden animate-fadeIn">
            <div className="bg-[#c5a059]/20 p-4 text-center border-b border-[#c5a059]/30">
              <span className="font-mono text-2xl font-bold text-[#0f281e]">
                APX-{foundBooking.id.toString().slice(-5)}
              </span>
              <p className="text-sm text-gray-600 mt-1">Booking Reference</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-500 text-sm">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  foundBooking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  foundBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {foundBooking.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm"><span className="text-gray-500">Name:</span> <span className="font-medium">{foundBooking.firstName} {foundBooking.lastName}</span></p>
                <p className="text-sm"><span className="text-gray-500">Club:</span> <span className="font-medium">{clubs.find(c => c.id === foundBooking.clubId)?.name}</span></p>
                <p className="text-sm"><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(foundBooking.date).toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</span></p>
                <p className="text-sm"><span className="text-gray-500">Time:</span> <span className="font-medium">{foundBooking.time}</span></p>
                <p className="text-sm"><span className="text-gray-500">Caddie:</span> <span className="font-medium">{caddies.find(c => c.id === foundBooking.caddieId)?.name}</span></p>
                <p className="text-sm"><span className="text-gray-500">Players:</span> <span className="font-medium">{foundBooking.players}</span></p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="font-serif text-xl font-bold text-[#0f281e]">Ksh {foundBooking.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-xs text-gray-500">
                  Your caddie will greet you at the clubhouse entrance with your Cool Box and all hired equipment ready.
                </p>
              </div>
            </div>
          </div>
        ) : searchRef && (
          <div className="bg-white/10 rounded-xl p-6 text-center text-white">
            <p>No booking found. Please check your reference number.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Client;