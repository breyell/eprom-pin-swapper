/**
 * Pinswap remapping.
 *
 * A mapping is two permutations: `addr[i]` is the board address line wired to
 * chip pin A<i>, and `data[i]` is the board data line wired to chip pin Q<i>.
 *
 * "Scramble" turns a normal ROM image into the image to burn for a board whose
 * traces are swapped: when the CPU asks for logical address L, the chip sees
 * physical address P (bit i of P = bit addr[i] of L), and chip output Qi lands
 * on board line data[i]. So we store out[P] = bits(in[L]) with
 * out bit i = in bit data[i].
 *
 * "Descramble" is the same operation with both permutations inverted.
 */

export type Direction = 'scramble' | 'descramble';
export type ByteOrder = 'little' | 'big';

export interface Mapping {
  addr: number[];
  data: number[];
}

export function identity(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function isIdentity(p: number[]): boolean {
  return p.every((v, i) => v === i);
}

export function isPermutation(p: number[], n: number): boolean {
  if (p.length !== n) return false;
  const seen = new Set(p);
  return seen.size === n && p.every((v) => Number.isInteger(v) && v >= 0 && v < n);
}

export function invert(p: number[]): number[] {
  const inv = new Array<number>(p.length);
  p.forEach((v, i) => (inv[v] = i));
  return inv;
}

/** Apply a permutation to the bits of a value: out bit i = in bit perm[i]. */
export function permuteBits(value: number, perm: number[]): number {
  let out = 0;
  for (let i = 0; i < perm.length; i++) {
    if ((value >>> perm[i]) & 1) out |= 1 << i;
  }
  return out >>> 0;
}

/**
 * Build split lookup tables so permuting a value up to 20+ bits is two table
 * reads and an OR. Each source bit j contributes to output bit inv[j].
 */
function buildSplitLut(perm: number[]) {
  const n = perm.length;
  const inv = invert(perm);
  const loBits = Math.min(n, Math.ceil(n / 2));
  const hiBits = n - loBits;
  const make = (offset: number, bits: number) => {
    const lut = new Uint32Array(1 << bits);
    for (let x = 0; x < lut.length; x++) {
      let out = 0;
      for (let j = 0; j < bits; j++) if ((x >>> j) & 1) out |= 1 << inv[offset + j];
      lut[x] = out >>> 0;
    }
    return lut;
  };
  const lo = make(0, loBits);
  const hi = make(loBits, hiBits);
  const loMask = (1 << loBits) - 1;
  return (v: number) => lo[v & loMask] | hi[v >>> loBits];
}

export interface RemapOptions {
  addressBits: number;
  dataBits: 8 | 16;
  mapping: Mapping;
  direction: Direction;
  /** Byte order of 16-bit words in the file. */
  byteOrder?: ByteOrder;
}

/**
 * Remap a ROM image. `input` must be exactly the chip size
 * (2^addressBits words); use `fitToSize` first.
 */
export function remap(input: Uint8Array, opts: RemapOptions): Uint8Array<ArrayBuffer> {
  const { addressBits, dataBits, direction, byteOrder = 'little' } = opts;
  const words = 2 ** addressBits;
  const bytesPerWord = dataBits / 8;
  if (input.length !== words * bytesPerWord) {
    throw new Error(`Expected ${words * bytesPerWord} bytes, got ${input.length}`);
  }
  if (!isPermutation(opts.mapping.addr, addressBits)) throw new Error('Invalid address mapping');
  if (!isPermutation(opts.mapping.data, dataBits)) throw new Error('Invalid data mapping');

  const addrPerm = direction === 'scramble' ? opts.mapping.addr : invert(opts.mapping.addr);
  const dataPerm = direction === 'scramble' ? opts.mapping.data : invert(opts.mapping.data);
  const mapAddr = buildSplitLut(addrPerm);

  const dataLut = new (dataBits === 8 ? Uint8Array : Uint16Array)(1 << dataBits);
  for (let v = 0; v < dataLut.length; v++) dataLut[v] = permuteBits(v, dataPerm);

  const out = new Uint8Array(input.length);
  if (dataBits === 8) {
    for (let l = 0; l < words; l++) out[mapAddr(l)] = dataLut[input[l]];
  } else {
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    const outView = new DataView(out.buffer);
    const le = byteOrder === 'little';
    for (let l = 0; l < words; l++) {
      outView.setUint16(mapAddr(l) * 2, dataLut[view.getUint16(l * 2, le)], le);
    }
  }
  return out;
}

export interface FitResult {
  bytes: Uint8Array;
  padded: number;
}

/** Pad an image with 0xFF (erased state) up to the chip size. Throws if too big. */
export function fitToSize(input: Uint8Array, size: number): FitResult {
  if (input.length > size) throw new Error(`File is ${input.length} bytes but the chip holds ${size}`);
  if (input.length === size) return { bytes: input, padded: 0 };
  const bytes = new Uint8Array(size).fill(0xff);
  bytes.set(input);
  return { bytes, padded: size - input.length };
}

let crcTable: Uint32Array | undefined;

export function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function formatHex(n: number, digits = 8): string {
  return n.toString(16).toUpperCase().padStart(digits, '0');
}
