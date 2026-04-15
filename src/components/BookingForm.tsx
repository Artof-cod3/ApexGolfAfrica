// components/BookingForm.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Booking } from '../types/booking';
import type { Caddie, Club } from '../types/entities';
import { createBooking, fetchBookingByReference, getLastCreateBookingError, updateBooking } from '../services/database';
import { initiateQuickwaveCheckout, verifyQuickwavePayment } from '../services/quickwave';
import { notifyCustomerForBooking } from '../services/customerCommunication';

type Props = {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  clubs: Club[];
  caddies: Caddie[];
};

const equipment = [
  { id: 1, name: "TaylorMade Stealth Set", brand: "TaylorMade", desc: "Driver, woods, irons (5-PW), wedge, putter - full bag included", price: 4000 },
  { id: 2, name: "Callaway Paradym Set", brand: "Callaway", desc: "Driver, fairway woods, irons (4-SW), putter - carry bag included", price: 4000 },
  { id: 3, name: "Ping G430 Set", brand: "Ping", desc: "Driver, 3-wood, hybrid, irons (5-PW), wedge, putter - tour bag", price: 4000 }
];

const teeTimes = ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "14:00"];

const PENDING_PAYMENT_STORAGE_KEY = 'apexgolf_pending_quickwave_payment';
const PENDING_BOOKING_LOCK_MS = 5 * 60 * 1000;

type PendingPaymentSession = {
  bookingId: number;
  bookingReference: string;
};

