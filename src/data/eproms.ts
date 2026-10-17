export type PinType = 'address' | 'data' | 'power' | 'ground' | 'control' | 'vpp' | 'nc';

export interface Pin {
  /** Physical DIP pin number (1-based). */
  num: number;
  /** Label as printed on the datasheet (read mode). */
  name: string;
  type: PinType;
  /** A# or Q# index for address/data pins. */
  bit?: number;
}

export type Package = 'DIP-24' | 'DIP-28' | 'DIP-32' | 'DIP-40' | 'DIP-42';

export interface Eprom {
  id: string;
  name: string;
  package: Package;
  /** Total capacity in bytes. */
  sizeBytes: number;
  /** Number of address lines (word addresses for 16-bit parts). */
  addressBits: number;
  dataBits: 8 | 16;
  pins: Pin[];
}

/**
 * Derive a Pin from a datasheet label. The first part of a dual-function label
 * decides the type, so "A11/VPP" is an address pin and "OE/VPP" is a control pin.
 */
function parsePin(name: string, num: number): Pin {
  const primary = name.split('/')[0];
  const addr = /^A(\d+)$/.exec(primary);
  if (addr) return { num, name, type: 'address', bit: Number(addr[1]) };
  const data = /^Q(\d+)$/.exec(primary);
  if (data) return { num, name, type: 'data', bit: Number(data[1]) };
  if (primary === 'VCC') return { num, name, type: 'power' };
  if (primary === 'GND') return { num, name, type: 'ground' };
  if (primary === 'VPP') return { num, name, type: 'vpp' };
  if (primary === 'NC') return { num, name, type: 'nc' };
  return { num, name, type: 'control' };
}

function chip(
  id: string,
  name: string,
  pkg: Package,
  dataBits: 8 | 16,
  labels: string[],
): Eprom {
  const pins = labels.map((label, i) => parsePin(label, i + 1));
  const addressBits = pins.filter((p) => p.type === 'address').length;
  const dataCount = pins.filter((p) => p.type === 'data').length;
  if (dataCount !== dataBits) throw new Error(`${name}: expected ${dataBits} data pins, got ${dataCount}`);
  return {
    id,
    name,
    package: pkg,
    sizeBytes: (2 ** addressBits * dataBits) / 8,
    addressBits,
    dataBits,
    pins,
  };
}

// Pin labels are listed in physical order starting at pin 1 (counter-clockwise from the notch).

const dip24 = (p18: string, p20: string, p21: string) => [
  'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'Q0', 'Q1', 'Q2', 'GND',
  'Q3', 'Q4', 'Q5', 'Q6', 'Q7', p18, 'A10', p20, p21, 'A9', 'A8', 'VCC',
];

const dip28 = (p1: string, p22: string, p26: string, p27: string) => [
  p1, 'A12', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'Q0', 'Q1', 'Q2', 'GND',
  'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'CE', 'A10', p22, 'A11', 'A9', 'A8', p26, p27, 'VCC',
];

const dip32 = (p1: string, p24: string, p30: string, p31: string) => [
  p1, 'A16', 'A15', 'A12', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'Q0', 'Q1', 'Q2', 'GND',
  'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'CE', 'A10', p24, 'A11', 'A9', 'A8', 'A13', 'A14', p30, p31, 'VCC',
];

// 16-bit parts in word mode (BYTE high); Q15 doubles as A-1 in byte mode.
const wordData = [
  'Q0', 'Q8', 'Q1', 'Q9', 'Q2', 'Q10', 'Q3', 'Q11', 'VCC',
  'Q4', 'Q12', 'Q5', 'Q13', 'Q6', 'Q14', 'Q7', 'Q15/A-1', 'GND', 'BYTE/VPP',
];

const dip40 = [
  'A17', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'CE', 'GND', 'OE',
  ...wordData,
  'A16', 'A15', 'A14', 'A13', 'A12', 'A11', 'A10', 'A9', 'A8',
];

const dip42 = (p42: string) => [
  'A18', 'A17', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'CE', 'GND', 'OE',
  ...wordData,
  'A16', 'A15', 'A14', 'A13', 'A12', 'A11', 'A10', 'A9', 'A8', p42,
];

export const eproms: Eprom[] = [
  chip('2716', '2716 (2 KB)', 'DIP-24', 8, dip24('CE/PGM', 'OE', 'VPP')),
  chip('2732', '2732 (4 KB)', 'DIP-24', 8, dip24('CE', 'OE/VPP', 'A11')),
  chip('2764', '2764 (8 KB)', 'DIP-28', 8, dip28('VPP', 'OE', 'NC', 'PGM')),
  chip('27128', '27128 (16 KB)', 'DIP-28', 8, dip28('VPP', 'OE', 'A13', 'PGM')),
  chip('27256', '27256 (32 KB)', 'DIP-28', 8, dip28('VPP', 'OE', 'A13', 'A14')),
  chip('27512', '27512 (64 KB)', 'DIP-28', 8, dip28('A15', 'OE/VPP', 'A13', 'A14')),
  chip('27c010', '27C010 (128 KB)', 'DIP-32', 8, dip32('VPP', 'OE', 'NC', 'PGM')),
  chip('27c020', '27C020 (256 KB)', 'DIP-32', 8, dip32('VPP', 'OE', 'A17', 'PGM')),
  chip('27c040', '27C040 (512 KB)', 'DIP-32', 8, dip32('VPP', 'OE', 'A17', 'A18')),
  chip('27c080', '27C080 (1 MB)', 'DIP-32', 8, dip32('A19', 'OE/VPP', 'A17', 'A18')),
  chip('27c400', '27C400 (512 KB, 16-bit)', 'DIP-40', 16, dip40),
  chip('27c800', '27C800 (1 MB, 16-bit)', 'DIP-42', 16, dip42('NC')),
  chip('27c160', '27C160 (2 MB, 16-bit)', 'DIP-42', 16, dip42('A19')),
];

export const packages: Package[] = ['DIP-24', 'DIP-28', 'DIP-32', 'DIP-40', 'DIP-42'];

export function getEprom(id: string): Eprom {
  const found = eproms.find((e) => e.id === id);
  if (!found) throw new Error(`Unknown EPROM: ${id}`);
  return found;
}

/** Smallest chip that can hold a file of the given size, preferring same data width. */
export function suggestEprom(size: number, dataBits?: 8 | 16): Eprom | undefined {
  return [...eproms]
    .filter((e) => (dataBits ? e.dataBits === dataBits : true) && e.sizeBytes >= size)
    .sort((a, b) => a.sizeBytes - b.sizeBytes)[0];
}
