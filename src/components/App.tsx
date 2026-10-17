import { useMemo, useState } from 'preact/hooks';
import { eproms, getEprom } from '../data/eproms';
import { getPresets } from '../data/presets';
import { identity, isIdentity, type ByteOrder, type Direction, type Mapping } from '../lib/remap';
import ChipDiagram, { type PinRef } from './ChipDiagram';
import Generate from './Generate';
import RemapPanel from './RemapPanel';
import Upload, { type LoadedFile } from './Upload';
import { button, formatSize } from './pinStyles';

const DEFAULT_CHIP = '27256';

function identityMapping(id: string): Mapping {
  const chip = getEprom(id);
  return { addr: identity(chip.addressBits), data: identity(chip.dataBits) };
}

const samePerm = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

export default function App() {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [chipId, setChipId] = useState(DEFAULT_CHIP);
  const [mapping, setMapping] = useState<Mapping>(() => identityMapping(DEFAULT_CHIP));
  const [selected, setSelected] = useState<PinRef | null>(null);
  const [direction, setDirection] = useState<Direction>('scramble');
  const [byteOrder, setByteOrder] = useState<ByteOrder>('little');

  const chip = getEprom(chipId);
  const presets = getPresets(chipId);
  const presetId = useMemo(
    () => presets.find((p) => samePerm(p.address, mapping.addr) && samePerm(p.data, mapping.data))?.id ?? '',
    [presets, mapping],
  );

  function changeChip(id: string) {
    setChipId(id);
    setMapping(identityMapping(id));
    setSelected(null);
  }

  function applyPreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    setMapping(preset ? { addr: [...preset.address], data: [...preset.data] } : identityMapping(chipId));
    setSelected(null);
  }

  /** Wire chip pin `chipBit` to board line `boardBit`, swapping with whichever pin had it. */
  function assign(type: PinRef['type'], chipBit: number, boardBit: number) {
    setMapping((m) => {
      const perm = [...(type === 'address' ? m.addr : m.data)];
      const other = perm.indexOf(boardBit);
      [perm[chipBit], perm[other]] = [perm[other], perm[chipBit]];
      return type === 'address' ? { ...m, addr: perm } : { ...m, data: perm };
    });
  }

  /** Two clicks on pins of the same group swap their board connections. */
  function clickPin(pin: PinRef) {
    if (!selected || selected.type !== pin.type) return setSelected(pin);
    if (selected.bit !== pin.bit) {
      setMapping((m) => {
        const perm = [...(pin.type === 'address' ? m.addr : m.data)];
        [perm[selected.bit], perm[pin.bit]] = [perm[pin.bit], perm[selected.bit]];
        return pin.type === 'address' ? { ...m, addr: perm } : { ...m, data: perm };
      });
    }
    setSelected(null);
  }

  function loadFile(f: LoadedFile) {
    setFile(f);
    // Switch to an exact-size chip when nothing has been customised yet.
    if (f.bytes.length !== chip.sizeBytes && isIdentity(mapping.addr) && isIdentity(mapping.data)) {
      const exact =
        eproms.find((e) => e.sizeBytes === f.bytes.length && e.dataBits === chip.dataBits) ??
        eproms.find((e) => e.sizeBytes === f.bytes.length);
      if (exact) changeChip(exact.id);
    }
  }

  const size = file?.bytes.length ?? 0;
  const fits = size <= chip.sizeBytes;
  const fitting = eproms.filter((e) => e.sizeBytes >= size).sort((a, b) => a.sizeBytes - b.sizeBytes)[0];

  const notice = file && (
    <div
      class={`mt-3 flex flex-wrap items-center gap-3 rounded-lg px-4 py-2 text-sm ${
        !fits
          ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
          : size < chip.sizeBytes
            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
      }`}
    >
      <span>
        {!fits
          ? `Too large for the ${chip.name}.`
          : size < chip.sizeBytes
            ? `Smaller than the ${chip.name}. It will be padded with 0xFF to ${formatSize(chip.sizeBytes)}.`
            : `Matches the ${chip.name} exactly.`}
      </span>
      {!fits && fitting && (
        <button type="button" class={button} onClick={() => changeChip(fitting.id)}>
          Use {fitting.name}
        </button>
      )}
      {!fits && !fitting && <span>No supported EPROM is large enough.</span>}
    </div>
  );

  // The island is the only child of <main>, so the sections need their own spacing.
  return (
    <div class="space-y-6">
      <Upload file={file} onLoad={loadFile} onClear={() => setFile(null)} notice={notice} />
      <ChipDiagram chip={chip} mapping={mapping} selected={selected} onPinClick={clickPin} />
      <RemapPanel
        chip={chip}
        onChipChange={changeChip}
        presets={presets}
        presetId={presetId}
        onPresetChange={applyPreset}
        mapping={mapping}
        onAssign={assign}
        onReset={() => applyPreset('')}
        direction={direction}
        onDirectionChange={setDirection}
        byteOrder={byteOrder}
        onByteOrderChange={setByteOrder}
      />
      <Generate file={file} chip={chip} mapping={mapping} direction={direction} byteOrder={byteOrder} fits={fits} />
    </div>
  );
}