function normalizeKenyanPhone(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('254') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+254${digits}`;
  }

  return value.trim();
}

const BookingForm: React.FC<Props> = ({ bookings, setBookings, clubs, caddies }) => {
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [confirmationState, setConfirmationState] = useState<'confirmed' | 'verifying'>('confirmed');
  
  // Form state
  const [clubId, setClubId] = useState<number | null>(null);
  const [clubSearchQuery, setClubSearchQuery] = useState('');
  const [date, setDate] = useState('');
  const [players, setPlayers] = useState(1);
  const [time, setTime] = useState('');
  const [caddieId, setCaddieId] = useState<number | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<{id: number, qty: number}[]>([]);
  const [delivery, setDelivery] = useState({ type: 'club', cost: 0 });
  const [addons, setAddons] = useState({ photo: false, video: false });
  
  // User details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [requests, setRequests] = useState('');
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const unavailableCaddieIds = useMemo(() => {
    if (!date || !time) return new Set<number>();

    const lockCutoff = Date.now() - PENDING_BOOKING_LOCK_MS;

    const isActiveLock = (booking: Booking) => {
      if (booking.status === 'confirmed') return true;
      if (booking.status !== 'pending') return false;

      if (!booking.createdAt) return false;
      const createdAt = new Date(booking.createdAt).getTime();
      if (Number.isNaN(createdAt)) return false;
      return createdAt >= lockCutoff;
    };

    return new Set(
      bookings
        .filter(
          (booking) =>
            booking.date === date &&
            booking.time === time &&
            isActiveLock(booking) &&
            booking.caddieId > 0,
        )
        .map((booking) => booking.caddieId),
    );
  }, [bookings, date, time]);

  useEffect(() => {
    // Keep the user's selected caddie stable during checkout.
    // Conflicts are validated again before booking creation.
  }, [caddieId, unavailableCaddieIds]);

  const runWithRetry = async <T,>(task: () => Promise<T>, retries = 2): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  };

  const scrollToStepTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });

    const target = contentRef.current ?? formTopRef.current;
    if (target) {
      const targetTop = target.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  useEffect(() => {
    if (step <= 1) return;

    const timer = window.setTimeout(() => {
      scrollToStepTop();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusCandidates = [
      params.get('payment'),
      params.get('status'),
      params.get('payment_status'),
      params.get('transaction_status'),
      params.get('state'),
      params.get('result'),
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());

    const statusHint = statusCandidates[0] ?? '';
    const isSuccessReturn = statusCandidates.some((status) =>
      ['success', 'successful', 'paid', 'completed', 'confirmed'].some((hint) => status.includes(hint)),
    );
    const isCancelledReturn = statusCandidates.some((status) =>
      ['cancel', 'canceled', 'cancelled', 'failed', 'declined', 'reversed', 'voided'].some((hint) => status.includes(hint)),
    );
    const paymentStatus = isSuccessReturn ? 'success' : (isCancelledReturn ? 'cancelled' : null);
    const receiptNumber =
      params.get('receipt') ||
      params.get('receipt_number') ||
      params.get('receiptNumber') ||
      params.get('mpesa_receipt') ||
      params.get('mpesaReceipt') ||
      '';
    const transactionId =
      params.get('transaction_id') ||
      params.get('transactionId') ||
      params.get('payment_reference') ||
      params.get('paymentReference') ||
      '';
    const hasPaymentProof = Boolean(receiptNumber || transactionId);

    if (!paymentStatus) return;

    const raw = sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
    const clearPaymentQuery = () => {
      const target = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, document.title, target);
    };

    if (!raw) {
      clearPaymentQuery();
      return;
    }

    let pending: PendingPaymentSession | null = null;
    try {
      pending = JSON.parse(raw) as PendingPaymentSession;
    } catch {
      sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
      clearPaymentQuery();
      return;
    }

    const waitForWebhookConfirmation = async (reference: string): Promise<'confirmed' | 'cancelled' | 'pending'> => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const latest = await fetchBookingByReference(reference);

        if (latest?.status === 'confirmed') {
          return 'confirmed';
        }

        if (latest?.status === 'cancelled') {
          return 'cancelled';
        }

        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }

      return 'pending';
    };

    const finalizePayment = async () => {
      if (!pending) return;

      const cancelBookingFlow = async (message: string) => {
        const cancelledBookingId = pending!.bookingId;
        await updateBooking(cancelledBookingId, { status: 'cancelled' });

        const latest = await fetchBookingByReference(pending!.bookingReference);
        if (latest) {
          setBookings((prev) => {
            const exists = prev.some((booking) => booking.id === latest.id);
            if (!exists) return [latest, ...prev];
            return prev.map((booking) => (booking.id === latest.id ? latest : booking));
          });

          void notifyCustomerForBooking({
            booking: latest,
            clubs,
            caddies,
            templateType: 'payment_cancelled',
          });
        } else {
          setBookings((prev) => prev.map((booking) => (
            booking.id === cancelledBookingId ? { ...booking, status: 'cancelled' } : booking
          )));
        }

        setPaymentNotice('');
        alert(message);
      };

      if (paymentStatus === 'success') {
        setPaymentNotice('Payment received. Finalizing your booking confirmation...');
        let result: 'confirmed' | 'cancelled' | 'pending' = 'pending';

        try {
          const verification = await verifyQuickwavePayment({
            bookingReference: pending.bookingReference,
            bookingId: pending.bookingId,
            receiptNumber: receiptNumber || undefined,
            transactionId: transactionId || undefined,
            statusHint,
          });

          if (verification.status === 'confirmed') {
            result = 'confirmed';
          } else if (verification.status === 'cancelled') {
            result = 'cancelled';
          }
        } catch (verificationError) {
          console.warn('Quickwave return verification failed, falling back to webhook polling.', verificationError);
        }

        if (result === 'pending') {
          if (hasPaymentProof) {
            result = await waitForWebhookConfirmation(pending.bookingReference);
          } else {
            result = 'cancelled';
          }
        }

        if (result === 'confirmed') {
          const latest = await fetchBookingByReference(pending.bookingReference);

          if (latest) {
            setBookings((prev) => {
              const exists = prev.some((booking) => booking.id === latest.id);
              if (!exists) return [latest, ...prev];
              return prev.map((booking) => (booking.id === latest.id ? latest : booking));
            });
          }

          setBookingRef(pending.bookingReference);
          setConfirmationState('confirmed');
          setShowSuccess(true);
          setPaymentNotice('');
        } else if (result === 'cancelled') {
          await cancelBookingFlow('Payment was not completed. Your booking was cancelled.');
        } else {
          await cancelBookingFlow('Payment was not verified, so this booking has been cancelled. Please retry payment to confirm your booking.');
        }
      } else {
        await cancelBookingFlow('Payment was cancelled. You can retry checkout to complete your booking.');
      }

      sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
      clearPaymentQuery();
    };

    void finalizePayment();
  }, [caddies, clubs, setBookings]);

  const getSelectedClubRate = () => {
    const selectedClub = clubs.find((club) => club.id === clubId);
    return selectedClub?.ratePerPlayer ?? 3500;
  };

  const filteredClubs = clubs.filter((club) => {
    const query = clubSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      club.name.toLowerCase().includes(query) ||
      club.location.toLowerCase().includes(query)
    );
  });

  const calculateTotal = () => {
    let total = getSelectedClubRate() * players;
    selectedEquipment.forEach(item => {
      const eq = equipment.find(e => e.id === item.id);
      if (eq) total += eq.price * item.qty;
    });
    total += delivery.cost;
    if (addons.photo) total += 2500;
    return total;
  };

  const updateEquipment = (id: number, change: number) => {
    setSelectedEquipment(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        const newQty = existing.qty + change;
        if (newQty <= 0) return prev.filter(item => item.id !== id);
        return prev.map(item => item.id === id ? { ...item, qty: newQty } : item);
      }
      if (change > 0) return [...prev, { id, qty: 1 }];
      return prev;
    });
  };

  const handleSubmit = async () => {
    setIsPaying(true);

    if (!caddieId) {
      alert('Please select a caddie before continuing.');
      setIsPaying(false);
      return;
    }

    const bookingPayload: Omit<Booking, 'id' | 'createdAt'> = {
      firstName,
      lastName,
      email,
      phone,
      nationality,
      clubId: clubId!,
      date,
      time,
      players,
      caddieId: caddieId!,
      equipment: selectedEquipment,
      delivery,
      addons,
      total: calculateTotal(),
      status: 'pending',
    };

    let savedBooking: Booking | null = null;

    try {
      savedBooking = await runWithRetry(() => createBooking(bookingPayload));
      if (!savedBooking) {
        const reason = getLastCreateBookingError();
        if (reason) {
          alert(`Failed to save booking: ${reason}`);
        } else {
          alert('Failed to save booking (diagnostic v2). Please retry in a few seconds, then contact support if this persists.');
        }
        return;
      }

      const createdBooking = savedBooking;

      setBookings((prev) => [...prev, createdBooking]);

      // Do not block checkout start if communication delivery fails.
      void notifyCustomerForBooking({
        booking: createdBooking,
        clubs,
        caddies,
        templateType: 'booking_pending_payment',
      });

      const generatedReference = createdBooking.bookingReference ?? `APX-${createdBooking.id}`;
      const normalizedPhone = normalizeKenyanPhone(createdBooking.phone);

      const pendingSession: PendingPaymentSession = {
        bookingId: createdBooking.id,
        bookingReference: generatedReference,
      };

      sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(pendingSession));

      const baseReturnUrl = `${window.location.origin}${window.location.pathname}`;
      const successUrl = `${baseReturnUrl}?payment=success&bookingId=${createdBooking.id}`;
      const cancelUrl = `${baseReturnUrl}?payment=cancelled&bookingId=${createdBooking.id}`;

      const payment = await runWithRetry(() => initiateQuickwaveCheckout({
        bookingReference: generatedReference,
        amount: createdBooking.total,
        currency: 'KES',
        firstName: createdBooking.firstName,
        lastName: createdBooking.lastName,
        email: createdBooking.email,
        phone: normalizedPhone,
        successUrl,
        cancelUrl,
      }));

      window.location.href = payment.checkoutUrl;
    } catch (error) {
      console.error('Quickwave checkout initialization failed:', error);

      if (savedBooking?.id) {
        const failedBookingId = savedBooking.id;
        await updateBooking(failedBookingId, { status: 'cancelled' });
        setBookings((prev) => prev.map((booking) => (
          booking.id === failedBookingId ? { ...booking, status: 'cancelled' } : booking
        )));
      }

      sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
      alert('Unable to start Quickwave payment right now. Please check your internet, refresh once, and try again.');
    } finally {
      setIsPaying(false);
    }
  };

  const nextStep = () => {
    if (step < 5) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch(step) {
      case 1: return Boolean(clubId && date && time);
      case 2: return Boolean(caddieId && !unavailableCaddieIds.has(caddieId));
      case 3: return true; // Equipment optional
      case 4: return Boolean(firstName && lastName && email && phone && nationality);
      default: return true;
    }
  };

  if (showSuccess) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-4xl border border-[#e9dfca] bg-white shadow-2xl">
        <div className="flex flex-1 flex-col items-center p-8 pt-16 text-center">
          <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#0f281e] shadow-xl">
            <div className="absolute inset-0 bg-[#c5a059] rounded-full opacity-20 animate-ping"></div>
            <span className="text-3xl">⛳</span>
          </div>
          
          <h2 className="font-serif text-3xl text-gray-900 mb-2">{confirmationState === 'confirmed' ? "You're Booked!" : 'Payment Received'}</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-65">
            {confirmationState === 'confirmed'
              ? "Your Apex experience is confirmed. We'll send full details to your email and WhatsApp shortly."
              : 'We received your payment return and are verifying with Quickwave. Your booking reference is ready below.'}
          </p>
          
          <div className="bg-[#c5a059]/20 px-8 py-3 rounded-lg mb-6">
            <span className="font-serif text-xl font-bold text-[#0f281e] tracking-widest">{bookingRef}</span>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(bookingRef);
                setCopiedRef(true);
                window.setTimeout(() => setCopiedRef(false), 1800);
              } catch {
                setCopiedRef(false);
              }
            }}
            className="mb-5 rounded-xl border border-[#c5a059]/40 bg-white px-4 py-2 text-sm font-semibold text-[#0f281e] transition hover:bg-[#f8f6f1]"
          >
            {copiedRef ? 'Copied' : 'Copy Reference'}
          </button>

          <p className="text-xs text-gray-500 mb-8 max-w-70 leading-relaxed">
            {confirmationState === 'confirmed'
              ? 'Save this reference. Your caddie will greet you at the clubhouse entrance with your Cool Box and all hired equipment ready.'
              : 'Save this reference. If verification takes longer than expected, use Find Booking with this reference and our team will assist immediately.'}
          </p>

          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-[#c5a059] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-yellow-600 transition"
          >
            Make Another Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={formTopRef} className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden">
      {/* Hero */}
      <div className="relative mx-4 overflow-hidden rounded-4xl px-8 py-14 text-white shadow-2xl md:mx-0 md:px-12 md:py-20">
        <div
          className="absolute inset-0 pointer-events-none bg-center bg-cover"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1535131749006-b7f58c99034b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80')",
          }}
          aria-hidden="true"
        ></div>
        <div className="absolute inset-0 pointer-events-none bg-[#1c2b24]/75" aria-hidden="true"></div>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(201,169,98,0.24),transparent_35%)]" aria-hidden="true"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[#c9a962]">ApexGolf Africa</p>
          <h2 className="mb-4 font-serif text-4xl leading-tight md:text-6xl">Book Your <span className="italic text-[#e5d4a1]">Apex</span> Experience</h2>
          <p className="max-w-2xl text-base leading-relaxed text-gray-300 md:text-lg">
            Certified caddies · Equipment hire · Professional photography — all in one booking
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="px-6 py-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-xs font-medium uppercase tracking-wider text-gray-500">
          <div className="flex flex-col items-center gap-1 w-1/3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold transition-all ${step >= 1 ? 'bg-[linear-gradient(135deg,#1c2b24_0%,#2d4a3e_100%)] text-white shadow-[0_10px_30px_-10px_rgba(28,43,36,0.5)]' : 'bg-gray-200 text-gray-400'}`}>1</div>
            <span className={step >= 1 ? 'text-[#0f281e]' : ''}>Club & Date</span>
          </div>
          <div className="mb-4 h-px flex-1 bg-gray-200"></div>
          <div className="flex flex-col items-center gap-1 w-1/3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold transition-all ${step >= 2 ? 'bg-[linear-gradient(135deg,#1c2b24_0%,#2d4a3e_100%)] text-white shadow-[0_10px_30px_-10px_rgba(28,43,36,0.5)]' : 'bg-gray-200 text-gray-400'} ${step > 2 ? 'ring-4 ring-[#c9a962]/15' : ''}`}>2</div>
            <span className={step >= 2 ? 'text-[#0f281e]' : ''}>Choose Caddie</span>
          </div>
          <div className="mb-4 h-px flex-1 bg-gray-200"></div>
          <div className="flex flex-col items-center gap-1 w-1/3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold transition-all ${step >= 3 ? 'bg-[linear-gradient(135deg,#1c2b24_0%,#2d4a3e_100%)] text-white shadow-[0_10px_30px_-10px_rgba(28,43,36,0.5)]' : 'bg-gray-200 text-gray-400'}`}>3</div>
            <span className={step >= 3 ? 'text-[#0f281e]' : ''}>Equipment</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 pb-8 md:px-0">
        
        {/* Step 1: Club & Date */}
        {step === 1 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="rounded-[28px] border border-gray-100 bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center text-2xl">🏌️</div>
                <div>
                  <h3 className="font-serif text-2xl text-gray-800">Select Your Club & Date</h3>
                  <p className="text-sm text-gray-500">Choose where and when you'd like to play</p>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">Partner Clubs</h4>
                <div className="mb-4">
                  <input
                    type="text"
                    value={clubSearchQuery}
                    onChange={(e) => setClubSearchQuery(e.target.value)}
                    placeholder="Search clubs by name or location"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#c9a962] focus:ring-4 focus:ring-[#c9a962]/10"
                  />
                </div>
                <div className="space-y-4">
                  {filteredClubs.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => setClubId(c.id)}
                      className={`relative overflow-hidden rounded-2xl border-2 p-5 flex items-start gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${clubId === c.id ? 'border-[#c9a962] bg-[linear-gradient(135deg,#faf8f5_0%,#f5f3ef_100%)] shadow-[0_0_0_4px_rgba(201,169,98,0.1)]' : 'border-gray-100 bg-white'}`}
                    >
                      <div className="mt-1 text-2xl text-[#c5a059]">📍</div>
                      <div className="flex-1">
                        <h5 className="font-serif font-bold text-gray-800 text-lg">{c.name}</h5>
                        <p className="text-sm text-gray-500">{c.location}</p>
                        <p className="text-xs text-[#0f281e] font-semibold mt-1">Rate per player: Ksh {c.ratePerPlayer.toLocaleString()}</p>
                        <span className="inline-block mt-2 bg-[#0f281e] text-white text-xs px-3 py-1 rounded-full">Apex Partner</span>
                      </div>
                      {clubId === c.id && <div className="absolute right-4 top-4 text-[#c5a059]">✓</div>}
                    </div>
                  ))}
                  {filteredClubs.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
                      No clubs match that search. Try a different name or location.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-8 shadow-sm">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 text-center">Date, Time & Players</h4>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">DATE OF ROUND</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 p-4 text-base focus:outline-none focus:border-[#c9a962] focus:ring-4 focus:ring-[#c9a962]/10"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">NUMBER OF PLAYERS</label>
                <div className="flex w-32 items-center rounded-xl border-2 border-gray-200 bg-white">
                  <button onClick={() => setPlayers(Math.max(1, players - 1))} className="px-3 py-2 text-gray-500 transition hover:bg-[#1c2b24] hover:text-white">-</button>
                  <input type="text" value={players} readOnly className="w-full text-center text-gray-800 font-medium outline-none text-sm"/>
                  <button onClick={() => setPlayers(Math.min(4, players + 1))} className="px-3 py-2 text-gray-500 transition hover:bg-[#1c2b24] hover:text-white">+</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">PREFERRED TEE TIME</label>
                <div className="flex flex-wrap gap-3">
                  {teeTimes.map(t => (
                    <button 
                      key={t}
                      onClick={() => setTime(t)}
                      className={`rounded-lg border px-6 py-3 text-sm font-medium transition-all ${time === t ? 'border-[#1c2b24] bg-[linear-gradient(135deg,#1c2b24_0%,#2d4a3e_100%)] text-white shadow-md' : 'border-gray-200 text-gray-600 hover:scale-105 hover:bg-[#1c2b24] hover:text-white'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Choose Caddie */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#1C3A2A,#2D5A3D)' }}>
                  👕
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-gray-900">Choose Your Caddie</h3>
                  <p className="text-sm text-gray-500 mt-1">All caddies are Apex Academy certified professionals</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {caddies.map((c) => {
                const isUnavailable = unavailableCaddieIds.has(c.id);
                const isSelected = caddieId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (!isUnavailable) setCaddieId(c.id);
                    }}
                    className={`rounded-2xl p-5 border-2 transition-all duration-200 ${
                      isUnavailable
                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
                        : isSelected
                        ? 'cursor-pointer border-[#C9A962] bg-white shadow-md'
                        : 'cursor-pointer border-gray-100 bg-white hover:border-[#C9A962]/30 hover:shadow-sm'
                    }`}
                    style={isSelected ? { boxShadow: '0 0 0 3px rgba(201,169,98,0.15)' } : {}}
                  >
                    <div className="flex items-start gap-4 mb-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className={`w-14 h-14 rounded-2xl ${c.color} text-white flex items-center justify-center font-serif font-bold text-lg shrink-0`}>
                          {c.initials}
                        </div>
                        {!isUnavailable && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-serif font-bold text-gray-900 text-base">{c.name}</h4>
                          <span className="text-lg">★</span>
                          <span className="text-sm font-semibold text-gray-700">{c.rating}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{c.specialty} · {c.exp}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                            style={isUnavailable ? { background: '#EF4444' } : { background: '#16A34A' }}
                          >
                            {isUnavailable ? '● ON ROUND' : '● AVAILABLE'}
                          </span>
                          {c.topRated && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#F8F6F1', color: '#C9A962' }}>
                              ⭐ Top Rated
                            </span>
                          )}
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                            ✓ Certified
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-500 mb-1">Total Rounds</div>
                        <div className="text-lg font-bold text-gray-900">{c.rounds}</div>
                      </div>
                    </div>

                    {/* Selection button */}
                    {!isUnavailable && (
                      <div className="text-right pt-2 border-t border-gray-100">
                        <span className="text-xs font-semibold text-[#C9A962]">
                          {isSelected ? '✓ SELECTED' : 'Click to select'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Equipment */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-2xl">🏌️‍♂️</div>
                <div>
                  <h3 className="font-serif text-2xl text-gray-800">Equipment Hire</h3>
                  <p className="text-sm text-gray-500">Premium gear delivered to the club or your hotel</p>
                </div>
              </div>
            </div>

            <div className="bg-[#0f281e] rounded-xl p-6 text-white flex items-start gap-4 shadow-md">
              <div className="text-3xl">🚚</div>
              <div>
                <h4 className="font-serif text-[#c5a059] text-xl italic">No clubs? No problem.</h4>
                <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                  All equipment is sanitised, maintained, and delivered before your tee time.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Full Club Sets</h4>
              <div className="space-y-5">
                {equipment.map(e => {
                  const qty = selectedEquipment.find(item => item.id === e.id)?.qty || 0;
                  return (
                    <div key={e.id} className="flex items-center gap-5 border-b border-gray-100 last:border-0 pb-5 last:pb-0">
                      <div className="text-3xl">🏌️</div>
                      <div className="flex-1">
                        <h5 className="font-serif font-bold text-gray-800 text-base">{e.name}</h5>
                        <p className="text-sm text-gray-500 leading-tight mt-1">{e.desc}</p>
                        <span className="inline-block mt-2 bg-[#c5a059]/10 text-[#c5a059] text-xs px-2 py-1 rounded">{e.brand}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-serif font-bold text-gray-800 text-lg">Ksh {e.price.toLocaleString()}</div>
                        <div className="text-xs text-gray-400 mb-2">per round</div>
                        <div className="flex items-center border border-gray-200 rounded-lg h-10 w-28 bg-white">
                          <button onClick={() => updateEquipment(e.id, -1)} className="w-10 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50">-</button>
                          <input type="text" value={qty} readOnly className="w-full text-center text-sm font-bold outline-none"/>
                          <button onClick={() => updateEquipment(e.id, 1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50">+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Enhance Your Round</h4>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" checked className="w-5 h-5 text-[#c5a059] rounded" readOnly/>
                    <div>
                      <div className="font-medium text-base">Apex Cool Box</div>
                      <div className="text-sm text-gray-500">Included with every caddie</div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-400">Included</span>
                </label>
                <label className="flex items-center justify-between p-4 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <input 
                      type="checkbox" 
                      checked={addons.photo}
                      onChange={(e) => setAddons({...addons, photo: e.target.checked})}
                      className="w-5 h-5 text-[#c5a059] rounded"
                    />
                    <div>
                      <div className="font-medium text-base">Golf Photography</div>
                      <div className="text-sm text-gray-500">On-course photos & swing sequences</div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-800">Ksh 2,500</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">📦 Equipment Delivery</h4>
              <div className="space-y-3">
                <button 
                  onClick={() => setDelivery({type: 'club', cost: 0})}
                  className={`w-full text-left px-5 py-4 rounded-lg border text-base font-medium transition ${delivery.type === 'club' ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#0f281e]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  At the golf club (free)
                </button>
                <button 
                  onClick={() => setDelivery({type: 'hotel', cost: 500})}
                  className={`w-full text-left px-5 py-4 rounded-lg border text-base font-medium transition ${delivery.type === 'hotel' ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#0f281e]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Hotel delivery (+Ksh 500)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Your Details */}
        {step === 4 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl text-blue-600">👤</div>
                <div>
                  <h3 className="font-serif text-2xl text-gray-800">Your Details</h3>
                  <p className="text-sm text-gray-500">So we can confirm your booking</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase mb-2">First Name</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-base focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Last Name</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Smith"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-base focus:outline-none focus:border-[#c5a059]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@email.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-base focus:outline-none focus:border-[#c5a059]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Phone / WhatsApp</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 700 000 000"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-base focus:outline-none focus:border-[#c5a059]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Nationality</label>
                <select 
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-base focus:outline-none focus:border-[#c5a059] text-gray-600"
                >
                  <option value="">Select country...</option>
                  <option value="Kenyan">Kenyan</option>
                  <option value="British">British</option>
                  <option value="American">American</option>
                  <option value="South African">South African</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Shoe Size (If hiring shoes)</label>
                <input 
                  type="text" 
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  placeholder="e.g. UK 10, EU 44"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-base focus:outline-none focus:border-[#c5a059]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Special Requests (Optional)</label>
                <textarea 
                  value={requests}
                  onChange={(e) => setRequests(e.target.value)}
                  placeholder="e.g. Left-handed clubs, dietary notes"
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-base focus:outline-none focus:border-[#c5a059]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Payment */}
        {step === 5 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-2xl text-green-600">💳</div>
                <div>
                  <h3 className="font-serif text-2xl text-gray-800">Payment</h3>
                  <p className="text-sm text-gray-500">Secure payment — booking confirmed instantly</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Payment Method</h4>
              {paymentNotice && (
                <div className="mb-5 rounded-lg border border-[#c5a059]/30 bg-[#f8f6f1] px-4 py-3 text-sm font-medium text-[#0f281e]">
                  {paymentNotice}
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <button className="border-2 border-[#c5a059] bg-[#c5a059]/10 rounded-xl p-5 flex flex-col items-center gap-3">
                  <span className="text-3xl">📱</span>
                  <span className="text-sm font-bold text-gray-800">M-Pesa</span>
                </button>
                <button className="border-2 border-[#c5a059] bg-[#c5a059]/10 rounded-xl p-5 flex flex-col items-center gap-3">
                  <span className="text-3xl">💳</span>
                  <span className="text-sm font-bold text-gray-800">Card</span>
                </button>
                <button className="border border-gray-200 rounded-xl p-5 flex flex-col items-center gap-3">
                  <span className="text-3xl">🏦</span>
                  <span className="text-sm font-bold text-gray-700">Bank (if enabled in wallet)</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase mb-2">M-Pesa Number</label>
                <div className="relative">
                  <span className="absolute left-5 top-4 text-gray-500 font-medium">+254</span>
                  <input 
                    type="tel" 
                    value={phone.replace('+254', '').trim()}
                    onChange={(e) => setPhone('+254 ' + e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-16 pr-5 py-4 text-base focus:outline-none focus:border-[#c5a059]"
                    placeholder="700 000 000"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                  You will be redirected to Quickwave checkout where customers can pay using M-Pesa or Card.
                </p>
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-6 space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-gray-600">Caddie service</span>
                <span className="font-medium text-gray-800">Ksh {(getSelectedClubRate() * players).toLocaleString()}</span>
              </div>
              {selectedEquipment.map(item => {
                const eq = equipment.find(e => e.id === item.id);
                return (
                  <div key={item.id} className="flex justify-between text-base">
                    <span className="text-gray-600">{eq?.brand} Set</span>
                    <span className="font-medium text-gray-800">Ksh {(eq!.price * item.qty).toLocaleString()}</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-base">
                <span className="text-gray-600">Equipment delivery</span>
                <span className="font-medium text-gray-800">Ksh {delivery.cost}</span>
              </div>
              {addons.photo && (
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">Photography</span>
                  <span className="font-medium text-gray-800">Ksh 2,500</span>
                </div>
              )}
              <div className="border-t border-gray-300 my-3 pt-3 flex justify-between items-center">
                <span className="font-bold text-gray-800 text-lg">Total</span>
                <span className="font-bold text-2xl text-gray-900">Ksh {calculateTotal().toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {!showSuccess && (
        <div className="bg-white border-t border-gray-200 shadow-lg p-6 z-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-[#0f281e] font-bold text-xl">Booking Summary</h3>
              <span className="text-[#c5a059] text-sm font-bold">ApexGolf Africa</span>
            </div>
            
            <div className="space-y-2 mb-5 text-base">
            <div className="flex justify-between">
              <span className="text-gray-400">Club</span>
              <span className="text-gray-800 font-medium">{clubId ? clubs.find(c => c.id === clubId)?.name : 'Not selected'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Date</span>
              <span className="text-gray-800 font-medium">{date ? new Date(date).toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tee Time</span>
              <span className="text-gray-800 font-medium">{time || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Players</span>
              <span className="text-gray-800 font-medium">{players}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Caddie</span>
              <span className="text-gray-800 font-medium">{caddieId ? caddies.find(c => c.id === caddieId)?.name : 'Not selected'}</span>
            </div>
          </div>

          <div className="bg-[#c5a059]/20 rounded-lg p-4 flex justify-between items-center mb-5">
            <div>
              <div className="text-sm text-gray-600 font-medium">TOTAL</div>
              <div className="text-xs text-gray-500">incl. all fees</div>
            </div>
            <div className="font-serif text-3xl font-bold text-gray-900">Ksh {calculateTotal().toLocaleString()}</div>
          </div>

          <div className="flex gap-4">
            {step > 1 && (
              <button 
                onClick={prevStep}
                className="px-6 py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
              >
                ← Back
              </button>
            )}
            {step < 5 ? (
              <button 
                onClick={nextStep}
                disabled={!canProceed()}
                className={`flex-1 font-bold py-4 rounded-xl shadow-md transition flex justify-center items-center gap-2 text-lg ${canProceed() ? 'bg-[#c5a059] text-white hover:bg-yellow-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                <span>
                  {step === 1 && 'Continue — Choose Your Caddie'}
                  {step === 2 && 'Continue — Equipment Hire'}
                  {step === 3 && 'Continue — Your Details'}
                  {step === 4 && 'Continue — Payment'}
                </span>
                <span>→</span>
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isPaying}
                className={`flex-1 bg-[#0f281e] text-white font-bold py-4 rounded-xl shadow-md transition flex justify-center items-center gap-2 text-lg ${isPaying ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-900'}`}
              >
                <span>🔒</span>
                <span>{isPaying ? 'Starting Quickwave Checkout...' : 'Confirm & Pay'}</span>
              </button>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;