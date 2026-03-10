// services/database.ts
import { supabase } from '../lib/supabase';
import type { Booking } from '../types/booking';
import type { Club, Caddie, AdminUser } from '../types/entities';

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

  return data.map((caddie) => ({
    id: caddie.id,
    name: caddie.name,
    specialty: caddie.specialty,
    exp: caddie.experience,
    rating: caddie.rating,
    rounds: caddie.rounds,
    topRated: caddie.top_rated,
    initials: caddie.initials,
    color: caddie.color,
  }));
}

export async function createCaddie(caddie: Omit<Caddie, 'id'>): Promise<Caddie | null> {
  const { data, error } = await supabase
    .from('caddies')
    .insert({
      name: caddie.name,
      specialty: caddie.specialty,
      experience: caddie.exp,
      rating: caddie.rating,
      rounds: caddie.rounds,
      top_rated: caddie.topRated,
      initials: caddie.initials,
      color: caddie.color,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating caddie:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    specialty: data.specialty,
    exp: data.experience,
    rating: data.rating,
    rounds: data.rounds,
    topRated: data.top_rated,
    initials: data.initials,
    color: data.color,
  };
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

  return data.map((admin) => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    password: admin.password,
    role: admin.role as 'admin' | 'super-admin',
    permissions: {
      canEditBookings: admin.can_edit_bookings,
      canManageClubs: admin.can_manage_clubs,
      canManageCaddies: admin.can_manage_caddies,
      canManageClubRates: admin.can_manage_club_rates,
    },
  }));
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

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role,
    permissions: {
      canEditBookings: data.can_edit_bookings,
      canManageClubs: data.can_manage_clubs,
      canManageCaddies: data.can_manage_caddies,
      canManageClubRates: data.can_manage_club_rates,
    },
  };
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
    .eq('password', password)
    .single();

  if (error || !data) {
    return null;
  }

  // Log login history
  await supabase.from('admin_login_history').insert({
    admin_id: data.id,
    email: data.email,
    role: data.role,
  });

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role,
    permissions: {
      canEditBookings: data.can_edit_bookings,
      canManageClubs: data.can_manage_clubs,
      canManageCaddies: data.can_manage_caddies,
      canManageClubRates: data.can_manage_club_rates,
    },
  };
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
      caddie_name: lookups.caddieNameById.get(booking.caddieId) ?? null,
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
