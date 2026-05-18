# hardware

Notes and plan for running POiO on a physical device in the kitchen.

## Direction

Ambient e-ink screen, glanceable from across the kitchen, battery-powered, polls a small server every few minutes for the current view (pantry status, today's suggestion, shopping list).

## Plan: Inkplate 10

**Soldered Inkplate 10** — 9.7" monochrome e-ink, 1200×825, ESP32 baked in, fully open SDK (Arduino + MicroPython), no managed cloud layer.

### Why this one

- **Size.** 9.7" reads cleanly from across the kitchen. Smaller boards (Inkplate 6, 6COLOR) need you to walk up.
- **Partial refresh.** Text updates in ~0.5s. Critical if there's any interactive cycling between views.
- **Open.** No BYOD license, no plugin ecosystem to fight, ESP32 means we own the firmware.
- **Battery.** Mono e-ink + ESP32 deep sleep → months on a charge with hourly polling.

### Why not 6COLOR (the alternative we considered)

7-color e-ink is gorgeous for food, but: smaller (5.85"), full-refresh-only (15–30s flash on every update), shorter battery. The case for it is narrow — a single hero card that updates once a day. Possible second-screen later; not the right v1.

### Why not TRMNL (previous direction)

Same form factor as a DIY ESP32+Waveshare build, but locked behind a $50 BYOD license to use their server. Inkplate gives us the same hardware concept with no vendor layer.

## Open questions (pick up tomorrow)

- **Refresh cadence.** Hourly poll? On-demand button? Time-of-day schedule (more frequent around meal-planning hours)?
- **Input.** Read-only display, or buttons to cycle views (pantry / today's suggestion / shopping list)? Inkplate 10 has touch-pad pins on the side we could wire up.
- **Server.** Local on a Mac mini / Pi at home, or hosted? Does the device call the Claude API directly or hit our own thin server that does?
- **Views.** What does the daily layout actually look like? Sketch needed.
- **Enclosure.** 3D-printed frame, wood, or just naked PCB on the wall?
- **Power.** Battery + occasional charging, or wall-wart with the cable hidden?

## Procurement

- Inkplate 10 — soldered.com, ~$150
- USB-C cable for flashing (have)
- LiPo battery (comes with the board on most SKUs — verify when ordering)
