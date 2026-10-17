# EPROM Pin Swap

A static web app that remaps ROM images for boards whose EPROM address and data lines are pinswapped. Everything happens in the browser, so files are never uploaded.

Built with [Astro](https://astro.build), [Preact](https://preactjs.com) and [Tailwind CSS](https://tailwindcss.com) (utility classes only). It's deployed as static assets on Cloudflare Workers.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm test       # remap unit tests
pnpm check      # type-check
pnpm build      # static output in dist/
pnpm preview    # serve dist/ with wrangler, the same way Cloudflare does
```

## How the remap works

A mapping is made of two permutations:

- `addr[i]` is the **board** address line wired to **chip** pin `A<i>`.
- `data[i]` is the board data line wired to chip pin `Q<i>`.

**Scramble** turns a normal dump into the image to burn for the swapped board. **Descramble** reverses it, turning an image read from a swapped board back into a normal dump. Only address↔address and data↔data swaps are allowed. Power and control pins can't be compensated for in software.

16-bit parts (27C400/800/160/322) are handled in word mode, with a selectable byte order. The 32 Mbit 27C322 is word-only: pin 32 is A20 and VPP shares the OE pin. A file smaller than the chip is padded with `0xFF`.

## Adding a preset pinswap

Presets live in [`src/data/presets.ts`](src/data/presets.ts), keyed by EPROM id:

```ts
'27256': [
  {
    id: 'my-board',
    name: 'My Board ECU',
    description: 'A0/A1 and Q0/Q7 swapped',
    address: [1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    data: [7, 1, 2, 3, 4, 5, 6, 0],
  },
],
```

Each array must be a full permutation (`address` has the chip's `addressBits` entries, and `data` has 8 or 16). `pnpm test` checks every preset against its chip.

## Adding an EPROM

Add an entry to [`src/data/eproms.ts`](src/data/eproms.ts) with its pin labels in physical order. Pin types, the address width and the capacity are worked out from the labels (`A#`, `Q#`, `VCC`, `GND`, `VPP`, `NC`, and anything else counts as control). Add an empty preset list for the new id too.

## Deploying to Cloudflare

Cloudflare builds and deploys the site; GitHub only hosts the repo.

1. Push this repo to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository** and pick the repo.
3. Use these build settings:
   - Build command: `pnpm build`
   - Deploy command: `pnpm wrangler deploy`
4. Pushes to the production branch deploy automatically, and other branches get preview URLs.

`wrangler.jsonc` serves `dist/` as static assets, with no Worker script. pnpm's version comes from the `packageManager` field in `package.json`.
