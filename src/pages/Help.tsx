import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ClientHelpWidget from '../components/ClientHelpWidget';
import {
  createGmailComposeUrl,
  createWhatsAppSupportUrl,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_NUMBER,
} from '../constants/support';

type FaqItem = {
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    question: 'How do I find my booking reference?',
    answer:
      'Use your APX booking reference on the Client page. If you do not have it, search using the email address used during booking.',
  },
  {
    question: 'Can I change my date/time?',
    answer:
      'Yes, but schedule changes need support help. Contact us on WhatsApp or email and include your APX reference so we can assist faster.',
  },
  {
    question: 'How do I contact support quickly?',
    answer:
      `The fastest option is WhatsApp on ${SUPPORT_WHATSAPP_NUMBER}. You can also email us at ${SUPPORT_EMAIL}.`,
  },
  {
    question: 'What should I expect after booking?',
    answer:
      'After booking, save your reference and confirmation details. On the golf day, your caddie meets you at the clubhouse with your selected setup ready.',
  },
];

const Help: React.FC = () => {
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const supportEmailSubject = 'ApexGolf Client Support';
  const supportEmailBody = 'Hi ApexGolf, I need help with my booking.';

  const visibleFaqs = useMemo(
    () => (showAllFaqs ? faqItems : faqItems.slice(0, 4)),
    [showAllFaqs],
  );

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8" style={{ backgroundColor: '#F0F2F5' }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(201,169,98,0.22) 0%, rgba(201,169,98,0) 70%)' }} />
        <div className="absolute top-20 right-0 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(28,58,42,0.16) 0%, rgba(28,58,42,0) 70%)' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center md:gap-8">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9A962]/40 bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-[#1C3A2A] shadow-sm backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#2D5A3D]" />
              LIVE SUPPORT AVAILABLE
            </span>
            <h1 className="mb-2 font-serif text-4xl font-bold text-gray-900 md:text-5xl">Customer Help Center</h1>
            <p className="text-base text-gray-600">We&apos;re here to help you with your booking experience</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="group flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 font-medium text-gray-700 transition-all duration-300 hover:border-[#C9A962]/50 hover:bg-gray-50 hover:shadow-md"
            >
              <svg className="h-5 w-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Booking
            </Link>
            <Link
              to="/about"
              className="rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 font-medium text-gray-700 transition-all duration-300 hover:border-[#C9A962]/50 hover:bg-gray-50 hover:shadow-md"
            >
              About ApexGolf
            </Link>
          </div>
        </header>

        <div className="mb-8 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_18px_50px_-30px_rgba(15,31,23,0.35)]">
          <div className="px-8 pt-8 pb-6 border-b border-gray-100" style={{ background: 'linear-gradient(to right,#f8f6f1,#fff)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1C3A2A,#2D5A3D)' }}>
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1">How can we help?</h2>
                <p className="text-sm text-gray-600">
                  Use the chat box for quick guidance. If your issue needs staff action, contact support directly.
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-3 md:space-y-0 md:flex md:gap-4">
            <a
              href={createWhatsAppSupportUrl('Hi ApexGolf, I need help with my booking.')}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 rounded-2xl px-6 py-4 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', boxShadow: '0 4px 15px -3px rgba(37,211,102,0.45)' }}
            >
              <svg className="h-7 w-7 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-90">WhatsApp</div>
                <div className="text-lg font-bold">{SUPPORT_WHATSAPP_NUMBER}</div>
              </div>
            </a>

            <a
              href={createGmailComposeUrl(supportEmailSubject, supportEmailBody)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-6 py-4 text-gray-700 font-semibold transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <svg className="h-6 w-6 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-500">Email us at</div>
                <div className="text-base font-bold text-gray-900">{SUPPORT_EMAIL}</div>
              </div>
            </a>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-xs font-semibold tracking-wide text-gray-500">AVERAGE RESPONSE</div>
            <div className="mt-1 font-serif text-2xl font-bold text-[#0F1F17]">~5 mins</div>
            <div className="mt-1 text-sm text-gray-600">WhatsApp during support hours</div>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-xs font-semibold tracking-wide text-gray-500">COVERAGE</div>
            <div className="mt-1 font-serif text-2xl font-bold text-[#0F1F17]">7 Days</div>
            <div className="mt-1 text-sm text-gray-600">Booking and caddie support window</div>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-xs font-semibold tracking-wide text-gray-500">EMAIL HELP</div>
            <div className="mt-1 font-serif text-2xl font-bold text-[#0F1F17]">24 hrs</div>
            <div className="mt-1 text-sm text-gray-600">Typical response turnaround</div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_14px_35px_-24px_rgba(15,31,23,0.45)] border border-gray-100">
            <div className="px-8 pt-8 pb-6 border-b border-gray-100" style={{ background: 'linear-gradient(to right,#f8f6f1,#fff)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1C3A2A,#2D5A3D)' }}>
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-serif text-xl font-bold text-gray-900">Common Questions</h3>
              </div>
            </div>

            <div className="p-8 space-y-3">
              {visibleFaqs.map((item) => {
                const actualIndex = faqItems.findIndex((faq) => faq.question === item.question);
                const isOpen = openFaqIndex === actualIndex;
                return (
                  <button
                    key={item.question}
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : actualIndex)}
                    className="group w-full rounded-2xl border border-gray-100 bg-white px-5 py-4 text-left transition-all duration-200 hover:border-[#C9A962]/30 hover:bg-gray-50 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium text-gray-700 group-hover:text-[#0F1F17]">{item.question}</span>
                      <span className={`text-[#C9A962] transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                    </div>
                    {isOpen && (
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.answer}</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-8 pb-8">
              <button
                type="button"
                onClick={() => setShowAllFaqs((prev) => !prev)}
                className="group w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#C9A962 0%,#B8984D 100%)', boxShadow: '0 4px 15px -3px rgba(201,169,98,0.45)' }}
              >
                {showAllFaqs ? 'Show fewer FAQs' : 'View all FAQs'}
                <svg className={`h-4 w-4 transition-transform ${showAllFaqs ? 'rotate-90' : 'group-hover:translate-x-1'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_14px_35px_-24px_rgba(15,31,23,0.45)] border border-gray-100">
            <div className="px-8 pt-8 pb-6 border-b border-gray-100" style={{ background: 'linear-gradient(to right,#f8f6f1,#fff)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#8B5CF6)' }}>
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-serif text-xl font-bold text-gray-900">Future AI Assistant</h3>
              </div>
            </div>

            <div className="p-8">
              <p className="mb-6 leading-relaxed text-gray-600">
                The mini chat is ready for simple Q&amp;A. Later, it can be upgraded to a real AI assistant that handles FAQs automatically and routes complex requests to admins.
              </p>

              <div className="rounded-2xl border border-purple-100 p-4" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(139,92,246,0.05) 100%)' }}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: '#7C3AED' }} />
                  <span className="text-sm font-semibold" style={{ color: '#7C3AED' }}>Coming Soon</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium border border-purple-100" style={{ color: '#7C3AED' }}>24/7 Support</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium border border-purple-100" style={{ color: '#7C3AED' }}>Instant Replies</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium border border-purple-100" style={{ color: '#7C3AED' }}>Smart Routing</span>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-[#C9A962]/30 px-4 py-3 text-sm text-[#1C3A2A]" style={{ background: 'linear-gradient(135deg, rgba(201,169,98,0.10) 0%, rgba(201,169,98,0.04) 100%)' }}>
                Tip: Include your booking reference in every message for faster support routing.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClientHelpWidget />
    </div>
  );
};

export default Help;
