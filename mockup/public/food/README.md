# Food images

Variant `a` shows one food image on the cookbook screen and the recipe intro.
Images are static sources, dithered to the panel at runtime (no runtime image
generation, never hotlinked). Until a file exists, the screen falls back to a
line-art glyph.

**License rule:** CC0 or public domain only (this repo is public). Record every
file in [`CREDITS.md`](CREDITS.md) with its source URL, author and license.

## Expected files

JPEG, food large in frame, simple composition, at least 600×600 px. The name is
the recipe id:

| File | Dish |
|---|---|
| `tinga-de-pollo.jpg` | Tinga de pollo |
| `pollo-a-la-crema-con-rajas.jpg` | Pollo a la crema con rajas |
| `gochujang-glazed-thighs.jpg` | Muslos glaseados con gochujang |
| `pollo-en-salsa-verde.jpg` | Pollo en salsa verde |
| `tacos-de-pollo-al-pastor.jpg` | Tacos de pollo al pastor en sartén |
| `caldo-de-pollo.jpg` | Caldo de pollo con verduras |
| `huevos-a-la-mexicana.jpg` | Huevos a la mexicana |
| `enfrijoladas.jpg` | Enfrijoladas con queso fresco |
| `tostadas-de-atun.jpg` | Tostadas de atún con chipotle |

Live-brain dishes use the slug of their title (e.g. `pollo-al-chipotle.jpg`)
and fall back to the glyph when there's no file.
