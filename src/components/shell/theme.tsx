import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'filemite-theme';

/**
 * Runs before first paint (inlined in <head>) so the page never flashes the
 * wrong theme. Keep in sync with `applyTheme`.
 */
export const themeBootScript = `try{var p=localStorage.getItem('${STORAGE_KEY}');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}>({ preference: 'system', setPreference: () => {} });

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system'; // storage blocked
  }
}

/** False during SSR and hydration, true after — for UI that depends on the stored theme. */
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);

  // Follow the OS while on "system".
  useEffect(() => {
    applyTheme(preference);
    if (preference !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked — the choice still applies for this visit
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>
  );
}

/** Tracks the OS colour scheme, so an unset preference still shows the right button. */
function useSystemDark() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );
}

export function ThemeSwitch({ className }: { className?: string }) {
  const { preference, setPreference } = useContext(ThemeContext);
  const mounted = useHydrated();
  const systemDark = useSystemDark();
  // Until the visitor picks one, the OS setting decides which theme is showing.
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  const next = resolved === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} theme`;
  const Icon = mounted && resolved === 'dark' ? Moon : Sun;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setPreference(next)}
      className={cn(
        'flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
