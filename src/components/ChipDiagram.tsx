import type { Eprom, Pin, PinType } from '../data/eproms';
import type { Mapping } from '../lib/remap';
import { card, heading, pinStyles, stepBadge } from './pinStyles';

export interface PinRef {
  type: 'address' | 'data';
  bit: number;
}

interface Props {
  chip: Eprom;
  mapping: Mapping;
  selected: PinRef | null;
  onPinClick: (pin: PinRef) => void;
}

const W = 640;
const PITCH = 26;
const TOP = 40;
const BODY_L = 230;
const BODY_R = 410;
const STUB = 26;

/** Board signal name for a chip address/data pin under the current mapping. */
export function boardSignal(type: 'address' | 'data', boardBit: number) {
  return type === 'address' ? `A${boardBit}` : `D${boardBit}`;
}

function swapTarget(pin: Pin, mapping: Mapping): string | null {
  if (pin.bit === undefined) return null;
  if (pin.type === 'address' && mapping.addr[pin.bit] !== pin.bit) return boardSignal('address', mapping.addr[pin.bit]);
  if (pin.type === 'data' && mapping.data[pin.bit] !== pin.bit) return boardSignal('data', mapping.data[pin.bit]);
  return null;
}

export default function ChipDiagram({ chip, mapping, selected, onPinClick }: Props) {
  const half = chip.pins.length / 2;
  const H = TOP + half * PITCH + 24;
  const bodyBottom = TOP + half * PITCH - 4;
  const usedTypes = [...new Set(chip.pins.map((p) => p.type))] as PinType[];
  const swappedCount = chip.pins.filter((p) => swapTarget(p, mapping)).length;

  return (
    <section class={card}>
      <h2 class={heading}>
        <span class={stepBadge}>2</span> Pin diagram
        <span class="ml-auto text-sm font-normal text-slate-500 dark:text-slate-400">
          {swappedCount ? `${swappedCount} pins rewired` : 'No swaps'}
        </span>
      </h2>
      <p class="mb-3 text-sm text-slate-500 dark:text-slate-400">
        Click two address pins or two data pins to swap them. <span class="font-semibold text-pink-600 dark:text-pink-400">→ A7</span> means
        the chip pin is wired to board signal A7.
      </p>

      <div class="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} class="mx-auto block w-full max-w-2xl min-w-[22rem] select-none" role="img" aria-label={`${chip.name} pinout`}>
          {/* Package body */}
          <rect
            x={BODY_L}
            y={TOP - 16}
            width={BODY_R - BODY_L}
            height={bodyBottom - TOP + 16}
            rx="6"
            class="fill-slate-800 stroke-slate-900 dark:fill-slate-700 dark:stroke-slate-500"
          />
          <path
            d={`M ${(BODY_L + BODY_R) / 2 - 14} ${TOP - 16} a 14 14 0 0 0 28 0`}
            class="fill-slate-50 stroke-slate-900 dark:fill-slate-900 dark:stroke-slate-500"
          />
          <circle cx={BODY_L + 16} cy={TOP - 2} r="4" class="fill-slate-500 dark:fill-slate-400" />
          <text
            x={(BODY_L + BODY_R) / 2}
            y={(TOP + bodyBottom) / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            transform={`rotate(-90 ${(BODY_L + BODY_R) / 2} ${(TOP + bodyBottom) / 2})`}
            class="fill-slate-200 text-lg font-bold tracking-widest"
          >
            {chip.name.split(' ')[0]}
          </text>
          <text x={(BODY_L + BODY_R) / 2} y={bodyBottom + 16} text-anchor="middle" class="fill-slate-500 text-[11px] dark:fill-slate-400">
            {chip.package}
          </text>

          {chip.pins.map((pin, idx) => {
            const left = idx < half;
            const row = left ? idx : chip.pins.length - 1 - idx;
            const y = TOP + row * PITCH + 6;
            const style = pinStyles[pin.type];
            const target = swapTarget(pin, mapping);
            const swappable = (pin.type === 'address' || pin.type === 'data') && pin.bit !== undefined;
            const isSelected = swappable && selected?.type === pin.type && selected.bit === pin.bit;
            const stubX = left ? BODY_L - STUB : BODY_R;
            const click = () => swappable && onPinClick({ type: pin.type as 'address' | 'data', bit: pin.bit! });

            return (
              <g
                key={pin.num}
                class={swappable ? 'cursor-pointer outline-none [&:focus-visible>rect:first-child]:fill-sky-500/15' : ''}
                role={swappable ? 'button' : undefined}
                tabIndex={swappable ? 0 : undefined}
                aria-label={swappable ? `Pin ${pin.num} ${pin.name}${target ? `, wired to ${target}` : ''}` : undefined}
                aria-pressed={swappable ? isSelected : undefined}
                onClick={click}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    click();
                  }
                }}
              >
                {/* hit area / hover highlight */}
                <rect
                  x={left ? 0 : BODY_R}
                  y={y - PITCH / 2 + 1}
                  width={W / 2 - (BODY_R - BODY_L) / 2}
                  height={PITCH - 2}
                  rx="4"
                  class={`fill-transparent ${swappable ? 'hover:fill-slate-500/10' : ''} ${isSelected ? 'fill-sky-500/20!' : ''}`}
                />
                <rect
                  x={stubX}
                  y={y - 6}
                  width={STUB}
                  height="12"
                  rx="2"
                  class={`${style.fill} ${target ? 'stroke-pink-500 stroke-2' : ''} ${isSelected ? 'stroke-slate-900 stroke-[3] dark:stroke-white' : ''}`}
                />
                <text
                  x={left ? BODY_L + 8 : BODY_R - 8}
                  y={y}
                  text-anchor={left ? 'start' : 'end'}
                  dominant-baseline="middle"
                  class="fill-slate-300 font-mono text-[11px]"
                >
                  {pin.num}
                </text>
                <text
                  x={left ? BODY_L - STUB - 8 : BODY_R + STUB + 8}
                  y={y}
                  text-anchor={left ? 'end' : 'start'}
                  dominant-baseline="middle"
                  class={`${style.text} font-mono text-[13px] font-semibold`}
                >
                  {pin.name}
                </text>
                {target && (
                  <text
                    x={left ? 124 : W - 124}
                    y={y}
                    text-anchor={left ? 'end' : 'start'}
                    dominant-baseline="middle"
                    class="fill-pink-600 font-mono text-[13px] font-bold dark:fill-pink-400"
                  >
                    {left ? `${target} ←` : `→ ${target}`}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {usedTypes.map((t) => (
          <li key={t} class="flex items-center gap-1.5">
            <span class={`inline-block h-3 w-3 rounded-sm ${pinStyles[t].swatch}`} />
            {pinStyles[t].label}
          </li>
        ))}
        <li class="flex items-center gap-1.5">
          <span class="inline-block h-3 w-3 rounded-sm border-2 border-pink-500" />
          Rewired
        </li>
      </ul>
    </section>
  );
}
