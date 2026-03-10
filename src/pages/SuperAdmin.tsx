import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminPermissions, AdminUser } from '../types/entities';
import { createAdminUser, deleteAdminUser, loginAdmin, updateAdminUser } from '../services/database';

type Props = {
  admins: AdminUser[];
  setAdmins: React.Dispatch<React.SetStateAction<AdminUser[]>>;
};

const AUTH_SESSION_KEY = 'apex_admin_session';

const defaultPermissions: AdminPermissions = {
  canEditBookings: true,
  canManageClubs: true,
  canManageCaddies: true,
  canManageClubRates: true,
};

const SuperAdmin: React.FC<Props> = ({ admins, setAdmins }) => {
  const [isAllowed, setIsAllowed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [permissions, setPermissions] = useState<AdminPermissions>(defaultPermissions);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return;

    try {
      const session = JSON.parse(raw) as { email: string; role: 'admin' | 'super-admin' };
      const matched = admins.find((admin) => admin.email === session.email && admin.role === 'super-admin');
      setIsAllowed(Boolean(matched));
    } catch {
      setIsAllowed(false);
    }
  }, [admins]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();

    const matched = await loginAdmin(email.toLowerCase().trim(), password);

    if (!matched || matched.role !== 'super-admin') {
      setError('Only super admin can access this page.');
      return;
    }

    localStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify({ email: matched.email, role: matched.role }),
    );
    setIsAllowed(true);
    setError('');
  };

  const logout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    setIsAllowed(false);
    setEmail('');
    setPassword('');
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
      password: newPassword,
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
  };

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-serif font-bold text-[#0f281e] mb-2">Super Admin Access</h1>
          <p className="text-sm text-gray-600 mb-6">Login as super admin to manage admin users.</p>

          <form onSubmit={login} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              placeholder="superadmin@apexgolf.africa"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              placeholder="••••••••"
              required
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              className="w-full bg-[#0f281e] text-white py-2.5 rounded-lg font-medium hover:bg-green-900 transition"
            >
              Login
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4">Demo: superadmin@apexgolf.africa / Super@2026</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-[#0f281e] text-white p-6 rounded-xl mb-6 shadow-lg flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Super Admin Panel</h1>
            <p className="text-gray-300">Manage admins and permission access.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin" className="bg-white/10 border border-white/20 px-4 py-2 rounded-lg hover:bg-white/20">
              Admin Page
            </Link>
            <button onClick={logout} className="bg-white/10 border border-white/20 px-4 py-2 rounded-lg hover:bg-white/20">
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          <h2 className="text-xl font-serif font-bold text-[#0f281e] mb-4">Add Admin</h2>
          <form onSubmit={addAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="border border-gray-200 rounded-lg px-3 py-2"
              required
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@apexgolf.africa"
              className="border border-gray-200 rounded-lg px-3 py-2"
              required
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Temporary password"
              className="border border-gray-200 rounded-lg px-3 py-2"
              required
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={permissions.canEditBookings}
                onChange={() => setPermissions((prev) => ({ ...prev, canEditBookings: !prev.canEditBookings }))}
              />
              Can edit bookings
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={permissions.canManageClubs}
                onChange={() => setPermissions((prev) => ({ ...prev, canManageClubs: !prev.canManageClubs }))}
              />
              Can manage clubs
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={permissions.canManageCaddies}
                onChange={() => setPermissions((prev) => ({ ...prev, canManageCaddies: !prev.canManageCaddies }))}
              />
              Can manage caddies
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-3">
              <input
                type="checkbox"
                checked={permissions.canManageClubRates}
                onChange={() => setPermissions((prev) => ({ ...prev, canManageClubRates: !prev.canManageClubRates }))}
              />
              Can manage club rates
            </label>

            <button
              type="submit"
              className="md:col-span-3 bg-[#c5a059] text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
            >
              Create Admin
            </button>
          </form>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="text-xl font-serif font-bold text-[#0f281e] mb-4">Existing Admins</h2>
          <div className="space-y-3">
            {admins.map((admin) => (
              <div key={admin.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{admin.name}</p>
                    <p className="text-sm text-gray-500">{admin.email}</p>
                    <p className="text-xs uppercase text-[#c5a059] font-bold mt-1">{admin.role}</p>
                  </div>
                  {admin.role !== 'super-admin' && (
                    <button
                      onClick={() => removeAdmin(admin.id)}
                      className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {(
                    [
                      ['canEditBookings', 'Edit bookings'],
                      ['canManageClubs', 'Manage clubs'],
                      ['canManageCaddies', 'Manage caddies'],
                      ['canManageClubRates', 'Manage rates'],
                    ] as Array<[keyof AdminPermissions, string]>
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={admin.permissions[key]}
                        disabled={admin.role === 'super-admin'}
                        onChange={() => togglePermission(admin.id, key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
