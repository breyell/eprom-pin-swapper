import type { PinType } from '../data/eproms';

// Full class strings are written out so Tailwind can find them when scanning.
export const pinStyles: Record<PinType, { label: string; fill: string; text: string; swatch: string }> = {
  address: { label: 'Address', fill: 'fill-sky-500', text: 'fill-sky-700 dark:fill-sky-300', swatch: 'bg-sky-500' },
  data: { label: 'Data', fill: 'fill-emerald-500', text: 'fill-emerald-700 dark:fill-emerald-300', swatch: 'bg-emerald-500' },
  power: { label: 'Power (VCC)', fill: 'fill-red-500', text: 'fill-red-700 dark:fill-red-300', swatch: 'bg-red-500' },
  ground: { label: 'Ground', fill: 'fill-slate-500', text: 'fill-slate-700 dark:fill-slate-300', swatch: 'bg-slate-500' },
  control: { label: 'Control', fill: 'fill-amber-500', text: 'fill-amber-700 dark:fill-amber-300', swatch: 'bg-amber-500' },
  vpp: { label: 'Program (VPP)', fill: 'fill-violet-500', text: 'fill-violet-700 dark:fill-violet-300', swatch: 'bg-violet-500' },
  nc: { label: 'Not connected', fill: 'fill-zinc-400', text: 'fill-zinc-500 dark:fill-zinc-400', swatch: 'bg-zinc-400' },
};

export const card = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900';
export const heading = 'mb-4 flex items-center gap-2 text-lg font-semibold';
export const stepBadge = 'flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white';
export const select =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-800';
export const button =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700';

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${+(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${+(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}
