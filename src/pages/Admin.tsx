// pages/Admin.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Booking } from '../types/booking';
import type { AdminUser, Caddie, Club } from '../types/entities';
import {
  createCaddie,
  createClub,
  deleteBooking as deleteBookingFromDb,
  deleteCaddie,
  deleteClub,
  loginAdmin,
  updateBooking,
  updateClub,
} from '../services/database';

type Props = {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  clubs: Club[];
  setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
  caddies: Caddie[];
  setCaddies: React.Dispatch<React.SetStateAction<Caddie[]>>;
  admins: AdminUser[];
};

type NavView = 'dashboard' | 'organizations' | 'caddies' | 'members' | 'loginHistory' | 'transactions';

const AUTH_SESSION_KEY = 'apex_admin_session';

const colorOptions = ['bg-green-900', 'bg-blue-900', 'bg-yellow-800', 'bg-stone-800', 'bg-emerald-900'];

const getInitials = (name: string) =>
  name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const Admin: React.FC<Props> = ({
  bookings,
  setBookings,
  clubs,
  setClubs,
  caddies,
  setCaddies,
  admins,
}) => {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [clubName, setClubName] = useState('');
  const [clubLocation, setClubLocation] = useState('');
  const [clubRate, setClubRate] = useState(3500);

  const [caddieName, setCaddieName] = useState('');
  const [caddieSpecialty, setCaddieSpecialty] = useState('');
  const [caddieExperience, setCaddieExperience] = useState('');

  useEffect(() => {
    const storedSession = localStorage.getItem(AUTH_SESSION_KEY);
    if (!storedSession) return;

    try {
      const parsed = JSON.parse(storedSession) as { email: string; role: 'admin' | 'super-admin' };
      const matched = admins.find((admin) => admin.email === parsed.email && admin.role === parsed.role);
      if (matched) setCurrentAdmin(matched);
    } catch {
      setCurrentAdmin(null);
    }
  }, [admins]);

  const canEditBookings = useMemo(
    () => currentAdmin?.role === 'super-admin' || Boolean(currentAdmin?.permissions.canEditBookings),
    [currentAdmin],
  );
  const canManageClubs = useMemo(
    () => currentAdmin?.role === 'super-admin' || Boolean(currentAdmin?.permissions.canManageClubs),
    [currentAdmin],
  );
  const canManageCaddies = useMemo(
    () => currentAdmin?.role === 'super-admin' || Boolean(currentAdmin?.permissions.canManageCaddies),
    [currentAdmin],
  );
  const canManageClubRates = useMemo(
    () => currentAdmin?.role === 'super-admin' || Boolean(currentAdmin?.permissions.canManageClubRates),
    [currentAdmin],
  );

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const matchedAdmin = await loginAdmin(email.toLowerCase().trim(), password);

    if (!matchedAdmin) {
      setAuthError('Invalid credentials. Access is restricted to verified admins only.');
      return;
    }

    localStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify({ email: matchedAdmin.email, role: matchedAdmin.role }),
    );

    setCurrentAdmin(matchedAdmin);
    setAuthError('');
    setPassword('');
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    setCurrentAdmin(null);
    setEmail('');
    setPassword('');
  };

  const deleteBooking = async (id: number) => {
    if (!canEditBookings) return;
    if (confirm('Are you sure you want to delete this booking?')) {
      const ok = await deleteBookingFromDb(id);
      if (!ok) {
        alert('Failed to delete booking from database.');
        return;
      }
      setBookings(bookings.filter((b) => b.id !== id));
    }
  };

  const updateStatus = async (id: number, status: Booking['status']) => {
    if (!canEditBookings) return;
    const ok = await updateBooking(id, { status });
    if (!ok) {
      alert('Failed to update booking status.');
      return;
    }
    setBookings(bookings.map((b) => (b.id === id ? { ...b, status } : b)));
  };

  const addClub = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageClubs) return;
    if (!clubName.trim() || !clubLocation.trim() || clubRate <= 0) return;

    const created = await createClub({
      name: clubName.trim(),
      location: clubLocation.trim(),
      ratePerPlayer: clubRate,
    });

    if (!created) {
      alert('Failed to create club.');
      return;
    }

    setClubs((prev) => [...prev, created]);

    setClubName('');
    setClubLocation('');
    setClubRate(3500);
  };

  const updateClubRate = async (id: number, ratePerPlayer: number) => {
    if (!canManageClubRates) return;
    if (!Number.isFinite(ratePerPlayer) || ratePerPlayer <= 0) return;
    const ok = await updateClub(id, { ratePerPlayer });
    if (!ok) {
      alert('Failed to update club rate.');
      return;
    }
    setClubs((prev) => prev.map((club) => (club.id === id ? { ...club, ratePerPlayer } : club)));
  };

  const removeClub = async (id: number) => {
    if (!canManageClubs) return;
    const hasRelatedBookings = bookings.some((booking) => booking.clubId === id);
    if (hasRelatedBookings) {
      alert('This club has booking history and cannot be removed.');
      return;
    }

    if (!confirm('Remove this club?')) return;
    const ok = await deleteClub(id);
    if (!ok) {
      alert('Failed to remove club.');
      return;
    }
    setClubs((prev) => prev.filter((club) => club.id !== id));
  };

  const addCaddie = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageCaddies) return;
    if (!caddieName.trim() || !caddieSpecialty.trim() || !caddieExperience.trim()) return;

    const initials = getInitials(caddieName);
    const color = colorOptions[caddies.length % colorOptions.length];

    const created = await createCaddie({
      name: caddieName.trim(),
      specialty: caddieSpecialty.trim(),
      exp: caddieExperience.trim(),
      rating: 4.8,
      rounds: 0,
      topRated: false,
      initials,
      color,
    });

    if (!created) {
      alert('Failed to add caddie.');
      return;
    }

    setCaddies((prev) => [...prev, created]);

    setCaddieName('');
    setCaddieSpecialty('');
    setCaddieExperience('');
  };

  const removeCaddie = async (id: number) => {
    if (!canManageCaddies) return;
    const hasRelatedBookings = bookings.some((booking) => booking.caddieId === id);
    if (hasRelatedBookings) {
      alert('This caddie has booking history and cannot be removed.');
      return;
    }

    if (!confirm('Remove this caddie?')) return;
    const ok = await deleteCaddie(id);
    if (!ok) {
      alert('Failed to remove caddie.');
      return;
    }
    setCaddies((prev) => prev.filter((caddie) => caddie.id !== id));
  };

  if (!currentAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-serif font-bold text-[#0f281e] mb-2">Admin Portal</h1>
          <p className="text-sm text-gray-600 mb-8">Management Dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#0f281e] focus:border-transparent"
                placeholder="admin@apexgolf.africa"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#0f281e] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {authError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{authError}</p>}

            <button
              type="submit"
              className="w-full bg-[#0f281e] text-white py-3 rounded-lg font-medium hover:bg-green-900 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.total, 0);
  
  const todayLogins = 1; // Current admin
  const adminUsers = admins.filter((a) => a.role === 'admin').length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#0a1f18] text-white flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">Admin Portal</h2>
              <p className="text-xs text-gray-400">Management Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${
              currentView === 'dashboard' ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Dashboard</span>
            {currentView === 'dashboard' && (
              <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setCurrentView('members')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${
              currentView === 'members' ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Members</span>
          </button>

          <button
            onClick={() => setCurrentView('organizations')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${
              currentView === 'organizations' ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Organizations</span>
          </button>

          <button
            onClick={() => setCurrentView('caddies')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${
              currentView === 'caddies' ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Caddies</span>
          </button>

          <button
            onClick={() => setCurrentView('loginHistory')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${
              currentView === 'loginHistory' ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Login History</span>
          </button>

          <button
            onClick={() => setCurrentView('transactions')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${
              currentView === 'transactions' ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Transactions</span>
          </button>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {getInitials(currentAdmin.name || currentAdmin.email)}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{currentAdmin.name || 'Super Admin'}</p>
              <p className="text-xs text-gray-400 capitalize">{currentAdmin.role}</p>
            </div>
          </div>
          
          {currentAdmin.role === 'super-admin' && (
            <Link
              to="/super-admin"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm mb-2"
            >
              <span>Super Admin Panel</span>
            </Link>
          )}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {currentView === 'dashboard' && (
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {currentAdmin.role === 'super-admin' ? 'Super Admin' : 'Admin'}! Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Organizations</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{clubs.length}</p>
                <p className="text-green-600 text-xs mt-1">↗ Total active</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Caddies</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{caddies.length}</p>
                <p className="text-green-600 text-xs mt-1">↗ Registered</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Members</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{adminUsers}</p>
                <p className="text-green-600 text-xs mt-1">↗ Admin users</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Transactions</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{bookings.length}</p>
                <p className="text-green-600 text-xs mt-1">↗ All time</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Revenue</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">Ksh {totalRevenue.toLocaleString()}</p>
                <p className="text-green-600 text-xs mt-1">↗ Total earned</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Today's Logins</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-gray-900">{todayLogins}</p>
                <p className="text-green-600 text-xs mt-1">↗ Active users</p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Recent Transactions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Transactions</h2>
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <p className="text-gray-500">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.slice(0, 5).map((booking) => {
                      const club = clubs.find((c) => c.id === booking.clubId);
                      return (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{booking.firstName} {booking.lastName}</p>
                            <p className="text-sm text-gray-600">{club?.name || 'Unknown Club'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">Ksh {booking.total.toLocaleString()}</p>
                            <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Login Activity */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Login Activity</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {getInitials(currentAdmin.name || currentAdmin.email)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{currentAdmin.name || 'Super Admin'}</p>
                        <p className="text-sm text-gray-600 capitalize">{currentAdmin.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Mar 9, 08:42 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setCurrentView('organizations')}
                  disabled={!canManageClubs}
                  className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="font-medium text-gray-900">Add Organization</p>
                </button>

                <button
                  onClick={() => setCurrentView('caddies')}
                  disabled={!canManageCaddies}
                  className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="font-medium text-gray-900">Add Caddie</p>
                </button>

                <button
                  onClick={() => setCurrentView('members')}
                  className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="font-medium text-gray-900">Add Member</p>
                </button>

                <button
                  onClick={() => setCurrentView('transactions')}
                  className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="font-medium text-gray-900">New Transaction</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Organizations View */}
        {currentView === 'organizations' && (
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Organizations</h1>
              <p className="text-gray-600">Manage golf clubs and their rates</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Organization</h2>
              {!canManageClubs && <p className="text-sm text-amber-700 mb-4 bg-amber-50 p-3 rounded-lg">You do not have permission to manage clubs.</p>}
              
              <form onSubmit={addClub} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Club name"
                  className="border border-gray-300 rounded-lg px-4 py-2.5"
                  required
                  disabled={!canManageClubs}
                />
                <input
                  type="text"
                  value={clubLocation}
                  onChange={(e) => setClubLocation(e.target.value)}
                  placeholder="Location"
                  className="border border-gray-300 rounded-lg px-4 py-2.5"
                  required
                  disabled={!canManageClubs}
                />
                <input
                  type="number"
                  value={clubRate}
                  onChange={(e) => setClubRate(Number(e.target.value))}
                  placeholder="Rate per player"
                  className="border border-gray-300 rounded-lg px-4 py-2.5"
                  min={1}
                  required
                  disabled={!canManageClubs}
                />
                <button
                  type="submit"
                  className="bg-[#0f281e] text-white px-4 py-2.5 rounded-lg hover:bg-green-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canManageClubs}
                >
                  Add Organization
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubs.map((club) => (
                <div key={club.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{club.name}</h3>
                      <p className="text-sm text-gray-600">{club.location}</p>
                    </div>
                    <button
                      onClick={() => removeClub(club.id)}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      disabled={!canManageClubs}
                      title="Remove club"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <label className="block text-xs text-gray-500 mb-1">Rate per player</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Ksh</span>
                      <input
                        type="number"
                        min={1}
                        value={club.ratePerPlayer}
                        onChange={(e) => updateClubRate(club.id, Number(e.target.value))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                        disabled={!canManageClubRates}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caddies View */}
        {currentView === 'caddies' && (
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Caddies</h1>
              <p className="text-gray-600">Manage caddie profiles and information</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Caddie</h2>
              {!canManageCaddies && <p className="text-sm text-amber-700 mb-4 bg-amber-50 p-3 rounded-lg">You do not have permission to manage caddies.</p>}
              
              <form onSubmit={addCaddie} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={caddieName}
                  onChange={(e) => setCaddieName(e.target.value)}
                  placeholder="Caddie name"
                  className="border border-gray-300 rounded-lg px-4 py-2.5"
                  required
                  disabled={!canManageCaddies}
                />
                <input
                  type="text"
                  value={caddieExperience}
                  onChange={(e) => setCaddieExperience(e.target.value)}
                  placeholder="Experience (e.g., 5 years)"
                  className="border border-gray-300 rounded-lg px-4 py-2.5"
                  required
                  disabled={!canManageCaddies}
                />
                <input
                  type="text"
                  value={caddieSpecialty}
                  onChange={(e) => setCaddieSpecialty(e.target.value)}
                  placeholder="Specialty"
                  className="border border-gray-300 rounded-lg px-4 py-2.5"
                  required
                  disabled={!canManageCaddies}
                />
                <button
                  type="submit"
                  className="bg-[#0f281e] text-white px-4 py-2.5 rounded-lg hover:bg-green-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canManageCaddies}
                >
                  Add Caddie
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caddies.map((caddie) => (
                <div key={caddie.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 ${caddie.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <span className="text-lg font-bold text-white">{caddie.initials}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{caddie.name}</h3>
                      <p className="text-sm text-gray-600">{caddie.specialty}</p>
                      <p className="text-xs text-gray-500 mt-1">{caddie.exp}</p>
                    </div>
                    <button
                      onClick={() => removeCaddie(caddie.id)}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      disabled={!canManageCaddies}
                      title="Remove caddie"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-semibold text-yellow-600">{caddie.rating} ⭐</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members View */}
        {currentView === 'members' && (
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Members</h1>
              <p className="text-gray-600">View admin users and their roles</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {admins.map((admin) => (
                <div key={admin.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{getInitials(admin.name || admin.email)}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{admin.name || 'Admin'}</h3>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      admin.role === 'super-admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {admin.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Login History View */}
        {currentView === 'loginHistory' && (
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Login History</h1>
              <p className="text-gray-600">Recent admin login activity</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {getInitials(currentAdmin.name || currentAdmin.email)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{currentAdmin.name || 'Super Admin'}</p>
                        <p className="text-sm text-gray-600 capitalize">{currentAdmin.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Mar 9, 08:42 PM</p>
                      <p className="text-xs text-green-600">● Active now</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions View */}
        {currentView === 'transactions' && (
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
              <p className="text-gray-600">All booking transactions and payments</p>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600">Bookings will appear here once customers start making reservations.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map((booking) => {
                      const club = clubs.find((c) => c.id === booking.clubId);
                      return (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm font-semibold text-[#c5a059]">APX-{booking.id.toString().slice(-5)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{booking.firstName} {booking.lastName}</p>
                              <p className="text-sm text-gray-600">{booking.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{club?.name || 'Unknown'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{new Date(booking.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">Ksh {booking.total.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <select 
                              value={booking.status}
                              onChange={(e) => updateStatus(booking.id, e.target.value as Booking['status'])}
                              className={`px-2 py-1 rounded text-xs font-semibold border ${
                                booking.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}
                              disabled={!canEditBookings}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => deleteBooking(booking.id)}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50"
                              disabled={!canEditBookings}
                              title="Delete booking"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;