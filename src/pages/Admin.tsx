// pages/Admin.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Booking } from '../types/booking';
import type { AdminUser, Caddie, Club } from '../types/entities';
import {
  createAuditTrailEntry,
  createCaddie,
  createClub,
  createDeletionRequest,
  deleteBooking as deleteBookingFromDb,
  deleteCaddie,
  deleteClub,
  fetchAuditTrail,
  fetchAdminLoginHistory,
  getOauthAdminFromSession,
  loginAdmin,
  loginWithGoogle,
  type AuditTrailItem,
  type AdminLoginHistoryItem,
  updateAdminUser,
  updateBooking,
  updateCaddie,
  updateClub,
} from '../services/database';
import {
  clearAuthSession,
  createAuthSession,
  readAuthSession,
  touchAuthSession,
  writeAuthSession,
} from '../utils/authSession';

type Props = {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  clubs: Club[];
  setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
  caddies: Caddie[];
  setCaddies: React.Dispatch<React.SetStateAction<Caddie[]>>;
  admins: AdminUser[];
};

type NavView = 'dashboard' | 'organizations' | 'caddies' | 'caddieOnboarding' | 'members' | 'loginHistory' | 'auditTrail' | 'transactions';

const navTitles: Record<NavView, string> = {
  dashboard: 'Dashboard',
  organizations: 'Organizations',
  caddies: 'Caddies',
  caddieOnboarding: 'Caddie Onboarding',
  members: 'Members',
  loginHistory: 'Login History',
  auditTrail: 'Audit Trail',
  transactions: 'Transactions',
};

const colorOptions = ['bg-green-900', 'bg-blue-900', 'bg-yellow-800', 'bg-stone-800', 'bg-emerald-900'];
const ADMIN_SESSION_TTL_MS = 5 * 60 * 1000;
const SUPER_ADMIN_SESSION_TTL_MS = 5 * 60 * 1000;

