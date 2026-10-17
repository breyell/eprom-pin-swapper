import { useState } from 'preact/hooks';
import { eproms, packages, type Eprom } from '../data/eproms';
import type { Preset } from '../data/presets';
import type { ByteOrder, Direction, Mapping } from '../lib/remap';
import { boardSignal, type PinRef } from './ChipDiagram';
import { button, card, formatSize, heading, select, stepBadge } from './pinStyles';

interface Props {
  chip: Eprom;
  onChipChange: (id: string) => void;
  presets: Preset[];
  presetId: string;
  onPresetChange: (id: string) => void;
  mapping: Mapping;
  onAssign: (type: PinRef['type'], chipBit: number, boardBit: number) => void;
  onReset: () => void;
  onCopyLink: () => Promise<void>;
  direction: Direction;
  onDirectionChange: (d: Direction) => void;
  byteOrder: ByteOrder;
  onByteOrderChange: (b: ByteOrder) => void;
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} class="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          class={`rounded-md px-3 py-1 text-sm ${
            value === o.value ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MapTable({ title, type, chip, perm, onAssign }: {
  title: string;
  type: PinRef['type'];
  chip: Eprom;
  perm: number[];
  onAssign: Props['onAssign'];
}) {
  const pinFor = (bit: number) => chip.pins.find((p) => p.type === type && p.bit === bit);
  const chipName = (bit: number) => (type === 'address' ? `A${bit}` : `Q${bit}`);

  return (
    <div>
      <h3 class="mb-2 text-sm font-semibold">{title}</h3>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {perm.map((boardBit, chipBit) => {
          const swapped = boardBit !== chipBit;
          return (
            <label
              key={chipBit}
              class={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 sm:gap-2 ${
                swapped ? 'border-pink-400 bg-pink-50 dark:border-pink-500/60 dark:bg-pink-950/30' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <span class="w-11 shrink-0 font-mono text-xs sm:w-14">
                <span class={`font-semibold ${type === 'address' ? 'text-sky-700 dark:text-sky-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {chipName(chipBit)}
                </span>
                <span class="block text-[10px] text-slate-500 dark:text-slate-400">pin {pinFor(chipBit)?.num}</span>
              </span>
              <span aria-hidden="true" class="hidden text-slate-400 sm:inline">→</span>
              <select
                class={select}
                aria-label={`Board signal for chip ${chipName(chipBit)}`}
                value={boardBit}
                onChange={(e) => onAssign(type, chipBit, Number((e.currentTarget as HTMLSelectElement).value))}
              >
                {perm.map((_, b) => (
                  <option key={b} value={b}>
                    {boardSignal(type, b)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function RemapPanel(props: Props) {
  const { chip, mapping } = props;
  const [copied, setCopied] = useState(false);

  function copyLink() {
    props.onCopyLink().then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section class={card}>
      <h2 class={heading}>
        <span class={stepBadge}>3</span> EPROM &amp; pin mapping
      </h2>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block text-sm">
          <span class="mb-1 block font-medium">EPROM</span>
          <select class={select} value={chip.id} onChange={(e) => props.onChipChange((e.currentTarget as HTMLSelectElement).value)}>
            {packages.map((pkg) => (
              <optgroup key={pkg} label={pkg}>
                {eproms
                  .filter((e) => e.package === pkg)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            {formatSize(chip.sizeBytes)} · {chip.addressBits} address lines · {chip.dataBits}-bit data
          </span>
        </label>

        <label class="block text-sm">
          <span class="mb-1 block font-medium">Preset pinswap</span>
          <select
            class={select}
            value={props.presetId}
            disabled={props.presets.length === 0}
            onChange={(e) => props.onPresetChange((e.currentTarget as HTMLSelectElement).value)}
          >
            <option value="">{props.presets.length ? 'Custom' : 'No presets yet for this chip'}</option>
            {props.presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            {props.presets.find((p) => p.id === props.presetId)?.description ?? 'Choose a known board layout, or set the mapping below.'}
          </span>
        </label>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="font-medium">Mode</span>
          <Segmented
            label="Mode"
            value={props.direction}
            onChange={props.onDirectionChange}
            options={[
              { value: 'scramble', label: 'Scramble' },
              { value: 'descramble', label: 'Descramble' },
            ]}
          />
        </div>
        {chip.dataBits === 16 && (
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-medium">Byte order</span>
            <Segmented
              label="Byte order"
              value={props.byteOrder}
              onChange={props.onByteOrderChange}
              options={[
                { value: 'little', label: 'Little-endian' },
                { value: 'big', label: 'Big-endian' },
              ]}
            />
          </div>
        )}
        <div class="ml-auto flex gap-2">
          <button
            type="button"
            class={button}
            onClick={copyLink}
            title={props.presetId ? 'Link to this EPROM and preset' : 'Link to this EPROM'}
          >
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <button type="button" class={button} onClick={props.onReset}>
            Reset mapping
          </button>
        </div>
      </div>
      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {props.direction === 'scramble'
          ? 'Scramble: turn a normal dump into the image to burn for the pinswapped board.'
          : 'Descramble: turn an image read from the pinswapped board back into a normal dump.'}
      </p>

      <div class="mt-5 space-y-5">
        <MapTable title="Address lines" type="address" chip={chip} perm={mapping.addr} onAssign={props.onAssign} />
        <MapTable title="Data lines" type="data" chip={chip} perm={mapping.data} onAssign={props.onAssign} />
      </div>
    </section>
  );
}
