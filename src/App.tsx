// App.tsx
import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Admin from './pages/Admin.tsx';
import Client from './pages/Client.tsx';
import Help from './pages/Help.tsx';
import About from './pages/About.tsx';
import SuperAdmin from './pages/SuperAdmin.tsx';
import type { Booking } from './types/booking';
import type { AdminUser, Caddie, Club } from './types/entities';
import { fetchAdminUsers, fetchBookings, fetchCaddies, fetchClubs } from './services/database';
import AdminInstallPrompt from './components/AdminInstallPrompt';

const App: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clubs, setClubs] = useState<Club[]>([
    { id: 1, name: 'Karen Country Club', location: 'Karen, Nairobi', ratePerPlayer: 4500 },
    { id: 2, name: 'Muthaiga Golf Club', location: 'Muthaiga, Nairobi', ratePerPlayer: 5000 },
    { id: 3, name: 'Vipingo Ridge', location: 'Kilifi, Coast', ratePerPlayer: 6000 },
    { id: 4, name: 'Vetlab Sports Club', location: 'Westlands, Nairobi', ratePerPlayer: 3500 },
    { id: 5, name: 'Limuru Country Club', location: 'Limuru, Kiambu', ratePerPlayer: 4000 },
    { id: 6, name: 'Great Rift Valley Lodge', location: 'Naivasha', ratePerPlayer: 5500 },
  ]);
  const [caddies, setCaddies] = useState<Caddie[]>([
    {
      id: 1,
      name: 'James Mwangi',
      specialty: 'Karen & Muthaiga specialist',
      exp: '6 yrs experience',
      rating: 4.9,
      rounds: 312,
      topRated: true,
      initials: 'JM',
      color: 'bg-green-900',
    },
    {
      id: 2,
      name: 'Peter Otieno',
      specialty: 'Vipingo Ridge expert',
      exp: 'Coastal course knowledge',
      rating: 4.8,
      rounds: 247,
      topRated: false,
      initials: 'PO',
      color: 'bg-yellow-800',
    },
    {
      id: 3,
      name: 'Grace Wanjiku',
      specialty: 'All-clubs',
      exp: 'Fluent English & Swahili',
      rating: 5.0,
      rounds: 198,
      topRated: true,
      initials: 'GW',
      color: 'bg-blue-900',
    },
    {
      id: 4,
      name: 'David Kipchoge',
      specialty: 'Rift Valley specialist',
      exp: 'First aid certified',
      rating: 4.7,
      rounds: 156,
      topRated: false,
      initials: 'DK',
      color: 'bg-stone-800',
    },
  ]);
  const [admins, setAdmins] = useState<AdminUser[]>([
    {
      id: 1,
      name: 'Super Admin',
      email: 'superadmin@apexgolf.africa',
      password: 'Super@2026',
      role: 'super-admin',
      permissions: {
        canEditBookings: true,
        canManageClubs: true,
        canManageCaddies: true,
        canManageClubRates: true,
        canViewTransactions: true,
      },
    },
    {
      id: 2,
      name: 'Operations Admin',
      email: 'admin@apexgolf.africa',
      password: 'Apex@2026',
      role: 'admin',
      permissions: {
        canEditBookings: true,
        canManageClubs: true,
        canManageCaddies: true,
        canManageClubRates: true,
        canViewTransactions: false,
      },
    },
  ]);

  useEffect(() => {
    const loadData = async () => {
      const [dbBookings, dbClubs, dbCaddies, dbAdmins] = await Promise.all([
        fetchBookings(),
        fetchClubs(),
        fetchCaddies(),
        fetchAdminUsers(),
      ]);

      if (dbBookings.length > 0) setBookings(dbBookings);
      if (dbClubs.length > 0) setClubs(dbClubs);
      if (dbCaddies.length > 0) setCaddies(dbCaddies);
      if (dbAdmins.length > 0) setAdmins(dbAdmins);
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F0F2F5' }}>
      <AdminInstallPrompt />
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={<Home bookings={bookings} setBookings={setBookings} clubs={clubs} caddies={caddies} />}
          />
          <Route path="/client" element={<Client clubs={clubs} caddies={caddies} />} />
          <Route path="/help" element={<Help />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/admin"
            element={
              <Admin
                bookings={bookings}
                setBookings={setBookings}
                clubs={clubs}
                setClubs={setClubs}
                caddies={caddies}
                setCaddies={setCaddies}
                admins={admins}
              />
            }
          />
          <Route
            path="/super-admin"
            element={
              <SuperAdmin
                admins={admins}
                setAdmins={setAdmins}
                bookings={bookings}
                setBookings={setBookings}
                clubs={clubs}
                setClubs={setClubs}
                caddies={caddies}
                setCaddies={setCaddies}
              />
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-[#C9A962]/25 bg-[#0F1F17] px-4 py-4 text-center text-sm text-[#E5D5A8]">
        © 2026 ApexGolf Africa. All Rights Reserved.
      </footer>
    </div>
  );
};

export default App;
