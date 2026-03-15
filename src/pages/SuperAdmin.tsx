import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminPermissions, AdminUser } from '../types/entities';
import type { Booking } from '../types/booking';
import type { Caddie, Club } from '../types/entities';
import {
  createAuditTrailEntry,
  createAdminUser,
  deleteBooking,
  deleteCaddie,
  deleteClub,
  deleteAdminUser,
  fetchDeletionRequests,
  getOauthAdminFromSession,
  loginAdmin,
  loginWithGoogle,
  reviewDeletionRequest,
  type DeletionRequestItem,
  updateAdminUser,
} from '../services/database';
import {
  clearAuthSession,
  createAuthSession,
  readAuthSession,
  touchAuthSession,
  writeAuthSession,
} from '../utils/authSession';

type Props = {
  admins: AdminUser[];
  setAdmins: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  clubs: Club[];
  setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
  caddies: Caddie[];
  setCaddies: React.Dispatch<React.SetStateAction<Caddie[]>>;
};

const SUPER_ADMIN_SESSION_TTL_MS = 5 * 60 * 1000;

const defaultPermissions: AdminPermissions = {
  canEditBookings: true,
  canManageClubs: true,
  canManageCaddies: true,
  canManageClubRates: true,
};

const SuperAdmin: React.FC<Props> = ({ admins, setAdmins, setBookings, setClubs, setCaddies }) => {
  const [isAllowed, setIsAllowed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [permissions, setPermissions] = useState<AdminPermissions>(defaultPermissions);
  const [pendingDeletionRequests, setPendingDeletionRequests] = useState<DeletionRequestItem[]>([]);

  const loadPendingDeletionRequests = async () => {
    const requests = await fetchDeletionRequests('pending');
    setPendingDeletionRequests(requests);
  };

  const logAudit = async (
    action: string,
    entityType: 'booking' | 'club' | 'caddie' | 'admin_user' | 'deletion_request' | 'auth' | 'system',
    entityId?: number,
    entityLabel?: string,
    details?: string,
    metadata?: Record<string, unknown>,
  ) => {
    const actorEmail = readAuthSession()?.email;
    if (!actorEmail) return;

    await createAuditTrailEntry({
      actorEmail,
      actorRole: 'super-admin',
      action,
      entityType,
      entityId: entityId ?? null,
      entityLabel: entityLabel ?? null,
      details: details ?? null,
      metadata: metadata ?? null,
    });
  };

  const lockAndLogout = (message?: string) => {
    clearAuthSession();
    setIsAllowed(false);
    setEmail('');
    setPassword('');
    if (message) setError(message);
  };

  useEffect(() => {
    const syncSession = async () => {
      const session = readAuthSession();
      if (session?.role === 'super-admin') {
        const matched = admins.find((admin) => admin.email === session.email && admin.role === 'super-admin');
        if (matched) {
          touchAuthSession(SUPER_ADMIN_SESSION_TTL_MS);
          setIsAllowed(true);
          return;
        }
      }

      const oauthAdmin = await getOauthAdminFromSession();
      if (oauthAdmin?.role === 'super-admin') {
        writeAuthSession(createAuthSession(oauthAdmin.email, oauthAdmin.role, SUPER_ADMIN_SESSION_TTL_MS));
        setIsAllowed(true);
      }
    };

    syncSession();
  }, [admins]);

  useEffect(() => {
    loadPendingDeletionRequests();
  }, []);

  useEffect(() => {
    if (!isAllowed) return;

    const touch = () => {
      touchAuthSession(SUPER_ADMIN_SESSION_TTL_MS);
    };

    const onVisibilityChange = () => {
      if (!document.hidden) touch();
    };

    const activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, touch, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);

    const interval = window.setInterval(() => {
      if (!readAuthSession()) {
        lockAndLogout('Session expired. Log in again.');
      }
    }, 15000);

    touch();

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, touch));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [isAllowed]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();

    const matched = await loginAdmin(email.toLowerCase().trim(), password);

    if (!matched || matched.role !== 'super-admin') {
      setError('Only super admin can access this page.');
      return;
    }

    writeAuthSession(createAuthSession(matched.email, matched.role, SUPER_ADMIN_SESSION_TTL_MS));
    setIsAllowed(true);
    setError('');
  };

  const logout = () => {
    lockAndLogout();
  };

  const addAdmin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !newEmail.trim() || !newPassword.trim()) return;

    const exists = admins.some((admin) => admin.email.toLowerCase() === newEmail.toLowerCase().trim());
    if (exists) {
      setError('Admin email already exists.');
      return;
    }

    const created = await createAdminUser({
      name: name.trim(),
      email: newEmail.toLowerCase().trim(),
      password: `TEMP::${newPassword}`,
      role: 'admin',
      permissions,
    });

    if (!created) {
      setError('Failed to create admin user.');
      return;
    }

    setAdmins((prev) => [...prev, created]);

    setName('');
    setNewEmail('');
    setNewPassword('');
    setPermissions(defaultPermissions);
    setError('');

    await logAudit(
      'admin_created',
      'admin_user',
      created.id,
      created.email,
      `Created admin account for ${created.email}`,
      { permissions: created.permissions },
    );
  };

  const continueWithGoogle = async () => {
    const ok = await loginWithGoogle('/super-admin');
    if (!ok) setError('Google login could not be started. Check Supabase Google Auth settings.');
  };

  const removeAdmin = async (id: number) => {
    const target = admins.find((admin) => admin.id === id);
    if (!target || target.role === 'super-admin') return;

    if (!confirm(`Remove admin ${target.name}?`)) return;
    const ok = await deleteAdminUser(id);
    if (!ok) {
      setError('Failed to remove admin user.');
      return;
    }
    setAdmins((prev) => prev.filter((admin) => admin.id !== id));

    await logAudit(
      'admin_removed',
      'admin_user',
      id,
      target.email,
      `Removed admin ${target.email}`,
    );
  };

  const togglePermission = async (id: number, key: keyof AdminPermissions) => {
    const target = admins.find((admin) => admin.id === id);
    if (!target || target.role === 'super-admin') return;

    const nextPermissions = {
      ...target.permissions,
      [key]: !target.permissions[key],
    };

    const ok = await updateAdminUser(id, { permissions: nextPermissions });
    if (!ok) {
      setError('Failed to update admin permissions.');
      return;
    }

    setAdmins((prev) =>
      prev.map((admin) => {
        if (admin.id !== id || admin.role === 'super-admin') return admin;
        return {
          ...admin,
          permissions: nextPermissions,
        };
      }),
    );

    await logAudit(
      'admin_permissions_updated',
      'admin_user',
      id,
      target.email,
      `Updated permission ${key}`,
      { key, value: nextPermissions[key] },
    );
  };

  const handleDeletionDecision = async (
    request: DeletionRequestItem,
    decision: 'approved' | 'rejected',
  ) => {
    const reviewerEmail = readAuthSession()?.email || 'super-admin';

    if (decision === 'approved') {
      let deleted = false;
      if (request.entityType === 'booking') {
        deleted = await deleteBooking(request.entityId);
        if (deleted) setBookings((prev) => prev.filter((item) => item.id !== request.entityId));
      }
      if (request.entityType === 'club') {
        deleted = await deleteClub(request.entityId);
        if (deleted) setClubs((prev) => prev.filter((item) => item.id !== request.entityId));
      }
      if (request.entityType === 'caddie') {
        deleted = await deleteCaddie(request.entityId);
        if (deleted) setCaddies((prev) => prev.filter((item) => item.id !== request.entityId));
      }

      if (!deleted) {
        setError(`Failed to delete ${request.entityType}.`);
        return;
      }
    }

    const reviewed = await reviewDeletionRequest({
      requestId: request.id,
      reviewedByEmail: reviewerEmail,
      status: decision,
    });

    if (!reviewed) {
      setError('Failed to update request status.');
      return;
    }

    setPendingDeletionRequests((prev) => prev.filter((item) => item.id !== request.id));

    await logAudit(
      decision === 'approved' ? 'deletion_request_approved' : 'deletion_request_rejected',
      'deletion_request',
      request.id,
      request.entityLabel,
      `Deletion request for ${request.entityType} was ${decision}`,
      {
        requestEntityId: request.entityId,
        requestEntityType: request.entityType,
      },
    );
  };

  if (!isAllowed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg,#0F1F17 0%,#1C3A2A 60%,#0F1F17 100%)' }}
      >
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <svg className="w-7 h-7" style={{ color: '#c9a962' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-white tracking-tight">Super Admin</p>
              <p className="text-xs text-gray-400 uppercase tracking-widest">ApexGolf Africa</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b border-gray-100" style={{ background: 'linear-gradient(to right,#f8f6f1,#fff)' }}>
              <h2 className="font-serif text-xl font-bold text-[#0f1f17]">Restricted Access</h2>
              <p className="text-sm text-gray-500 mt-1">Login with your super admin credentials to continue.</p>
            </div>

            <div className="p-8">
              <form onSubmit={login} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@apexgolf.africa"
                    required
                    className="w-full rounded-xl px-4 py-3.5 text-gray-700 placeholder-gray-400 transition-all duration-300 focus:outline-none"
                    style={{ border: '2px solid #E5E7EB', background: '#FAFAFA' }}
                    onFocus={(e) => { e.target.style.borderColor = '#C9A962'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(201,169,98,0.12)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#FAFAFA'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl px-4 py-3.5 text-gray-700 placeholder-gray-400 transition-all duration-300 focus:outline-none"
                    style={{ border: '2px solid #E5E7EB', background: '#FAFAFA' }}
                    onFocus={(e) => { e.target.style.borderColor = '#C9A962'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(201,169,98,0.12)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#FAFAFA'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#1C3A2A 0%,#2D5A3D 100%)', boxShadow: '0 4px 15px -3px rgba(28,58,42,0.45)' }}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={continueWithGoogle}
                  className="w-full border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </form>

              <p className="text-xs text-gray-400 mt-6 text-center">New admins receive a temporary password and must change it on first login.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const superAdminCount = admins.filter((a) => a.role === 'super-admin').length;
  const getAdminInitials = (n: string) =>
    n.trim().split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F2F5' }}>

      {/* ── Sticky Header ── */}
      <header
        className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg,#0F1F17 0%,#1C3A2A 60%,#0F1F17 100%)', boxShadow: '0 4px 24px -6px rgba(15,31,23,0.6)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/20"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <svg className="w-5 h-5" style={{ color: '#C9A962' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="font-serif text-lg font-bold text-white leading-none">Super Admin Panel</p>
            <p className="text-xs text-gray-400 mt-0.5">ApexGolf Africa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 border border-green-700/50 text-green-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-900/40 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Admin Page
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 border border-red-700/50 text-red-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-900/40 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Admins', value: admins.length, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: '#1C3A2A' },
            { label: 'Super Admins', value: superAdminCount, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: '#C9A962' },
            { label: 'Pending Approvals', value: pendingDeletionRequests.length, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: '#D97706' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}18` }}>
                <svg className="w-6 h-6" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Add Admin Card ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-7 pt-6 pb-5 border-b border-gray-100" style={{ background: 'linear-gradient(to right,#f8f6f1,#fff)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1C3A2A,#2D5A3D)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-bold text-[#0F1F17]">Add New Admin</h2>
            </div>
          </div>

          <div className="p-7">
            <form onSubmit={addAdmin} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Full Name', type: 'text', value: name, onChange: (v: string) => setName(v), placeholder: 'Jane Doe' },
                  { label: 'Email Address', type: 'email', value: newEmail, onChange: (v: string) => setNewEmail(v), placeholder: 'admin@apexgolf.africa' },
                  { label: 'Temporary Password', type: 'password', value: newPassword, onChange: (v: string) => setNewPassword(v), placeholder: '••••••••' },
                ].map((f) => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{f.label}</label>
                    <input
                      type={f.type}
                      value={f.value}
                      onChange={(e) => f.onChange(e.target.value)}
                      placeholder={f.placeholder}
                      required
                      className="w-full rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400 transition-all duration-300 focus:outline-none"
                      style={{ border: '2px solid #E5E7EB', background: '#FAFAFA' }}
                      onFocus={(e) => { e.target.style.borderColor = '#C9A962'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(201,169,98,0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#FAFAFA'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-4" style={{ background: '#F8F6F1', border: '1px solid #EDE8DE' }}>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Permissions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      ['canEditBookings', 'Edit Bookings'],
                      ['canManageClubs', 'Manage Clubs'],
                      ['canManageCaddies', 'Manage Caddies'],
                      ['canManageClubRates', 'Manage Club Rates'],
                    ] as Array<[keyof AdminPermissions, string]>
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={permissions[key]}
                          onChange={() => setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className="sr-only"
                        />
                        <div
                          className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200"
                          style={{ borderColor: permissions[key] ? '#C9A962' : '#D1D5DB', background: permissions[key] ? 'linear-gradient(135deg,#C9A962,#B8984D)' : '#fff' }}
                        >
                          {permissions[key] && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg,#C9A962 0%,#B8984D 100%)', boxShadow: '0 4px 15px -3px rgba(201,169,98,0.45)', color: '#0F1F17' }}
              >
                Create Admin Account
              </button>
            </form>
          </div>
        </div>

        {/* ── Pending Approvals Card ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(to right,#f8f6f1,#fff)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-bold text-[#0F1F17]">
                Pending Approvals
                {pendingDeletionRequests.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    {pendingDeletionRequests.length}
                  </span>
                )}
              </h2>
            </div>
            <button
              type="button"
              onClick={loadPendingDeletionRequests}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all duration-200 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          <div className="p-7">
            {pendingDeletionRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '2px dashed #86efac' }}>
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-700">All clear!</p>
                <p className="text-sm text-gray-400 mt-1">No pending delete approvals at this time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDeletionRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl p-5 border border-gray-100 hover:border-amber-200 transition-all duration-200" style={{ background: '#FFFBF4' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'linear-gradient(135deg,#C9A962,#B8984D)', color: '#0F1F17' }}>
                            {request.entityType}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900">{request.entityLabel}</p>
                        <p className="text-sm text-gray-500 mt-0.5">Requested by: {request.requestedByEmail}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(request.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeletionDecision(request, 'approved')}
                          className="text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
                          style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow: '0 4px 12px -3px rgba(22,163,74,0.4)' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeletionDecision(request, 'rejected')}
                          className="text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
                          style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow: '0 4px 12px -3px rgba(220,38,38,0.4)' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Existing Admins Card ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-7 pt-6 pb-5 border-b border-gray-100" style={{ background: 'linear-gradient(to right,#f8f6f1,#fff)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1C3A2A,#2D5A3D)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-bold text-[#0F1F17]">Existing Admins</h2>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {admins.map((admin) => {
              const isSuperAdmin = admin.role === 'super-admin';
              return (
                <div
                  key={admin.id}
                  className="p-6 transition-all duration-200 hover:bg-gray-50/60"
                  style={{ borderLeft: '3px solid transparent' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderLeftColor = '#C9A962'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderLeftColor = 'transparent'; }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={isSuperAdmin
                          ? { background: 'linear-gradient(135deg,#C9A962,#B8984D)', color: '#0F1F17' }
                          : { background: 'linear-gradient(135deg,#1C3A2A,#2D5A3D)', color: '#fff' }}
                      >
                        {getAdminInitials(admin.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{admin.name}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                        <span
                          className="mt-1.5 inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                          style={isSuperAdmin
                            ? { background: 'linear-gradient(135deg,#C9A962,#B8984D)', color: '#0F1F17' }
                            : { background: 'linear-gradient(135deg,#1C3A2A,#2D5A3D)', color: '#fff' }}
                        >
                          {admin.role}
                        </span>
                      </div>
                    </div>

                    {isSuperAdmin ? (
                      <button
                        disabled
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl border cursor-not-allowed"
                        style={{ borderColor: '#E5D5A8', color: '#B8984D', background: '#FFFBF4' }}
                      >
                        🔒 Protected
                      </button>
                    ) : (
                      <button
                        onClick={() => removeAdmin(admin.id)}
                        className="text-sm text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow: '0 4px 12px -3px rgba(220,38,38,0.35)' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        ['canEditBookings', 'Edit Bookings'],
                        ['canManageClubs', 'Manage Clubs'],
                        ['canManageCaddies', 'Manage Caddies'],
                        ['canManageClubRates', 'Manage Club Rates'],
                      ] as Array<[keyof AdminPermissions, string]>
                    ).map(([key, label]) => (
                      <label key={key} className={`flex items-center gap-2.5 ${isSuperAdmin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={admin.permissions[key]}
                            disabled={isSuperAdmin}
                            onChange={() => togglePermission(admin.id, key)}
                            className="sr-only"
                          />
                          <div
                            className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200"
                            style={{ borderColor: admin.permissions[key] ? '#C9A962' : '#D1D5DB', background: admin.permissions[key] ? 'linear-gradient(135deg,#C9A962,#B8984D)' : '#fff' }}
                          >
                            {admin.permissions[key] && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdmin;
