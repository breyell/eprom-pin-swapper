import { useEffect, useState } from 'preact/hooks';

type Theme = 'light' | 'dark' | 'system';

const options: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'system', label: 'System', icon: '◐' },
  { value: 'dark', label: 'Dark', icon: '☾' },
];

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') return t;
  } catch {}
  return 'system';
}

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export default function ThemeToggle() {
  // null until the stored preference is read, so the first render doesn't overwrite it.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => setTheme(readTheme()), []);

  useEffect(() => {
    if (!theme) return;
    apply(theme);
    try {
      if (theme === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', theme);
    } catch {}
    if (theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return (
    <div role="radiogroup" aria-label="Color theme" class="flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          title={o.label}
          onClick={() => setTheme(o.value)}
          class={`rounded-md px-2.5 py-1 text-sm transition ${
            theme === o.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <span aria-hidden="true">{o.icon}</span>
          <span class="sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
