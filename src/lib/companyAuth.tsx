'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export interface CompanyUser {
  id: string;
  name: string;
  email: string;
  onboardingStatus: string;
  platformPlan?: string | null;
  billingPeriod?: string | null;
  stripePaymentStatus?: string | null;
  stripeCustomerId?: string | null;
  platformSubscribedAt?: number | null;
}

interface CompanyAuthContextType {
  company: CompanyUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshCompany: (data: Partial<CompanyUser>) => void;
}

const CompanyAuthContext = createContext<CompanyAuthContextType>({
  company: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  refreshCompany: () => {},
});

// ── Session sharing across business./photos. subdomains ──
// localStorage is per-origin, so a login on business.unlocked.gr is invisible to
// photos.unlocked.gr. On the real domain the session is mirrored into a cookie
// scoped to .unlocked.gr so one login covers both portals.
const SESSION_KEY = 'unlocked_company';

function sharedCookieDomain(): string | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hostname;
  return h === 'unlocked.gr' || h.endsWith('.unlocked.gr') ? '.unlocked.gr' : null;
}

function readSharedSession(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|; )unlocked_company=([^;]*)/);
  if (!m || !m[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

function writeSharedSession(value: string | null) {
  const domain = sharedCookieDomain();
  if (!domain) return;
  const base = `${SESSION_KEY}=${value ? encodeURIComponent(value) : ''}; domain=${domain}; path=/; SameSite=Lax; Secure`;
  document.cookie = value ? `${base}; max-age=${60 * 60 * 24 * 30}` : `${base}; max-age=0`;
}

export function CompanyAuthProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<CompanyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = useMutation(api.companies.loginCompany);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY) || readSharedSession();
    if (stored) {
      try {
        setCompany(JSON.parse(stored));
        localStorage.setItem(SESSION_KEY, stored);
      } catch {
        localStorage.removeItem(SESSION_KEY);
        writeSharedSession(null);
      }
    }
    setIsLoading(false);
  }, []);

  const persistCompany = useCallback((c: CompanyUser) => {
    setCompany(c);
    const json = JSON.stringify(c);
    localStorage.setItem(SESSION_KEY, json);
    writeSharedSession(json);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation({ email, password });
      const companyUser: CompanyUser = {
        id: result._id as string,
        name: result.name,
        email: email.toLowerCase(),
        onboardingStatus: result.onboardingStatus || 'approved',
        platformPlan: (result as any).platformPlan || null,
        billingPeriod: (result as any).billingPeriod || null,
        stripePaymentStatus: (result as any).stripePaymentStatus || null,
        stripeCustomerId: (result as any).stripeCustomerId || null,
        platformSubscribedAt: (result as any).platformSubscribedAt || null,
      };
      persistCompany(companyUser);
    },
    [loginMutation, persistCompany]
  );

  const logout = useCallback(() => {
    setCompany(null);
    localStorage.removeItem(SESSION_KEY);
    writeSharedSession(null);
  }, []);

  const refreshCompany = useCallback(
    (data: Partial<CompanyUser>) => {
      if (company) {
        const updated = { ...company, ...data };
        persistCompany(updated);
      }
    },
    [company, persistCompany]
  );

  return (
    <CompanyAuthContext.Provider
      value={{
        company,
        isLoading,
        isAuthenticated: !!company,
        login,
        logout,
        refreshCompany,
      }}
    >
      {children}
    </CompanyAuthContext.Provider>
  );
}

export function useCompanyAuth() {
  return useContext(CompanyAuthContext);
}

// Returns a function that maps company paths for the current domain.
// On business.unlocked.gr: "/company/rooms" → "/rooms"
// On main domain: "/company/rooms" → "/company/rooms" (unchanged)
export function useCompanyPath() {
  const [isBusinessSubdomain, setIsBusinessSubdomain] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      setIsBusinessSubdomain(h === 'business.unlocked.gr' || h === 'business.localhost');
    }
  }, []);

  const p = useCallback(
    (path: string) => {
      if (isBusinessSubdomain && path.startsWith('/company')) {
        return path.replace(/^\/company/, '') || '/';
      }
      return path;
    },
    [isBusinessSubdomain]
  );

  return p;
}

/** URL of the Photos portal for the current environment. */
export function photosPortalUrl(): string {
  if (typeof window === 'undefined') return 'https://photos.unlocked.gr';
  const { hostname, port, protocol } = window.location;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return `${protocol}//photos.localhost${port ? ':' + port : ''}`;
  }
  return 'https://photos.unlocked.gr';
}

/** Locale for Intl date formatting in the chosen UI language. */
export function uiLocale(language: string): string {
  return language === 'el' ? 'el-GR' : language === 'nl' ? 'nl-NL' : 'en-GB';
}

/** Today's date as YYYY-MM-DD in the browser's local time zone (not UTC). */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
