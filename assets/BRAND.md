# POiO brand

The colors, marks and type, in one place. Code reads the colors from
[`mockup/src/brand.css`](../mockup/src/brand.css); a test keeps that file and
the table below in step.

## Colors

| Name | Hex | For |
|---|---|---|
| Grey | `#E7E7E7` | The background. |
| Red | `#E50001` | The hen, the star knob, the landing hero. The brand's main color. |
| Yellow | `#FFC700` | The hen's disc, the shell, highlights and the logo ring on red. |
| Green | `#2FB463` | Accent. Proposed 2026-11-09 for the site's color blocks. |
| Pink | `#E4007C` | Accent, rosa mexicano. Proposed 2026-11-09 for the site's color blocks. |
| Ink | `#1A1A1A` | Text and outlines. |
| White | `#FFFFFF` | Cards; text on red and pink. |

Pairings that read: ink on grey, yellow, green and white; white on red and
pink. Keep pink from touching red directly (they're the same lightness and
vibrate); put grey, white or yellow between them.

The e-paper screen is not drawn in these: it shows what the panel's pigments
can (`mockup/src/screen/profiles.ts`). On the device, the hen comes out in
the panel's red and yellow.

## Marks

| File | What |
|---|---|
| [`logo-bw.svg`](logo-bw.svg) | The POiO wordmark, one color (`currentColor` on the site). |
| [`chicken-color.svg`](chicken-color.svg) | The hen: red on the yellow disc. The device's sleep image. |
| [`chicken-alone.svg`](chicken-alone.svg) | The hen's silhouette, one color. The device's thinking state. |

## Type

Quicksand (500, 600, 700) for everything people read; JetBrains Mono (400,
500, 700) for small labels and numbers. Both SIL Open Font License,
self-hosted in `mockup/public/fonts/`.

## Icons

[Phosphor](https://phosphoricons.com) (MIT), bold weight, from
`@phosphor-icons/core`: a broad kitchen and food set (cooking-pot,
bowl-steam, knife, fork-knife, oven, egg, pepper, carrot, basket…). Site
only; the e-paper keeps its own line glyphs.
