// services/database.ts
import { supabase } from '../lib/supabase';
import type { Booking } from '../types/booking';
import type { Club, Caddie, AdminUser } from '../types/entities';

export type AdminLoginHistoryItem = {
  id: number;
  adminId: number | null;
  email: string;
  role: 'admin' | 'super-admin';
  loginAt: string;
};

export type DeletionRequestEntityType = 'booking' | 'club' | 'caddie';

export type DeletionRequestItem = {
  id: number;
  entityType: DeletionRequestEntityType;
  entityId: number;
  entityLabel: string;
  requestedByEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByEmail: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AuditTrailEntityType =
  | 'booking'
  | 'club'
  | 'caddie'
  | 'admin_user'
  | 'deletion_request'
  | 'auth'
  | 'system';

export type AuditTrailItem = {
  id: number;
  actorEmail: string;
  actorRole: 'admin' | 'super-admin';
  action: string;
  entityType: AuditTrailEntityType;
  entityId: number | null;
  entityLabel: string | null;
  details: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const TEMP_PASSWORD_PREFIX = 'TEMP::';

const isTemporaryPassword = (password: string | null | undefined) =>
  typeof password === 'string' && password.startsWith(TEMP_PASSWORD_PREFIX);

const stripTemporaryPrefix = (password: string | null | undefined) =>
  isTemporaryPassword(password)
    ? (password as string).slice(TEMP_PASSWORD_PREFIX.length)
    : (password ?? '');

const mapAdminRowToEntity = (admin: any): AdminUser => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  password: stripTemporaryPrefix(admin.password),
  mustChangePassword: isTemporaryPassword(admin.password),
  role: admin.role as 'admin' | 'super-admin',
  permissions: {
    canEditBookings: admin.can_edit_bookings,
    canManageClubs: admin.can_manage_clubs,
    canManageCaddies: admin.can_manage_caddies,
    canManageClubRates: admin.can_manage_club_rates,
  },
});

const mapCaddieRowToEntity = (caddie: any): Caddie => ({
  id: caddie.id,
  name: caddie.name,
  specialty: caddie.specialty,
  exp: caddie.experience,
  rating: caddie.rating,
  rounds: caddie.rounds,
  topRated: caddie.top_rated,
  initials: caddie.initials,
  color: caddie.color,
  phone: caddie.phone ?? undefined,
  email: caddie.email ?? undefined,
  idNumber: caddie.id_number ?? undefined,
  address: caddie.address ?? undefined,
  age: caddie.age ?? undefined,
  poBox: caddie.po_box ?? undefined,
  organizationClubId: caddie.organization_club_id ?? undefined,
  createdAt: caddie.created_at ?? undefined,
});

const getMissingColumnFromError = (error: any): string | null => {
  const message = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const knownColumns = [
    'organization_club_id',
    'phone',
    'email',
    'id_number',
    'address',
    'age',
    'po_box',
  ];

  return knownColumns.find((column) => message.includes(column)) ?? null;
};

const buildCreateCaddiePayload = (caddie: Omit<Caddie, 'id'>): Record<string, unknown> => ({
  name: caddie.name,
  specialty: caddie.specialty,
  experience: caddie.exp,
  rating: caddie.rating,
  rounds: caddie.rounds,
  top_rated: caddie.topRated,
  initials: caddie.initials,
  color: caddie.color,
  phone: caddie.phone ?? null,
  email: caddie.email ?? null,
  id_number: caddie.idNumber ?? null,
  address: caddie.address ?? null,
  age: caddie.age ?? null,
  po_box: caddie.poBox ?? null,
  organization_club_id: caddie.organizationClubId ?? null,
});

const buildUpdateCaddiePayload = (updates: Partial<Caddie>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.specialty !== undefined) payload.specialty = updates.specialty;
  if (updates.exp !== undefined) payload.experience = updates.exp;
  if (updates.rating !== undefined) payload.rating = updates.rating;
  if (updates.rounds !== undefined) payload.rounds = updates.rounds;
  if (updates.topRated !== undefined) payload.top_rated = updates.topRated;
  if (updates.initials !== undefined) payload.initials = updates.initials;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.idNumber !== undefined) payload.id_number = updates.idNumber;
  if (updates.address !== undefined) payload.address = updates.address;
  if (updates.age !== undefined) payload.age = updates.age;
  if (updates.poBox !== undefined) payload.po_box = updates.poBox;
  if (updates.organizationClubId !== undefined) payload.organization_club_id = updates.organizationClubId;
  return payload;
};

