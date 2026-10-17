import { describe, expect, it } from 'vitest';
import { eproms } from '../data/eproms';
import { presets } from '../data/presets';
import { crc32, fitToSize, identity, invert, isPermutation, permuteBits, remap } from './remap';

function randomBytes(n: number, seed = 1): Uint8Array {
  const out = new Uint8Array(n);
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    out[i] = s >>> 24;
  }
  return out;
}

function shuffle(n: number, seed: number): number[] {
  const p = identity(n);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

describe('permutation helpers', () => {
  it('inverts', () => {
    const p = [2, 0, 3, 1];
    const inv = invert(p);
    expect(p.map((v) => inv[v])).toEqual(identity(4));
  });

  it('permutes bits', () => {
    expect(permuteBits(0b0000_0001, [7, 1, 2, 3, 4, 5, 6, 0])).toBe(0b1000_0000);
    expect(permuteBits(0b1000_0000, [7, 1, 2, 3, 4, 5, 6, 0])).toBe(0b0000_0001);
  });
});

describe('remap', () => {
  it('identity mapping leaves data unchanged', () => {
    const input = randomBytes(1 << 13);
    const out = remap(input, {
      addressBits: 13,
      dataBits: 8,
      mapping: { addr: identity(13), data: identity(8) },
      direction: 'scramble',
    });
    expect(out).toEqual(input);
  });

  it('swaps A0/A1 and D0/D7 as expected', () => {
    // 4-address toy chip: logical bytes 0..3
    const input = new Uint8Array([0x01, 0x02, 0x80, 0x0f]);
    const out = remap(input, {
      addressBits: 2,
      dataBits: 8,
      mapping: { addr: [1, 0], data: [7, 1, 2, 3, 4, 5, 6, 0] },
      direction: 'scramble',
    });
    // address 1 <-> 2, bit 0 <-> bit 7
    expect(Array.from(out)).toEqual([0x80, 0x01, 0x02, 0x8e]);
  });

  it('round-trips scramble -> descramble for every 8-bit chip', () => {
    for (const chip of eproms.filter((e) => e.dataBits === 8)) {
      const input = randomBytes(chip.sizeBytes, chip.addressBits);
      const mapping = { addr: shuffle(chip.addressBits, 7), data: shuffle(8, 3) };
      const opts = { addressBits: chip.addressBits, dataBits: 8 as const, mapping };
      const scrambled = remap(input, { ...opts, direction: 'scramble' });
      expect(scrambled).not.toEqual(input);
      expect(remap(scrambled, { ...opts, direction: 'descramble' })).toEqual(input);
    }
  });

  it('round-trips 16-bit images in both byte orders', () => {
    const input = randomBytes(2 << 12, 99);
    const mapping = { addr: shuffle(12, 5), data: shuffle(16, 11) };
    for (const byteOrder of ['little', 'big'] as const) {
      const opts = { addressBits: 12, dataBits: 16 as const, mapping, byteOrder };
      const scrambled = remap(input, { ...opts, direction: 'scramble' });
      expect(remap(scrambled, { ...opts, direction: 'descramble' })).toEqual(input);
    }
  });

  it('respects 16-bit byte order', () => {
    // one word 0x0001; swap Q0 <-> Q8
    const data = identity(16);
    [data[0], data[8]] = [data[8], data[0]];
    const mapping = { addr: [0], data };
    const le = remap(new Uint8Array([0x01, 0x00, 0, 0]), {
      addressBits: 1, dataBits: 16, mapping, direction: 'scramble', byteOrder: 'little',
    });
    expect(Array.from(le)).toEqual([0x00, 0x01, 0, 0]);
    const be = remap(new Uint8Array([0x00, 0x01, 0, 0]), {
      addressBits: 1, dataBits: 16, mapping, direction: 'scramble', byteOrder: 'big',
    });
    expect(Array.from(be)).toEqual([0x01, 0x00, 0, 0]);
  });

  it('rejects wrong sizes and invalid mappings', () => {
    const opts = { addressBits: 2, dataBits: 8 as const, direction: 'scramble' as const };
    expect(() => remap(new Uint8Array(3), { ...opts, mapping: { addr: [0, 1], data: identity(8) } })).toThrow();
    expect(() => remap(new Uint8Array(4), { ...opts, mapping: { addr: [0, 0], data: identity(8) } })).toThrow();
  });
});

describe('fitToSize', () => {
  it('pads with 0xFF', () => {
    const { bytes, padded } = fitToSize(new Uint8Array([1, 2]), 4);
    expect(Array.from(bytes)).toEqual([1, 2, 0xff, 0xff]);
    expect(padded).toBe(2);
  });

  it('throws when too large', () => {
    expect(() => fitToSize(new Uint8Array(5), 4)).toThrow();
  });
});

describe('data', () => {
  it('chip definitions are consistent', () => {
    for (const chip of eproms) {
      const pinCount = Number(chip.package.split('-')[1]);
      expect(chip.pins).toHaveLength(pinCount);
      const addrBits = chip.pins.filter((p) => p.type === 'address').map((p) => p.bit!);
      expect(isPermutation(addrBits, chip.addressBits)).toBe(true);
      const dataBits = chip.pins.filter((p) => p.type === 'data').map((p) => p.bit!);
      expect(isPermutation(dataBits, chip.dataBits)).toBe(true);
    }
  });

  it('presets are valid permutations for their chip', () => {
    for (const chip of eproms) {
      for (const preset of presets[chip.id] ?? []) {
        expect(isPermutation(preset.address, chip.addressBits)).toBe(true);
        expect(isPermutation(preset.data, chip.dataBits)).toBe(true);
      }
    }
  });
});

it('crc32 matches known vector', () => {
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
});
