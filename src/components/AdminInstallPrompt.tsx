import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const adminPaths = new Set(['/admin', '/super-admin']);
const PWA_LAUNCH_PATH_KEY = 'apexgolf_pwa_launch_path';

const AdminInstallPrompt: React.FC = () => {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  const showOnThisRoute = useMemo(() => adminPaths.has(location.pathname), [location.pathname]);
  const installLabel = location.pathname === '/super-admin' ? 'Install ApexGolf Super Admin App' : 'Install ApexGolf Admin App';

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOnThisRoute) return null;

  return (
    <>
      {isOffline ? (
        <div className="fixed left-4 right-4 top-4 z-[100] rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg md:left-auto md:right-6 md:top-6 md:w-[360px]">
          You are offline. Changes may be limited until your internet reconnects.
        </div>
      ) : null}

      {deferredPrompt && !dismissed ? (
        <div className="fixed bottom-5 left-1/2 z-[100] w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-[#C9A962]/40 bg-[#0F1F17] px-4 py-3 text-[#E5D5A8] shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{installLabel}</p>
              <p className="text-xs text-[#E5D5A8]/85">Add this to your phone home screen for faster access.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-lg border border-[#E5D5A8]/35 px-3 py-1.5 text-xs font-semibold text-[#E5D5A8] transition hover:bg-white/10"
              >
                Later
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deferredPrompt) return;
                  const preferredPath = location.pathname === '/super-admin' ? '/super-admin' : '/admin';
                  localStorage.setItem(PWA_LAUNCH_PATH_KEY, preferredPath);
                  await deferredPrompt.prompt();
                  const result = await deferredPrompt.userChoice;
                  if (result.outcome === 'accepted') {
                    setDeferredPrompt(null);
                  }
                }}
                className="rounded-lg bg-[#C9A962] px-3 py-1.5 text-xs font-semibold text-[#0F1F17] transition hover:brightness-110"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default AdminInstallPrompt;