async function hasCaddieBookingConflict(input: {
  caddieName: string;
  date: string;
  time: string;
  excludeBookingId?: number;
}): Promise<boolean> {
  let query = supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('caddie_name', input.caddieName)
    .eq('date', input.date)
    .eq('time', input.time)
    .in('status', ['pending', 'confirmed']);

  if (input.excludeBookingId !== undefined) {
    query = query.neq('id', input.excludeBookingId);
  }

  const { count, error } = await query;
  if (error) {
    console.error('Error checking caddie booking conflict:', error);
    return false;
  }

  return (count ?? 0) > 0;
}

// ============================================
// CLUBS
// ============================================

export async function fetchClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching clubs:', error);
    return [];
  }

  return data.map((club) => ({
    id: club.id,
    name: club.name,
    location: club.location,
    ratePerPlayer: club.rate_per_player,
  }));
}

export async function createClub(club: Omit<Club, 'id'>): Promise<Club | null> {
  const { data, error } = await supabase
    .from('clubs')
    .insert({
      name: club.name,
      location: club.location,
      rate_per_player: club.ratePerPlayer,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating club:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    location: data.location,
    ratePerPlayer: data.rate_per_player,
  };
}

export async function updateClub(id: number, updates: Partial<Club>): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.ratePerPlayer !== undefined) dbUpdates.rate_per_player = updates.ratePerPlayer;

  const { error } = await supabase
    .from('clubs')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating club:', error);
    return false;
  }

  return true;
}

export async function deleteClub(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('clubs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting club:', error);
    return false;
  }

  return true;
}

// ============================================
// CADDIES
// ============================================

export async function fetchCaddies(): Promise<Caddie[]> {
  const { data, error } = await supabase
    .from('caddies')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching caddies:', error);
    return [];
  }

  return data.map(mapCaddieRowToEntity);
}

export async function createCaddie(caddie: Omit<Caddie, 'id'>): Promise<Caddie | null> {
  const payload = buildCreateCaddiePayload(caddie);

  let workingPayload: Record<string, unknown> = { ...payload };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from('caddies')
      .insert(workingPayload)
      .select()
      .single();

    if (!error && data) {
      return mapCaddieRowToEntity(data);
    }

    const missingColumn = getMissingColumnFromError(error);
    if (!missingColumn || !(missingColumn in workingPayload)) {
      console.error('Error creating caddie:', error);
      return null;
    }

    // Retry without only the unsupported column so all other details still persist.
    delete workingPayload[missingColumn];
  }

  return null;
}

export async function updateCaddie(id: number, updates: Partial<Caddie>): Promise<boolean> {
  let workingPayload: Record<string, unknown> = buildUpdateCaddiePayload(updates);

  if (Object.keys(workingPayload).length === 0) return true;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase
      .from('caddies')
      .update(workingPayload)
      .eq('id', id);

    if (!error) return true;

    const missingColumn = getMissingColumnFromError(error);
    if (!missingColumn || !(missingColumn in workingPayload)) {
      console.error('Error updating caddie:', error);
      return false;
    }

    delete workingPayload[missingColumn];
  }

  return false;
}

export async function deleteCaddie(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('caddies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting caddie:', error);
    return false;
  }

  return true;
}

// ============================================
// ADMIN USERS
// ============================================

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('email');

  if (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }

  return data.map(mapAdminRowToEntity);
}

export async function createAdminUser(admin: Omit<AdminUser, 'id'>): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      name: admin.name,
      email: admin.email,
      password: admin.password,
      role: admin.role,
      can_edit_bookings: admin.permissions.canEditBookings,
      can_manage_clubs: admin.permissions.canManageClubs,
      can_manage_caddies: admin.permissions.canManageCaddies,
      can_manage_club_rates: admin.permissions.canManageClubRates,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating admin user:', error);
    return null;
  }

  return mapAdminRowToEntity(data);
}

export async function updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.password !== undefined) dbUpdates.password = updates.password;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.permissions) {
    if (updates.permissions.canEditBookings !== undefined) 
      dbUpdates.can_edit_bookings = updates.permissions.canEditBookings;
    if (updates.permissions.canManageClubs !== undefined) 
      dbUpdates.can_manage_clubs = updates.permissions.canManageClubs;
    if (updates.permissions.canManageCaddies !== undefined) 
      dbUpdates.can_manage_caddies = updates.permissions.canManageCaddies;
    if (updates.permissions.canManageClubRates !== undefined) 
      dbUpdates.can_manage_club_rates = updates.permissions.canManageClubRates;
  }

  const { error } = await supabase
    .from('admin_users')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating admin user:', error);
    return false;
  }

  return true;
}

export async function deleteAdminUser(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('admin_users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting admin user:', error);
    return false;
  }

  return true;
}

