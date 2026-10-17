/**
 * Preset pinswaps, keyed by EPROM id (see src/data/eproms.ts).
 *
 * `address[i]` is the board address line wired to chip pin A<i>.
 * `data[i]` is the board data line wired to chip pin Q<i>.
 * Each array must be a permutation of 0..n-1, where n is the chip's
 * addressBits / dataBits.
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
};

export function getPresets(epromId: string): Preset[] {
  return presets[epromId] ?? [];
}
