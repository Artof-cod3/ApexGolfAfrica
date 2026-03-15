import React, { useMemo, useState } from 'react';
import {
  createGmailComposeUrl,
  createWhatsAppSupportUrl,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_NUMBER,
} from '../constants/support';

type Message = {
  from: 'bot' | 'user';
  text: string;
};

const QUICK_QUESTIONS = [
  'How do I find my booking?',
  'Can I change date/time?',
  'How do I contact support?',
  'What happens after booking?',
];

const getBotReply = (question: string) => {
  const q = question.toLowerCase();

  if (q.includes('find') || q.includes('reference') || q.includes('booking')) {
    return 'Use your APX reference or booking email on the Client page search. If not found, I can connect you to support.';
  }
  if (q.includes('change') || q.includes('reschedule') || q.includes('cancel')) {
    return 'Date/time changes and cancellations are handled by support. Tap WhatsApp below and share your APX reference.';
  }
  if (q.includes('pay') || q.includes('payment') || q.includes('total')) {
    return 'Your total is shown before confirmation and on your booking details card. For payment disputes, contact support.';
  }
  if (q.includes('what happens') || q.includes('after booking') || q.includes('next')) {
    return 'After booking, save your reference. On your golf day, your caddie meets you at the clubhouse with your selected setup.';
  }
  if (q.includes('support') || q.includes('help') || q.includes('contact')) {
    return `You can reach support on WhatsApp (${SUPPORT_WHATSAPP_NUMBER}) or email (${SUPPORT_EMAIL}).`;
  }

  return 'I can help with booking lookup and basic guidance. For account-specific issues, use WhatsApp support below.';
};

const ClientHelpWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      from: 'bot',
      text: 'Hi! I am Apex helper. Ask a quick question, or use WhatsApp/email support.',
    },
  ]);

  const helpText = useMemo(() => messages[messages.length - 1]?.text ?? '', [messages]);
  const supportEmailSubject = 'ApexGolf Client Support';
  const supportEmailBody = `Hi ApexGolf, I need help.\n\nIssue: ${helpText}`;

  const sendMessage = (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    const reply = getBotReply(text);
    setMessages((prev) => [...prev, { from: 'user', text }, { from: 'bot', text: reply }]);
    setInput('');
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {isOpen && (
        <div className="mb-3 w-85 max-w-[92vw] overflow-hidden rounded-3xl border border-white/50 bg-white/95 shadow-2xl backdrop-blur">
          <div className="bg-[#0f281e] px-4 py-3 text-white">
            <p className="font-semibold">Apex Help Chat</p>
            <p className="text-xs text-gray-300">Quick answers for common questions</p>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto bg-gray-50 px-3 py-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`text-sm ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                <span
                  className={`inline-block rounded-2xl px-3 py-2 ${m.from === 'user' ? 'bg-[#c5a059] text-white' : 'border bg-white text-gray-700'}`}
                >
                  {m.text}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t bg-white px-3 pb-1 pt-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="rounded-full border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-t bg-white p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage(input);
              }}
              placeholder="Ask a question..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button onClick={() => sendMessage(input)} className="rounded-lg bg-[#0f281e] px-3 py-2 text-sm text-white">
              Send
            </button>
          </div>

          <div className="flex gap-2 bg-white px-3 pb-3">
            <a
              href={createWhatsAppSupportUrl(`Hi ApexGolf, I need help.\nIssue: ${helpText}`)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl bg-green-600 px-3 py-2 text-center text-xs text-white"
            >
              WhatsApp Support
            </a>
            <a
              href={createGmailComposeUrl(supportEmailSubject, supportEmailBody)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-center text-xs text-gray-700"
            >
              Email Support
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-4 font-semibold text-white shadow-2xl transition-colors hover:bg-gray-800"
        style={{ animation: 'float 3s ease-in-out infinite' }}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {isOpen ? 'Close Help' : 'Need Help?'}
      </button>

      <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }`}</style>
    </div>
  );
};

export default ClientHelpWidget;