export async function loginAdmin(email: string, password: string): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    return null;
  }

  const dbPassword = data.password as string;
  const validPassword =
    dbPassword === password ||
    (isTemporaryPassword(dbPassword) && stripTemporaryPrefix(dbPassword) === password);

  if (!validPassword) {
    return null;
  }

  // Log login history
  await supabase.from('admin_login_history').insert({
    admin_id: data.id,
    email: data.email,
    role: data.role,
  });

  return mapAdminRowToEntity(data);
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) return null;
  return mapAdminRowToEntity(data);
}

export async function loginWithGoogle(redirectPath = '/admin'): Promise<boolean> {
  const redirectTo = `${window.location.origin}${redirectPath}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  return !error;
}

export async function getOauthAdminFromSession(): Promise<AdminUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const email = session?.user?.email;
  if (!email) return null;

  return getAdminByEmail(email);
}

export async function recordAdminLogin(admin: Pick<AdminUser, 'id' | 'email' | 'role'>): Promise<void> {
  await supabase.from('admin_login_history').insert({
    admin_id: admin.id,
    email: admin.email,
    role: admin.role,
  });
}

export async function fetchAdminLoginHistory(limit = 20): Promise<AdminLoginHistoryItem[]> {
  const { data, error } = await supabase
    .from('admin_login_history')
    .select('*')
    .order('login_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching admin login history:', error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    email: row.email,
    role: row.role,
    loginAt: row.login_at,
  }));
}

// ============================================
// AUDIT TRAIL
// ============================================

export async function createAuditTrailEntry(input: {
  actorEmail: string;
  actorRole: 'admin' | 'super-admin';
  action: string;
  entityType: AuditTrailEntityType;
  entityId?: number | null;
  entityLabel?: string | null;
  details?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<boolean> {
  const { error } = await supabase.from('audit_trail').insert({
    actor_email: input.actorEmail,
    actor_role: input.actorRole,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
    details: input.details ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    console.error('Error creating audit trail entry:', error);
    return false;
  }

  return true;
}

export async function fetchAuditTrail(limit = 100): Promise<AuditTrailItem[]> {
  const { data, error } = await supabase
    .from('audit_trail')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching audit trail:', error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    details: row.details,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

// ============================================
// DELETION REQUESTS
// ============================================

export async function createDeletionRequest(input: {
  entityType: DeletionRequestEntityType;
  entityId: number;
  entityLabel: string;
  requestedByEmail: string;
}): Promise<boolean> {
  const { error } = await supabase.from('deletion_requests').insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_label: input.entityLabel,
    requested_by_email: input.requestedByEmail,
    status: 'pending',
  });

  if (error) {
    console.error('Error creating deletion request:', error);
    return false;
  }

  return true;
}

export async function fetchDeletionRequests(status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<DeletionRequestItem[]> {
  const { data, error } = await supabase
    .from('deletion_requests')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching deletion requests:', error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    requestedByEmail: row.requested_by_email,
    status: row.status,
    reviewedByEmail: row.reviewed_by_email,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  }));
}

export async function reviewDeletionRequest(input: {
  requestId: number;
  reviewedByEmail: string;
  status: 'approved' | 'rejected';
}): Promise<boolean> {
  const { error } = await supabase
    .from('deletion_requests')
    .update({
      status: input.status,
      reviewed_by_email: input.reviewedByEmail,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .eq('status', 'pending');

  if (error) {
    console.error('Error reviewing deletion request:', error);
    return false;
  }

  return true;
}

// ============================================
// BOOKINGS
// ============================================

async function getBookingLookups() {
  const [clubs, caddies] = await Promise.all([fetchClubs(), fetchCaddies()]);

  const clubNameById = new Map<number, string>(clubs.map((club) => [club.id, club.name]));
  const clubIdByName = new Map<string, number>(clubs.map((club) => [club.name, club.id]));

  const caddieNameById = new Map<number, string>(caddies.map((caddie) => [caddie.id, caddie.name]));
  const caddieIdByName = new Map<string, number>(caddies.map((caddie) => [caddie.name, caddie.id]));

  return { clubNameById, clubIdByName, caddieNameById, caddieIdByName };
}

function mapBookingRowToBooking(
  booking: any,
  lookups: {
    clubIdByName: Map<string, number>;
    caddieIdByName: Map<string, number>;
  },
): Booking {
  return {
    id: booking.id,
    firstName: booking.first_name,
    lastName: booking.last_name,
    email: booking.email,
    phone: booking.phone,
    nationality: booking.nationality,
    clubId: lookups.clubIdByName.get(booking.club_name ?? '') ?? -1,
    date: booking.date,
    time: booking.time,
    players: booking.players,
    caddieId: lookups.caddieIdByName.get(booking.caddie_name ?? '') ?? -1,
    equipment: booking.equipment || [],
    delivery: booking.delivery || { type: 'standard', cost: 0 },
    addons: booking.addons || { photo: false, video: false },
    total: booking.total,
    status: booking.status as 'pending' | 'confirmed' | 'cancelled',
    createdAt: booking.created_at,
  };
}

export async function fetchBookings(): Promise<Booking[]> {
  const lookups = await getBookingLookups();

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }

  return data.map((booking) => mapBookingRowToBooking(booking, lookups));
}

export async function createBooking(booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking | null> {
  const lookups = await getBookingLookups();
  const selectedCaddieName = lookups.caddieNameById.get(booking.caddieId) ?? null;

  if (selectedCaddieName && (booking.status === 'pending' || booking.status === 'confirmed')) {
    const hasConflict = await hasCaddieBookingConflict({
      caddieName: selectedCaddieName,
      date: booking.date,
      time: booking.time,
    });

    if (hasConflict) {
      console.error('Booking conflict: caddie already booked for selected date and time.');
      return null;
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      first_name: booking.firstName,
      last_name: booking.lastName,
      email: booking.email,
      phone: booking.phone,
      nationality: booking.nationality,
      club_name: lookups.clubNameById.get(booking.clubId) ?? null,
      date: booking.date,
      time: booking.time,
      players: booking.players,
      caddie_name: selectedCaddieName,
      equipment: booking.equipment,
      delivery: booking.delivery,
      addons: booking.addons,
      total: booking.total,
      status: booking.status,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating booking:', error);
    return null;
  }

  return mapBookingRowToBooking(data, lookups);
}

export async function updateBooking(id: number, updates: Partial<Booking>): Promise<boolean> {
  const lookups = await getBookingLookups();
  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.nationality !== undefined) dbUpdates.nationality = updates.nationality;
  if (updates.clubId !== undefined) dbUpdates.club_name = lookups.clubNameById.get(updates.clubId) ?? null;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.time !== undefined) dbUpdates.time = updates.time;
  if (updates.players !== undefined) dbUpdates.players = updates.players;
  if (updates.caddieId !== undefined) dbUpdates.caddie_name = lookups.caddieNameById.get(updates.caddieId) ?? null;
  if (updates.equipment !== undefined) dbUpdates.equipment = updates.equipment;
  if (updates.delivery !== undefined) dbUpdates.delivery = updates.delivery;
  if (updates.addons !== undefined) dbUpdates.addons = updates.addons;
  if (updates.total !== undefined) dbUpdates.total = updates.total;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  const { data: existingBooking, error: existingBookingError } = await supabase
    .from('bookings')
    .select('caddie_name, date, time, status')
    .eq('id', id)
    .single();

  if (existingBookingError || !existingBooking) {
    console.error('Error loading booking before update:', existingBookingError);
    return false;
  }

  const nextCaddieName =
    updates.caddieId !== undefined
      ? (lookups.caddieNameById.get(updates.caddieId) ?? null)
      : (existingBooking.caddie_name as string | null);
  const nextDate = updates.date ?? existingBooking.date;
  const nextTime = updates.time ?? existingBooking.time;
  const nextStatus = updates.status ?? existingBooking.status;

  if (nextCaddieName && (nextStatus === 'pending' || nextStatus === 'confirmed')) {
    const hasConflict = await hasCaddieBookingConflict({
      caddieName: nextCaddieName,
      date: nextDate,
      time: nextTime,
      excludeBookingId: id,
    });

    if (hasConflict) {
      console.error('Booking conflict: caddie already booked for selected date and time.');
      return false;
    }
  }

  const { error } = await supabase
    .from('bookings')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating booking:', error);
    return false;
  }

  return true;
}

export async function deleteBooking(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting booking:', error);
    return false;
  }

  return true;
}

export async function fetchBookingByReference(referenceId: string): Promise<Booking | null> {
  const lookups = await getBookingLookups();

  // Extract numeric ID from reference (e.g., "APX-12345" -> 12345)
  const numericId = parseInt(referenceId.replace(/\D/g, ''), 10);
  
  if (isNaN(numericId)) {
    return null;
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', numericId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapBookingRowToBooking(data, lookups);
}

export async function fetchBookingsByEmail(email: string): Promise<Booking[]> {
  const lookups = await getBookingLookups();

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bookings by email:', error);
    return [];
  }

  return data.map((booking) => mapBookingRowToBooking(booking, lookups));
}
