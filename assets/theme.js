(() => {
  const STORAGE_KEY = 'eo_monitor_theme';
  const EVENT_NAME = 'eo:themechange';
  const LOCALE_EVENT_NAME = 'eo:localechange';

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }

  function getSystemTheme() {
    try {
      return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  function resolveInitialTheme() {
    const stored = getStoredTheme();
    return stored === 'dark' || stored === 'light' ? stored : getSystemTheme();
  }

  function applyTheme(theme, { emit } = { emit: true }) {
    const next = theme === 'dark' ? 'dark' : 'light';
    const isDark = next === 'dark';

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    if (emit) {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { theme: next } }));
    }
  }

  function updateThemeToggleTitle() {
    const button = document.getElementById('themeToggle');
    if (!button) return;
    const label = button.getAttribute('aria-label');
    if (label) button.title = label;
  }

  function toggleTheme() {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setStoredTheme(next);
    applyTheme(next, { emit: true });
    updateThemeToggleTitle();
  }

  applyTheme(resolveInitialTheme(), { emit: false });

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const button = document.getElementById('themeToggle');
      if (button) button.addEventListener('click', toggleTheme);
      updateThemeToggleTitle();
    });

    window.addEventListener(LOCALE_EVENT_NAME, () => updateThemeToggleTitle());
  }

  try {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;

    const handler = () => {
      const stored = getStoredTheme();
      if (stored === 'dark' || stored === 'light') return;
      applyTheme(getSystemTheme(), { emit: true });
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler);
    } else if (typeof media.addListener === 'function') {
      media.addListener(handler);
    }
  } catch {
    // ignore
  }
})();

