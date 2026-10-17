import { useRef, useState } from 'preact/hooks';
import { crc32, formatHex } from '../lib/remap';
import { card, formatSize, heading, stepBadge } from './pinStyles';

export interface LoadedFile {
  name: string;
  bytes: Uint8Array;
  crc: number;
}

interface Props {
  file: LoadedFile | null;
  onLoad: (file: LoadedFile) => void;
  onClear: () => void;
  notice?: preact.ComponentChildren;
}

export default function Upload({ file, onLoad, onClear, notice }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  async function read(f: File | undefined) {
    if (!f) return;
    setError('');
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      if (bytes.length === 0) throw new Error('The file is empty.');
      onLoad({ name: f.name, bytes, crc: crc32(bytes) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file.');
    }
  }

  return (
    <section class={card}>
      <h2 class={heading}>
        <span class={stepBadge}>1</span> ROM image
      </h2>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          read(e.dataTransfer?.files[0]);
        }}
        class={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
          dragging
            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
            : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
        }`}
      >
        <span class="text-sm font-medium">Drop a .bin file here or <span class="text-sky-600 underline dark:text-sky-400">browse</span></span>
        <span class="text-xs text-slate-500 dark:text-slate-400">Raw binary images. Nothing leaves your device.</span>
        <input
          ref={input}
          type="file"
          class="sr-only"
          onChange={(e) => {
            read((e.currentTarget as HTMLInputElement).files?.[0]);
            (e.currentTarget as HTMLInputElement).value = '';
          }}
        />
      </label>

      {error && <p class="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {file && (
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
          <dl class="flex flex-wrap gap-x-6 gap-y-1">
            <div>
              <dt class="text-xs text-slate-500 dark:text-slate-400">File</dt>
              <dd class="font-medium break-all">{file.name}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500 dark:text-slate-400">Size</dt>
              <dd class="font-mono">{formatSize(file.bytes.length)} ({file.bytes.length.toLocaleString()} bytes)</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500 dark:text-slate-400">CRC32</dt>
              <dd class="font-mono">{formatHex(file.crc)}</dd>
            </div>
          </dl>
          <button type="button" onClick={onClear} class="text-xs text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            Remove
          </button>
        </div>
      )}
      {notice}
    </section>
  );
}
