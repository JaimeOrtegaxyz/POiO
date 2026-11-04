# Archive

Earlier work, kept on purpose. Nothing here is canonical: the current product is
described in [SCOPE.md](../SCOPE.md), and the dated reasons are in
[DECISIONS.md](../DECISIONS.md).

| Path | What it was | Archived on | Superseded by | Still useful for |
|---|---|---|---|---|
| [`stage2/`](stage2/) | Local Python prototype ("laptop-as-device"): stdlib JSON API + encoder web app with e-paper constraints | 2026-11-04 | The online mockup (`mockup/`, coming) and [`reference/`](../reference/) for the data model | Seeing the encoder cooking loop run end to end; the deterministic post-cook pantry diff; the bundled-font setup |
| [`mockups/`](mockups/) | Browser friction probes for the mono e-paper / encoder companion, plus the retired 9.7" wall-device design | 2026-11-04 | The color e-paper + voice direction ([SCOPE.md](../SCOPE.md), [hardware/UI-LANGUAGE.md](../hardware/UI-LANGUAGE.md)) | The friction map; layout and input ideas worth re-testing in the mockup |
| [`COPY-REVIEW.md`](COPY-REVIEW.md) | Record of a finished copy pass over the docs and app | 2026-11-04 | [VOICE.md](../VOICE.md) | The before/after rationale for each rewrite; patterns to avoid in future copy passes |
| [`hardware/PROTOTYPE-mono.md`](hardware/PROTOTYPE-mono.md) | Parts list and bench rig for the 4.2" mono e-paper + four-input bake-off | 2026-11-04 | [hardware/PROTOTYPE.md](../hardware/PROTOTYPE.md) (color e-paper bench test) | GPIO wiring notes; the bake-off checklist; input options now parked in Future |

**Archived files are frozen.** They only got a short banner on top. Their internal
links may point at pre-archive paths (`stage2/…`, `mockups/…`); that's expected.

The archived Stage 2 app still runs from the repo root:
`python3 archive/stage2/server.py --port 8781` (see
[`stage2/README.md`](stage2/README.md)).
