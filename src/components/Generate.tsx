import { useEffect, useState } from 'preact/hooks';
import type { Eprom } from '../data/eproms';
import { crc32, fitToSize, formatHex, remap, type ByteOrder, type Direction, type Mapping } from '../lib/remap';
import { boardSignal } from './ChipDiagram';
import type { LoadedFile } from './Upload';
import { card, heading, stepBadge } from './pinStyles';

interface Props {
  file: LoadedFile | null;
  chip: Eprom;
  mapping: Mapping;
  direction: Direction;
  byteOrder: ByteOrder;
  fits: boolean;
}

function swaps(mapping: Mapping) {
  const list: string[] = [];
  mapping.addr.forEach((b, i) => b !== i && list.push(`A${i} → ${boardSignal('address', b)}`));
  mapping.data.forEach((b, i) => b !== i && list.push(`Q${i} → ${boardSignal('data', b)}`));
  return list;
}

function outputName(name: string, direction: Direction) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '.bin';
  return `${base}.${direction === 'scramble' ? 'swapped' : 'unswapped'}${ext}`;
}

export default function Generate({ file, chip, mapping, direction, byteOrder, fits }: Props) {
  const [result, setResult] = useState<{ name: string; crc: number; size: number } | null>(null);
  const [error, setError] = useState('');
  const list = swaps(mapping);

  // Any change to the inputs makes the last result stale.
  useEffect(() => setResult(null), [file, chip, mapping, direction, byteOrder]);

  function generate() {
    if (!file) return;
    setError('');
    try {
      const { bytes } = fitToSize(file.bytes, chip.sizeBytes);
      const out = remap(bytes, { addressBits: chip.addressBits, dataBits: chip.dataBits, mapping, direction, byteOrder });
      const name = outputName(file.name, direction);
      const url = URL.createObjectURL(new Blob([out], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setResult({ name, crc: crc32(out), size: out.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate file.');
    }
  }

  return (
    <section class={card}>
      <h2 class={heading}>
        <span class={stepBadge}>4</span> Generate
      </h2>

      <div class="mb-4 text-sm">
        <p class="mb-2 font-medium">
          {list.length ? `${list.length} rewired pins on the ${chip.name}:` : 'No pins rewired. The output will match the input (padded to chip size if needed).'}
        </p>
        {list.length > 0 && (
          <ul class="flex flex-wrap gap-1.5">
            {list.map((s) => (
              <li key={s} class="rounded bg-pink-100 px-2 py-0.5 font-mono text-xs text-pink-800 dark:bg-pink-950/50 dark:text-pink-300">
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={!file || !fits}
        class="w-full rounded-lg bg-sky-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-sky-700 focus:ring-4 focus:ring-sky-500/30 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-auto dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
      >
        {direction === 'scramble' ? 'Generate pinswapped file' : 'Generate descrambled file'}
      </button>
      {!file && <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Load a ROM image first.</p>}
      {file && !fits && <p class="mt-2 text-xs text-red-600 dark:text-red-400">The file is larger than the selected EPROM.</p>}
      {error && <p class="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <p class="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
          Downloaded <span class="font-medium">{result.name}</span> ({result.size.toLocaleString()} bytes, CRC32{' '}
          <span class="font-mono">{formatHex(result.crc)}</span>)
        </p>
      )}
    </section>
  );
}
