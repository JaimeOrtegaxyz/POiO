# hardware

Notes and prototypes for running poio on a physical device in the kitchen.

## Direction

Ambient e-ink screen, glanceable, battery-powered, polls a small server every few minutes for the current view (pantry status, today's suggestion, shopping list).

## Options under consideration

### TRMNL (off-the-shelf or DIY kit)
- 7.5" mono e-ink, 800×480, ESP32-S3, battery lasts months
- DIY kit (Seeed) ~$80 + $50 BYOD license to use their server/plugin layer
- Or skip the BYOD layer and point the firmware at our own server
- Fastest path to "it works in my kitchen"

### Fully custom build
- ESP32-S3 (or ESP32-C6 for newer Wi-Fi) + Waveshare 7.5" e-ink + LiPo + charger
- More work, more soldering, but full control over firmware, power profile, enclosure
- Better long-term foundation if poio becomes a real product

## Open questions

- Refresh cadence — once an hour? on-demand via button?
- Input: button to cycle views, or pure read-only display?
- Enclosure — 3D-printed, wood, magnet-to-fridge?
- Server — runs locally on a Mac mini / Pi, or hosted?
