# Reference

Data-model material carried over from the archived Stage 2 prototype. These files
are the starting point for the online mockup's data model (`mockup/`, coming).

- [`recipe.schema.json`](recipe.schema.json): the structured recipe the device
  screen steps through (JSON Schema 2020-12). Enum values such as `"Protein"` are
  identifiers, not copy, and stay in English.
- [`PANTRY-MODEL.md`](PANTRY-MODEL.md): where the pantry lives and how it's kept
  current (bootstrap / upkeep / correction, predict-and-confirm, files only seed).
- [`recipes/`](recipes/): three sample recipes in Mexican Spanish, valid against
  the schema.

The archived Stage 2 app keeps its own frozen copies (English recipes, original
schema) under [`archive/stage2/`](../archive/stage2/) so it still runs unchanged.
