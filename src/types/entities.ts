export interface Club {
  id: number;
  name: string;
  location: string;
  ratePerPlayer: number;
}

export interface Caddie {
  id: number;
  name: string;
  specialty: string;
  exp: string;
  rating: number;
  rounds: number;
  topRated: boolean;
  initials: string;
  color: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  address?: string;
  age?: number;
  poBox?: string;
  organizationClubId?: number;
  createdAt?: string;
}

export interface AdminPermissions {
  canEditBookings: boolean;
  canManageClubs: boolean;
  canManageCaddies: boolean;
  canManageClubRates: boolean;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  password: string;
  mustChangePassword?: boolean;
  role: 'super-admin' | 'admin';
  permissions: AdminPermissions;
}