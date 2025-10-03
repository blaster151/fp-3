import { useCallback, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
};

const persistTheme = (theme: Theme) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

const syncDocumentTheme = (theme: Theme) => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

const themeLabel = (theme: Theme) => (theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');

export const App = () => {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    syncDocumentTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const buttonLabel = useMemo(() => themeLabel(theme), [theme]);

  return (
    <div className="app" tabIndex={0}>
      <header>
        <h1>FP-3 Playground</h1>
      </header>
      <main>
        <button type="button" aria-label="Toggle theme" onClick={toggleTheme}>
          {buttonLabel}
        </button>
      </main>
    </div>
  );
};

export default App;
