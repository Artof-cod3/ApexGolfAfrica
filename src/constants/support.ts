export const SUPPORT_WHATSAPP_NUMBER = '0745751869';
export const SUPPORT_WHATSAPP_E164 = '254745751869';
export const SUPPORT_EMAIL = 'apexgolfafrica@gmail.com';

export const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP_E164}`;
export const SUPPORT_GMAIL_COMPOSE_URL = 'https://mail.google.com/mail/?view=cm&fs=1';

export const createWhatsAppSupportUrl = (message?: string) => {
  if (!message?.trim()) return SUPPORT_WHATSAPP_URL;
  return `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(message.trim())}`;
};

export const createSupportMailtoUrl = (subject?: string, body?: string) => {
  const parts: string[] = [];
  if (subject?.trim()) parts.push(`subject=${encodeURIComponent(subject.trim())}`);
  if (body?.trim()) parts.push(`body=${encodeURIComponent(body.trim())}`);
  return `mailto:${SUPPORT_EMAIL}${parts.length ? `?${parts.join('&')}` : ''}`;
};

export const createGmailComposeUrl = (subject?: string, body?: string) => {
  const parts = [`to=${encodeURIComponent(SUPPORT_EMAIL)}`];
  if (subject?.trim()) parts.push(`su=${encodeURIComponent(subject.trim())}`);
  if (body?.trim()) parts.push(`body=${encodeURIComponent(body.trim())}`);
  return `${SUPPORT_GMAIL_COMPOSE_URL}&${parts.join('&')}`;
};

export const openSupportEmail = (subject?: string, body?: string) => {
  if (typeof window === 'undefined') return;
  window.location.assign(createSupportMailtoUrl(subject, body));
};
