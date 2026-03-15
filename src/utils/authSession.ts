export type AdminRole = 'admin' | 'super-admin';

export type AuthSession = {
  email: string;
  role: AdminRole;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
};

export const AUTH_SESSION_KEY = 'apex_admin_session_v2';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function createAuthSession(
  email: string,
  role: AdminRole,
  ttlMs: number,
): AuthSession {
  const now = Date.now();
  return {
    email,
    role,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + ttlMs,
  };
}

export function writeAuthSession(session: AuthSession): void {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

export function readAuthSession(): AuthSession | null {
  const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;

    if (
      typeof parsed.email !== 'string' ||
      (parsed.role !== 'admin' && parsed.role !== 'super-admin') ||
      !isFiniteNumber(parsed.createdAt) ||
      !isFiniteNumber(parsed.lastActivityAt) ||
      !isFiniteNumber(parsed.expiresAt)
    ) {
      clearAuthSession();
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      clearAuthSession();
      return null;
    }

    return parsed as AuthSession;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function touchAuthSession(ttlMs: number): AuthSession | null {
  const session = readAuthSession();
  if (!session) return null;

  const now = Date.now();
  const next: AuthSession = {
    ...session,
    lastActivityAt: now,
    expiresAt: now + ttlMs,
  };

  writeAuthSession(next);
  return next;
}

// Session Lock Config
const SESSION_LOCK_CONFIG_KEY = 'apex_session_lock_config_v1';

export type SessionLockConfig = {
  lockOnTabSwitch: boolean;
};

const defaultLockConfig: SessionLockConfig = {
  lockOnTabSwitch: true, // default: enabled
};

export function readSessionLockConfig(): SessionLockConfig {
  try {
    const raw = localStorage.getItem(SESSION_LOCK_CONFIG_KEY);
    if (!raw) return defaultLockConfig;
    const parsed = JSON.parse(raw) as Partial<SessionLockConfig>;
    return {
      lockOnTabSwitch: typeof parsed.lockOnTabSwitch === 'boolean' ? parsed.lockOnTabSwitch : defaultLockConfig.lockOnTabSwitch,
    };
  } catch {
    return defaultLockConfig;
  }
}

export function writeSessionLockConfig(config: SessionLockConfig): void {
  localStorage.setItem(SESSION_LOCK_CONFIG_KEY, JSON.stringify(config));
}
