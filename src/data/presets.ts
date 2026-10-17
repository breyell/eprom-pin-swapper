/**
 * Preset pinswaps, keyed by EPROM id (see src/data/eproms.ts).
 *
 * `address[i]` is the board address line wired to chip pin A<i>.
 * `data[i]` is the board data line wired to chip pin Q<i>.
 * Each array must be a permutation of 0..n-1, where n is the chip's
 * addressBits / dataBits. `description` may contain [text](url) links.
 *
 * Example (27C256, board swaps A0<->A1 and Q0<->Q7):
 *   {
 *     id: 'example',
 *     name: 'Example board',
 *     description: 'A0/A1 and Q0/Q7 swapped',
 *     address: [1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
 *     data: [7, 1, 2, 3, 4, 5, 6, 0],
 *   }
 */
export interface Preset {
  id: string;
  name: string;
  description?: string;
  address: number[];
  data: number[];
}

export const presets: Record<string, Preset[]> = {
  '2716': [],
  '2732': [],
  '2764': [],
  '27128': [],
  '27256': [],
  '27512': [],
  '27c010': [],
  '27c020': [],
  '27c040': [],
  '27c080': [],
  '27c400': [],
  '27c800': [],
  '27c160': [],
  '27c322': [
    {
      id: 'bucket-mouse-sa1-v1',
      name: 'Bucket Mouse SA-1 v1.0',
      description: "For use with [Bucket Mouse's SNES SA-1 V1.0 PCB](https://github.com/MouseBiteLabs/Super-Nintendo-Cartridges/tree/main/SA-1)",
      address: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 17, 19, 20],
      data: [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    },
  ],
};

export function getPresets(epromId: string): Preset[] {
  return presets[epromId] ?? [];
}
