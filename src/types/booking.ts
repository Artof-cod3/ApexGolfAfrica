// types/booking.ts
export interface Booking {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  clubId: number;
  date: string;
  time: string;
  players: number;
  caddieId: number;
  equipment: { id: number; qty: number }[];
  delivery: { type: string; cost: number };
  addons: { photo: boolean; video: boolean };
  total: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}