const getInitials = (name: string) =>
  name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const Admin: React.FC<Props> = ({ bookings, setBookings, clubs, setClubs, caddies, setCaddies, admins }) => {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');

  const [loginHistory, setLoginHistory] = useState<AdminLoginHistoryItem[]>([]);
  const [loginSearch, setLoginSearch] = useState('');
  const [loginRoleFilter, setLoginRoleFilter] = useState<'all' | 'admin' | 'super-admin'>('all');
  const [loginTimeFilter, setLoginTimeFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');

  const [auditTrail, setAuditTrail] = useState<AuditTrailItem[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState<'all' | AuditTrailItem['entityType']>('all');
  const [auditRoleFilter, setAuditRoleFilter] = useState<'all' | 'admin' | 'super-admin'>('all');

  const [clubName, setClubName] = useState('');
  const [clubLocation, setClubLocation] = useState('');
  const [clubRate, setClubRate] = useState(3500);

  const [editingCaddieId, setEditingCaddieId] = useState<number | null>(null);
  const [caddieName, setCaddieName] = useState('');
  const [caddieSpecialty, setCaddieSpecialty] = useState('');
  const [caddieExperience, setCaddieExperience] = useState('');
  const [caddiePhone, setCaddiePhone] = useState('');
  const [caddieEmail, setCaddieEmail] = useState('');
  const [caddieIdNumber, setCaddieIdNumber] = useState('');
  const [caddieAddress, setCaddieAddress] = useState('');
  const [caddieAge, setCaddieAge] = useState<number | ''>('');
  const [caddiePoBox, setCaddiePoBox] = useState('');
  const [caddieOrganizationClubId, setCaddieOrganizationClubId] = useState<number | ''>('');
  const [caddieSearch, setCaddieSearch] = useState('');
  const [caddieOrganizationFilter, setCaddieOrganizationFilter] = useState<number | 'all'>('all');

  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<'all' | Booking['status']>('all');

  const getSessionTtl = (role: 'admin' | 'super-admin') =>
    role === 'super-admin' ? SUPER_ADMIN_SESSION_TTL_MS : ADMIN_SESSION_TTL_MS;

  const forceLogout = (message?: string) => {
    clearAuthSession();
    setCurrentAdmin(null);
    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordChangeError('');
    if (message) setAuthError(message);
  };

  const loadLoginHistory = async () => {
    setLoginHistory(await fetchAdminLoginHistory(50));
  };

  const loadAuditTrail = async () => {
    setAuditTrail(await fetchAuditTrail(200));
  };

  useEffect(() => {
    const syncSession = async () => {
      const parsed = readAuthSession();
      if (parsed) {
        const matched = admins.find((admin) => admin.email === parsed.email && admin.role === parsed.role);
        if (matched) {
          touchAuthSession(getSessionTtl(matched.role));
          setCurrentAdmin(matched);
          return;
        }
      }

      const oauthAdmin = await getOauthAdminFromSession();
      if (oauthAdmin) {
        writeAuthSession(createAuthSession(oauthAdmin.email, oauthAdmin.role, getSessionTtl(oauthAdmin.role)));
        setCurrentAdmin(oauthAdmin);
      }
    };

    syncSession();
  }, [admins]);

  useEffect(() => {
    loadLoginHistory();
    loadAuditTrail();
  }, []);

  useEffect(() => {
    if (!currentAdmin) return;

    const ttl = getSessionTtl(currentAdmin.role);

    const touch = () => {
      touchAuthSession(ttl);
    };

    const onVisibilityChange = () => {
      if (!document.hidden) touch();
    };

    const activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, touch, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);

    const interval = window.setInterval(() => {
      const activeSession = readAuthSession();
      if (!activeSession) {
        forceLogout('Session expired. Please log in again.');
      }
    }, 15000);

    touch();

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, touch));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [currentAdmin, admins]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

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

  const filteredCaddies = useMemo(() => {
    const search = caddieSearch.trim().toLowerCase();
    return caddies.filter((caddie) => {
      const searchPass =
        !search ||
        [caddie.name, caddie.specialty, caddie.exp, caddie.phone ?? '', caddie.email ?? '']
          .some((value) => value.toLowerCase().includes(search));

      const organizationPass =
        caddieOrganizationFilter === 'all' || caddie.organizationClubId === caddieOrganizationFilter;

      return searchPass && organizationPass;
    });
  }, [caddies, caddieOrganizationFilter, caddieSearch]);

  const resetCaddieForm = () => {
    setEditingCaddieId(null);
    setCaddieName('');
    setCaddieSpecialty('');
    setCaddieExperience('');
    setCaddiePhone('');
    setCaddieEmail('');
    setCaddieIdNumber('');
    setCaddieAddress('');
    setCaddieAge('');
    setCaddiePoBox('');
    setCaddieOrganizationClubId('');
  };

  const beginEditCaddie = (caddie: Caddie) => {
    setEditingCaddieId(caddie.id);
    setCaddieName(caddie.name);
    setCaddieSpecialty(caddie.specialty);
    setCaddieExperience(caddie.exp);
    setCaddiePhone(caddie.phone ?? '');
    setCaddieEmail(caddie.email ?? '');
    setCaddieIdNumber(caddie.idNumber ?? '');
    setCaddieAddress(caddie.address ?? '');
    setCaddieAge(caddie.age ?? '');
    setCaddiePoBox(caddie.poBox ?? '');
    setCaddieOrganizationClubId(caddie.organizationClubId ?? '');
    setCurrentView('caddieOnboarding');
  };

  const filteredLoginHistory = useMemo(() => {
    const now = new Date();
    const search = loginSearch.trim().toLowerCase();

    return loginHistory.filter((entry) => {
      const rolePass = loginRoleFilter === 'all' || entry.role === loginRoleFilter;

      let timePass = true;
      const entryDate = new Date(entry.loginAt);
      if (loginTimeFilter === 'today') {
        timePass = entryDate.toDateString() === now.toDateString();
      } else if (loginTimeFilter === '7d') {
        timePass = now.getTime() - entryDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
      } else if (loginTimeFilter === '30d') {
        timePass = now.getTime() - entryDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
      }

      const adminName = admins.find((admin) => admin.email.toLowerCase() === entry.email.toLowerCase())?.name ?? '';
      const searchPass =
        !search ||
        entry.email.toLowerCase().includes(search) ||
        adminName.toLowerCase().includes(search);

      return rolePass && timePass && searchPass;
    });
  }, [admins, loginHistory, loginRoleFilter, loginSearch, loginTimeFilter]);

  const filteredTransactions = useMemo(() => {
    const search = transactionSearch.trim().toLowerCase();

    return bookings.filter((booking) => {
      const statusPass = transactionStatusFilter === 'all' || booking.status === transactionStatusFilter;

      const clubName = clubs.find((club) => club.id === booking.clubId)?.name ?? '';
      const caddieName = caddies.find((caddie) => caddie.id === booking.caddieId)?.name ?? '';

      const searchPass =
        !search ||
        `${booking.firstName} ${booking.lastName}`.toLowerCase().includes(search) ||
        booking.email.toLowerCase().includes(search) ||
        clubName.toLowerCase().includes(search) ||
        caddieName.toLowerCase().includes(search);

      return statusPass && searchPass;
    });
  }, [bookings, caddies, clubs, transactionSearch, transactionStatusFilter]);

  const filteredAuditTrail = useMemo(() => {
    const search = auditSearch.trim().toLowerCase();

    return auditTrail.filter((entry) => {
      const entityPass = auditEntityFilter === 'all' || entry.entityType === auditEntityFilter;
      const rolePass = auditRoleFilter === 'all' || entry.actorRole === auditRoleFilter;
      const searchPass =
        !search ||
        entry.action.toLowerCase().includes(search) ||
        entry.actorEmail.toLowerCase().includes(search) ||
        (entry.entityLabel ?? '').toLowerCase().includes(search) ||
        (entry.details ?? '').toLowerCase().includes(search);

      return entityPass && rolePass && searchPass;
    });
  }, [auditEntityFilter, auditRoleFilter, auditSearch, auditTrail]);

  const logAudit = async (
    action: string,
    entityType: AuditTrailItem['entityType'],
    entityId?: number,
    entityLabel?: string,
    details?: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!currentAdmin) return;

    await createAuditTrailEntry({
      actorEmail: currentAdmin.email,
      actorRole: currentAdmin.role,
      action,
      entityType,
      entityId: entityId ?? null,
      entityLabel: entityLabel ?? null,
      details: details ?? null,
      metadata: metadata ?? null,
    });
  };

  const createCsvAndDownload = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
    const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers.map(escapeCell).join(','), ...rows.map((row) => row.map(escapeCell).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportLoginHistoryCsv = () => {
    const rows = filteredLoginHistory.map((entry) => {
      const adminName = admins.find((admin) => admin.email.toLowerCase() === entry.email.toLowerCase())?.name || entry.email;
      return [adminName, entry.email, entry.role, new Date(entry.loginAt).toLocaleString()];
    });

    createCsvAndDownload('login-history.csv', ['Name', 'Email', 'Role', 'Login Time'], rows);
  };

  const exportTransactionsCsv = () => {
    const rows = filteredTransactions.map((booking) => {
      const clubName = clubs.find((club) => club.id === booking.clubId)?.name || 'Unknown';
      const caddieName = caddies.find((caddie) => caddie.id === booking.caddieId)?.name || 'Unknown';
      return [
        `APX-${booking.id.toString().slice(-5)}`,
        `${booking.firstName} ${booking.lastName}`,
        booking.email,
        clubName,
        caddieName,
        new Date(booking.date).toLocaleDateString(),
        booking.total,
        booking.status,
      ];
    });

    createCsvAndDownload(
      'transactions.csv',
      ['Reference', 'Customer', 'Email', 'Organization', 'Caddie', 'Date', 'Amount', 'Status'],
      rows,
    );
  };

  const exportAuditTrailCsv = () => {
    const rows = filteredAuditTrail.map((entry) => [
      new Date(entry.createdAt).toLocaleString(),
      entry.actorEmail,
      entry.actorRole,
      entry.action,
      entry.entityType,
      entry.entityId ?? '',
      entry.entityLabel ?? '',
      entry.details ?? '',
      entry.metadata ? JSON.stringify(entry.metadata) : '',
    ]);

    createCsvAndDownload(
      'audit-trail.csv',
      ['Time', 'Actor Email', 'Actor Role', 'Action', 'Entity Type', 'Entity ID', 'Entity Label', 'Details', 'Metadata'],
      rows,
    );
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const matchedAdmin = await loginAdmin(email.toLowerCase().trim(), password);

    if (!matchedAdmin) {
      setAuthError('Invalid credentials. Access is restricted to verified admins only.');
      return;
    }

    writeAuthSession(createAuthSession(matchedAdmin.email, matchedAdmin.role, getSessionTtl(matchedAdmin.role)));

    setCurrentAdmin(matchedAdmin);
    await loadLoginHistory();
    setAuthError('');
    setPassword('');
  };

  const handleLogout = () => {
    forceLogout();
  };

  const continueWithGoogle = async () => {
    const ok = await loginWithGoogle('/admin');
    if (!ok) setAuthError('Google login could not be started. Check Supabase Google Auth settings.');
  };

  const handleSetNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentAdmin) return;

    if (newPassword.length < 8) {
      setPasswordChangeError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('Passwords do not match.');
      return;
    }

    const ok = await updateAdminUser(currentAdmin.id, { password: newPassword });
    if (!ok) {
      setPasswordChangeError('Failed to update password. Please try again.');
      return;
    }

    setCurrentAdmin({ ...currentAdmin, password: newPassword, mustChangePassword: false });
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordChangeError('');

    await logAudit(
      'password_changed',
      'auth',
      currentAdmin.id,
      currentAdmin.email,
      'Admin changed temporary password',
    );
  };

  const deleteBooking = async (id: number) => {
    if (!canEditBookings) return;
    const booking = bookings.find((item) => item.id === id);
    if (!booking || !currentAdmin) return;

    if (confirm('Are you sure you want to delete this booking?')) {
      if (currentAdmin.role !== 'super-admin') {
        const requested = await createDeletionRequest({
          entityType: 'booking',
          entityId: id,
          entityLabel: `APX-${id.toString().slice(-5)} (${booking.firstName} ${booking.lastName})`,
          requestedByEmail: currentAdmin.email,
        });

        if (!requested) {
          alert('Failed to submit delete request.');
          return;
        }

        await logAudit(
          'deletion_requested',
          'deletion_request',
          id,
          `APX-${id.toString().slice(-5)}`,
          'Requested booking deletion for super-admin approval',
        );

        alert('Delete request submitted. Super admin approval is required.');
        return;
      }

      const ok = await deleteBookingFromDb(id);
      if (!ok) {
        alert('Failed to delete booking from database.');
        return;
      }
      setBookings(bookings.filter((b) => b.id !== id));

      await logAudit(
        'booking_deleted',
        'booking',
        id,
        `APX-${id.toString().slice(-5)}`,
        'Booking deleted directly by super-admin',
      );
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

    await logAudit(
      'booking_status_updated',
      'booking',
      id,
      `APX-${id.toString().slice(-5)}`,
      `Booking status changed to ${status}`,
      { status },
    );
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

    await logAudit(
      'club_created',
      'club',
      created.id,
      created.name,
      `Created club ${created.name}`,
      { location: created.location, ratePerPlayer: created.ratePerPlayer },
    );

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

    const clubLabel = clubs.find((club) => club.id === id)?.name ?? `Club ${id}`;
    await logAudit(
      'club_rate_updated',
      'club',
      id,
      clubLabel,
      `Updated club rate to Ksh ${ratePerPlayer}`,
      { ratePerPlayer },
    );
  };

  const removeClub = async (id: number) => {
    if (!canManageClubs) return;
    const club = clubs.find((item) => item.id === id);
    if (!club || !currentAdmin) return;

    const hasRelatedBookings = bookings.some((booking) => booking.clubId === id);
    if (hasRelatedBookings) {
      alert('This club has booking history and cannot be removed.');
      return;
    }

    if (!confirm('Remove this club?')) return;

    if (currentAdmin.role !== 'super-admin') {
      const requested = await createDeletionRequest({
        entityType: 'club',
        entityId: id,
        entityLabel: club.name,
        requestedByEmail: currentAdmin.email,
      });

      if (!requested) {
        alert('Failed to submit delete request.');
        return;
      }

      await logAudit(
        'deletion_requested',
        'deletion_request',
        id,
        club.name,
        'Requested club deletion for super-admin approval',
      );

      alert('Delete request submitted. Super admin approval is required.');
      return;
    }

    const ok = await deleteClub(id);
    if (!ok) {
      alert('Failed to remove club.');
      return;
    }
    setClubs((prev) => prev.filter((club) => club.id !== id));

    await logAudit(
      'club_deleted',
      'club',
      id,
      club.name,
      'Club deleted directly by super-admin',
    );
  };

  const addCaddie = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageCaddies) return;
    if (!caddieName.trim() || !caddieSpecialty.trim() || !caddieExperience.trim()) return;

    const initials = getInitials(caddieName);
    const color = colorOptions[caddies.length % colorOptions.length];

    const payload = {
      name: caddieName.trim(),
      specialty: caddieSpecialty.trim(),
      exp: caddieExperience.trim(),
      rating: 4.8,
      rounds: 0,
      topRated: false,
      initials,
      color,
      phone: caddiePhone.trim() || undefined,
      email: caddieEmail.trim() || undefined,
      idNumber: caddieIdNumber.trim() || undefined,
      address: caddieAddress.trim() || undefined,
      age: caddieAge === '' ? undefined : Number(caddieAge),
      poBox: caddiePoBox.trim() || undefined,
      organizationClubId: caddieOrganizationClubId === '' ? undefined : Number(caddieOrganizationClubId),
    };

    if (editingCaddieId) {
      const ok = await updateCaddie(editingCaddieId, payload);
      if (!ok) {
        alert('Failed to update caddie profile.');
        return;
      }

      setCaddies((prev) =>
        prev.map((caddie) => (caddie.id === editingCaddieId ? { ...caddie, ...payload } : caddie)),
      );
      await logAudit(
        'caddie_updated',
        'caddie',
        editingCaddieId,
        payload.name,
        'Updated caddie profile',
      );
      resetCaddieForm();
      setCurrentView('caddies');
      return;
    }

    const created = await createCaddie(payload);

    if (!created) {
      alert('Failed to add caddie.');
      return;
    }

    setCaddies((prev) => [...prev, created]);
    await logAudit(
      'caddie_created',
      'caddie',
      created.id,
      created.name,
      'Created caddie profile',
      { organizationClubId: created.organizationClubId ?? null },
    );
    resetCaddieForm();
    setCurrentView('caddies');
  };

  const removeCaddie = async (id: number) => {
    if (!canManageCaddies) return;
    const caddie = caddies.find((item) => item.id === id);
    if (!caddie || !currentAdmin) return;

    const hasRelatedBookings = bookings.some((booking) => booking.caddieId === id);
    if (hasRelatedBookings) {
      alert('This caddie has booking history and cannot be removed.');
      return;
    }

    if (!confirm('Remove this caddie?')) return;

    if (currentAdmin.role !== 'super-admin') {
      const requested = await createDeletionRequest({
        entityType: 'caddie',
        entityId: id,
        entityLabel: caddie.name,
        requestedByEmail: currentAdmin.email,
      });

      if (!requested) {
        alert('Failed to submit delete request.');
        return;
      }

      await logAudit(
        'deletion_requested',
        'deletion_request',
        id,
        caddie.name,
        'Requested caddie deletion for super-admin approval',
      );

      alert('Delete request submitted. Super admin approval is required.');
      return;
    }

    const ok = await deleteCaddie(id);
    if (!ok) {
      alert('Failed to remove caddie.');
      return;
    }
    setCaddies((prev) => prev.filter((caddie) => caddie.id !== id));

    await logAudit(
      'caddie_deleted',
      'caddie',
      id,
      caddie.name,
      'Caddie deleted directly by super-admin',
    );
  };

  if (!currentAdmin) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg,#0F1F17 0%,#1C3A2A 60%,#0F1F17 100%)' }}
      >
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <svg className="w-7 h-7" style={{ color: '#c9a962' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-white tracking-tight">Admin Portal</p>
              <p className="text-xs text-gray-400 uppercase tracking-widest">ApexGolf Africa</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b border-gray-100" style={{ background: 'linear-gradient(to right,#f8f6f1,#fff)' }}>
              <h2 className="font-serif text-xl font-bold text-[#0f1f17]">Admin Access</h2>
              <p className="text-sm text-gray-500 mt-1">Sign in with your admin credentials to continue.</p>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@apexgolf.africa"
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

                {authError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600">{authError}</p>
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentAdmin.mustChangePassword) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg,#0F1F17 0%,#1C3A2A 60%,#0F1F17 100%)' }}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-gray-100" style={{ background: 'linear-gradient(to right,#f8f6f1,#fff)' }}>
            <h1 className="text-2xl font-serif font-bold text-[#0f1f17]">Set Your New Password</h1>
            <p className="text-sm text-gray-500 mt-1">Your account has a temporary password. Create a secure one to continue.</p>
          </div>

          <form onSubmit={handleSetNewPassword} className="space-y-4 p-8">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3.5 text-gray-700 placeholder-gray-400"
              style={{ border: '2px solid #E5E7EB', background: '#FAFAFA' }}
              placeholder="New password"
              required
            />
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3.5 text-gray-700 placeholder-gray-400"
              style={{ border: '2px solid #E5E7EB', background: '#FAFAFA' }}
              placeholder="Confirm new password"
              required
            />

            {passwordChangeError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-600">{passwordChangeError}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: 'linear-gradient(135deg,#1C3A2A 0%,#2D5A3D 100%)', boxShadow: '0 4px 15px -3px rgba(28,58,42,0.45)' }}
            >
              Save New Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.total, 0);

  const today = new Date().toDateString();
  const todayLogins = loginHistory.filter((entry) => new Date(entry.loginAt).toDateString() === today).length;
  const adminUsers = admins.filter((a) => a.role === 'admin').length;

  return (
    <div className="relative min-h-screen md:flex" style={{ backgroundColor: '#F0F2F5' }}>
      {/* Mobile Sidebar Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] -translate-x-full flex-col text-white transition-transform duration-300 md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : ''
        }`}
        style={{ background: 'linear-gradient(180deg,#0F1F17 0%,#1C3A2A 100%)' }}
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between gap-3">
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
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
              <button
                type="button"
                aria-label="Close menu"
                className="inline-flex md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <svg className="hidden h-6 w-6 md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
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

          <button
            onClick={() => setCurrentView('auditTrail')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${
              currentView === 'auditTrail' ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586A1 1 0 0113.293 3.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
            <span>Audit Trail</span>
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
      <div className="flex-1 min-w-0 overflow-x-hidden">
        <div className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-700"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold text-gray-900">{navTitles[currentView]}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs font-medium text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>

        {currentView === 'dashboard' && (
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
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
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{clubs.length}</p>
                <p className="text-green-600 text-xs mt-1">↗ Total active</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Caddies</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{caddies.length}</p>
                <p className="text-green-600 text-xs mt-1">↗ Registered</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Members</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminUsers}</p>
                <p className="text-green-600 text-xs mt-1">↗ Admin users</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Transactions</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{bookings.length}</p>
                <p className="text-green-600 text-xs mt-1">↗ All time</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Revenue</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">Ksh {totalRevenue.toLocaleString()}</p>
                <p className="text-green-600 text-xs mt-1">↗ Total earned</p>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm">Today's Logins</p>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{todayLogins}</p>
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
                  {loginHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">No login activity yet.</p>
                  ) : (
                    loginHistory.slice(0, 5).map((entry) => {
                      const matchedAdmin = admins.find((admin) => admin.email.toLowerCase() === entry.email.toLowerCase());
                      return (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-white">
                                {getInitials(matchedAdmin?.name || entry.email)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{matchedAdmin?.name || entry.email}</p>
                              <p className="text-sm text-gray-600 capitalize">{entry.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{new Date(entry.loginAt).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                  onClick={() => {
                    resetCaddieForm();
                    setCurrentView('caddieOnboarding');
                  }}
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
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Organizations</h1>
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
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Caddies</h1>
                <p className="text-gray-600">Manage caddie profiles and organization assignments</p>
              </div>
              <button
                onClick={() => {
                  resetCaddieForm();
                  setCurrentView('caddieOnboarding');
                }}
                disabled={!canManageCaddies}
                className="rounded-lg bg-[#0f281e] px-4 py-2.5 text-sm font-medium text-white hover:bg-green-900 disabled:opacity-50"
              >
                Add New Caddie Profile
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
              {!canManageCaddies && <p className="text-sm text-amber-700 mb-4 bg-amber-50 p-3 rounded-lg">You do not have permission to manage caddies.</p>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={caddieSearch}
                  onChange={(e) => setCaddieSearch(e.target.value)}
                  placeholder="Search caddie by name, specialty, phone or email"
                  className="md:col-span-2 w-full border border-gray-300 rounded-lg px-4 py-2.5"
                />
                <select
                  value={caddieOrganizationFilter}
                  onChange={(e) => setCaddieOrganizationFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5"
                >
                  <option value="all">All organizations</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">All Caddies ({filteredCaddies.length})</h2>
              {filteredCaddies.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No caddies found</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-max sm:min-w-full">
                    <thead>
                      <tr className="text-left text-xs sm:text-sm text-gray-500 border-b border-gray-200">
                        <th className="px-3 sm:px-4 py-3">Caddie</th>
                        <th className="px-3 sm:px-4 py-3">Employee ID</th>
                        <th className="px-3 sm:px-4 py-3">Organization</th>
                        <th className="px-3 sm:px-4 py-3">Contact</th>
                        <th className="px-3 sm:px-4 py-3">Email</th>
                        <th className="px-3 sm:px-4 py-3">ID Number</th>
                        <th className="px-3 sm:px-4 py-3">Status</th>
                        <th className="px-3 sm:px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCaddies.map((caddie) => {
                        const organization = clubs.find((club) => club.id === caddie.organizationClubId)?.name ?? 'Unassigned';
                        return (
                          <tr key={caddie.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`w-8 sm:w-10 h-8 sm:h-10 ${caddie.color} rounded-full flex items-center justify-center shrink-0`}>
                                  <span className="text-xs sm:text-sm font-semibold text-white">{caddie.initials}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 text-sm truncate">{caddie.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{caddie.specialty}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap">CD-{caddie.id}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">{organization}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">{caddie.phone || '-'}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 truncate">{caddie.email || '-'}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">{caddie.idNumber || '-'}</td>
                            <td className="px-3 sm:px-4 py-3"><span className="inline-flex items-center rounded-full bg-green-100 px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium text-green-700">Active</span></td>
                            <td className="px-3 sm:px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-2 sm:gap-3">
                                <button onClick={() => beginEditCaddie(caddie)} className="text-blue-600 hover:text-blue-700 disabled:opacity-50 text-xs sm:text-sm" disabled={!canManageCaddies}>Edit</button>
                                <button
                                  onClick={() => removeCaddie(caddie.id)}
                                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                                  disabled={!canManageCaddies}
                                  title="Remove caddie"
                                >
                                  <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Caddie Onboarding View */}
        {currentView === 'caddieOnboarding' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{editingCaddieId ? 'Edit Caddie Profile' : 'Add Caddie Profile'}</h1>
                <p className="text-gray-600">Capture complete caddie details and assign organization.</p>
              </div>
              <button
                onClick={() => {
                  resetCaddieForm();
                  setCurrentView('caddies');
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Caddies
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <form onSubmit={addCaddie} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={caddieName} onChange={(e) => setCaddieName(e.target.value)} placeholder="Caddie full name" className="border border-gray-300 rounded-lg px-4 py-2.5" required disabled={!canManageCaddies} />
                <input type="text" value={caddieSpecialty} onChange={(e) => setCaddieSpecialty(e.target.value)} placeholder="Specialty" className="border border-gray-300 rounded-lg px-4 py-2.5" required disabled={!canManageCaddies} />
                <input type="text" value={caddieExperience} onChange={(e) => setCaddieExperience(e.target.value)} placeholder="Experience (e.g., 5 years)" className="border border-gray-300 rounded-lg px-4 py-2.5" required disabled={!canManageCaddies} />
                <input type="tel" value={caddiePhone} onChange={(e) => setCaddiePhone(e.target.value)} placeholder="Phone number" className="border border-gray-300 rounded-lg px-4 py-2.5" required disabled={!canManageCaddies} />
                <input type="email" value={caddieEmail} onChange={(e) => setCaddieEmail(e.target.value)} placeholder="Email address" className="border border-gray-300 rounded-lg px-4 py-2.5" required disabled={!canManageCaddies} />
                <input type="text" value={caddieIdNumber} onChange={(e) => setCaddieIdNumber(e.target.value)} placeholder="National ID number" className="border border-gray-300 rounded-lg px-4 py-2.5" required disabled={!canManageCaddies} />
                <input type="number" value={caddieAge} onChange={(e) => setCaddieAge(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Age" className="border border-gray-300 rounded-lg px-4 py-2.5" min={18} max={80} required disabled={!canManageCaddies} />
                <input type="text" value={caddiePoBox} onChange={(e) => setCaddiePoBox(e.target.value)} placeholder="P.O. Box" className="border border-gray-300 rounded-lg px-4 py-2.5" disabled={!canManageCaddies} />
                <select
                  value={caddieOrganizationClubId}
                  onChange={(e) => setCaddieOrganizationClubId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-4 py-2.5"
                  required
                  disabled={!canManageCaddies}
                >
                  <option value="">Select organization</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <input type="text" value={caddieAddress} onChange={(e) => setCaddieAddress(e.target.value)} placeholder="Physical address / where they live" className="border border-gray-300 rounded-lg px-4 py-2.5" required disabled={!canManageCaddies} />

                <div className="md:col-span-2 flex gap-3 pt-2">
                  <button type="submit" className="rounded-lg bg-[#0f281e] px-5 py-2.5 text-sm font-medium text-white hover:bg-green-900 disabled:opacity-50" disabled={!canManageCaddies}>
                    {editingCaddieId ? 'Update Caddie Profile' : 'Save Caddie Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={resetCaddieForm}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Members View */}
        {currentView === 'members' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Members</h1>
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
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Login History</h1>
                <p className="text-gray-600">Track employee login activity and sessions</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadLoginHistory}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Refresh
                </button>
                <button
                  onClick={exportLoginHistoryCsv}
                  className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Total Logins</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{loginHistory.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Today's Logins</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{todayLogins}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Active Sessions</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
                  {loginHistory.filter((entry) => Date.now() - new Date(entry.loginAt).getTime() <= 24 * 60 * 60 * 1000).length}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Unique Users</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{new Set(loginHistory.map((entry) => entry.email.toLowerCase())).size}</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <input
                  type="text"
                  value={loginSearch}
                  onChange={(e) => setLoginSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="md:col-span-3 rounded-lg border border-gray-300 px-4 py-2.5"
                />
                <select
                  value={loginRoleFilter}
                  onChange={(e) => setLoginRoleFilter(e.target.value as 'all' | 'admin' | 'super-admin')}
                  className="md:col-span-1 rounded-lg border border-gray-300 px-4 py-2.5"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="super-admin">Super Admin</option>
                </select>
                <select
                  value={loginTimeFilter}
                  onChange={(e) => setLoginTimeFilter(e.target.value as 'all' | 'today' | '7d' | '30d')}
                  className="md:col-span-2 rounded-lg border border-gray-300 px-4 py-2.5"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-6">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Login Records ({filteredLoginHistory.length})</h2>
                <div className="space-y-3">
                  {filteredLoginHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">No login activity yet.</p>
                  ) : (
                    filteredLoginHistory.map((entry) => {
                      const matchedAdmin = admins.find((admin) => admin.email.toLowerCase() === entry.email.toLowerCase());
                      const minutesAgo = Math.max(1, Math.floor((Date.now() - new Date(entry.loginAt).getTime()) / (1000 * 60)));
                      return (
                        <div key={entry.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-white">
                                {getInitials(matchedAdmin?.name || entry.email)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{matchedAdmin?.name || entry.email}</p>
                              <p className="text-sm text-gray-600 capitalize">{entry.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{new Date(entry.loginAt).toLocaleString()}</p>
                            <p className="text-xs text-green-600">● {minutesAgo}m ago</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit Trail View */}
        {currentView === 'auditTrail' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Audit Trail</h1>
                <p className="text-gray-600">Review a tamper-evident history of admin operations and approvals.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadAuditTrail}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Refresh
                </button>
                <button
                  onClick={exportAuditTrailCsv}
                  className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Total Events</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{auditTrail.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Today</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
                  {
                    auditTrail.filter((entry) => new Date(entry.createdAt).toDateString() === new Date().toDateString())
                      .length
                  }
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Unique Actors</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{new Set(auditTrail.map((entry) => entry.actorEmail.toLowerCase())).size}</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search action, actor, entity, or details..."
                  className="md:col-span-3 rounded-lg border border-gray-300 px-4 py-2.5"
                />
                <select
                  value={auditEntityFilter}
                  onChange={(e) => setAuditEntityFilter(e.target.value as typeof auditEntityFilter)}
                  className="md:col-span-2 rounded-lg border border-gray-300 px-4 py-2.5"
                >
                  <option value="all">All Entities</option>
                  <option value="booking">Booking</option>
                  <option value="club">Club</option>
                  <option value="caddie">Caddie</option>
                  <option value="admin_user">Admin User</option>
                  <option value="deletion_request">Deletion Request</option>
                  <option value="auth">Auth</option>
                  <option value="system">System</option>
                </select>
                <select
                  value={auditRoleFilter}
                  onChange={(e) => setAuditRoleFilter(e.target.value as typeof auditRoleFilter)}
                  className="md:col-span-1 rounded-lg border border-gray-300 px-4 py-2.5"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="super-admin">Super Admin</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-max sm:min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAuditTrail.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No audit records found for the selected filters.</td>
                      </tr>
                    ) : (
                      filteredAuditTrail.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</td>
                          <td className="px-3 sm:px-6 py-4">
                            <p className="text-xs sm:text-sm font-medium text-gray-900">{entry.actorEmail}</p>
                            <p className="text-xs text-gray-500 capitalize">{entry.actorRole}</p>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <span className="inline-flex rounded-full bg-green-50 border border-green-200 px-2 sm:px-2.5 py-1 text-xs font-semibold text-green-700">
                              {entry.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <p className="text-xs sm:text-sm font-medium text-gray-900">{entry.entityType}</p>
                            <p className="text-xs text-gray-500">{entry.entityLabel ?? (entry.entityId ? `ID ${entry.entityId}` : '-')}</p>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{entry.details ?? '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Transactions View */}
        {currentView === 'transactions' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
                <p className="text-gray-600">Manage transaction history and payments</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportTransactionsCsv}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Export
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  New Transaction
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{filteredTransactions.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Completed</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{filteredTransactions.filter((booking) => booking.status === 'confirmed').length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{filteredTransactions.filter((booking) => booking.status === 'pending').length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
                  Ksh {filteredTransactions.filter((booking) => booking.status === 'confirmed').reduce((sum, booking) => sum + booking.total, 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <input
                  type="text"
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                  placeholder="Search by client, caddie, or organization..."
                  className="md:col-span-4 rounded-lg border border-gray-300 px-4 py-2.5"
                />
                <select
                  value={transactionStatusFilter}
                  onChange={(e) => setTransactionStatusFilter(e.target.value as 'all' | Booking['status'])}
                  className="md:col-span-1 rounded-lg border border-gray-300 px-4 py-2.5"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600">Try adjusting your filters or create a new transaction.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-max sm:min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.map((booking) => {
                      const club = clubs.find((c) => c.id === booking.clubId);
                      const caddie = caddies.find((c) => c.id === booking.caddieId);
                      return (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className="font-mono text-xs sm:text-sm font-semibold text-[#c5a059]">APX-{booking.id.toString().slice(-5)}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div>
                              <p className="font-medium text-gray-900 text-xs sm:text-sm">{booking.firstName} {booking.lastName}</p>
                              <p className="text-xs text-gray-600">{caddie?.name || booking.email}</p>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">{club?.name || 'Unknown'}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{new Date(booking.date).toLocaleDateString()}</td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <span className="font-semibold text-gray-900 text-xs sm:text-sm">Ksh {booking.total.toLocaleString()}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
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
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;


