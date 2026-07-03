import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Moon, Sun } from 'lucide-react';

type Mode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'micropng-mode';

const ModeContext = createContext<{
  mode: Mode;
  setMode: (mode: Mode) => void;
}>({ mode: 'system', setMode: () => {} });

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('system');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') setModeState(stored);
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    if (next === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}

export function ThemeToggle() {
  const { mode, setMode } = useMode();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const resolved =
    mode === 'system'
      ? mounted &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode;

  return (
    <button
      onClick={() => setMode(resolved === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
      title="Toggle theme"
    >
      {mounted && resolved === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
