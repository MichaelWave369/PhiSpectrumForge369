# Φ SpectrumForge369: The Reality Translator

An open, offline-capable **multi-spectral measurement visualization runtime** that renders user-supplied electromagnetic spectral measurements and pixel arrays into scientifically labeled false-color imagery. Built as a no-dependency web app with an extensible data contract.

> **Important:** This does not make a standard webcam detect ultraviolet, thermal infrared, radio, X-rays, or gamma rays. Those measurements require appropriate calibrated physical detectors. The simulator is deliberately labeled **synthetic**. Imported readings are labeled imported and are not independently authenticated. This app is a visualization engine, not a calibrated measuring instrument or radiation-safety device.

## Run it

Requires Python 3 (or any local static HTTP server). On Windows, open a terminal in this directory:

```sh
python -m http.server 8765
```

Visit `http://localhost:8765` in Chrome/Edge or another supported browser.

The app starts in clearly labeled synthetic-demo mode. Click a spectrum band to change simulated frequencies, choose Waterfall or Spectrum, and set palette and display gain. In **Infrared**, select **Sensor Image** to see a deliberately synthetic heatmap. For real measurements, click **Import CSV / JSONL** or **Connect Serial Sensor**.

Web Serial requires a browser that implements it, a secure context (localhost or HTTPS), and user permission. ESP32/Arduino-class microcontrollers usually need firmware to emit the specified JSON Lines payload over USB serial (115200 baud). A sample AS7341 Arduino/ESP32 sketch is included under `firmware/` (not compiled or tested with hardware here). There is **no automatic hardware driver** and no built-in support for FLIR/RTL-SDR APIs in this initial release.

### Data inputs

- CSV: `frequency_hz,value` or `wavelength_nm,value`. One static spectrum per file; values default to `relative` units. The samples folder contains one example. See [first physical-sensor wiring and firmware](docs/FIRST_SENSOR.md).
- JSONL (one JSON object per newline): `spectrum` or `image` frames. See [`docs/PROTOCOL.md`](docs/PROTOCOL.md).
- USB serial: live newline-delimited JSON `spectrum` or `image` frames. Permission-based, read-only; no commands sent to the device.
- Standard visible-light camera: optional live RGB view, explicitly labeled **not a spectrometer**.

## What v0.1 can and cannot do

| Feature | Status |
|---|---|
| Live simulated electromagnetic spectral data | Working, synthetic and clearly labeled |
| Visible-to-gamma band selector | Approximate categories; ranges are teaching guides, not hard physical borders |
| Real spectrum import CSV/JSONL | Working, basic schema validation |
| Real thermal image-array import | Working for frames with numeric pixel arrays |
| Web Serial ingestion | Implemented for USB CDC/serial devices emitting compatible JSONL; needs real hardware validation |
| False color / waterfall / spectrum chart | Working |
| Export session JSONL / image PNG | Working |
| Genuine UV/IR/RF detection from software alone | Not physically possible |
| Browser access to arbitrary SDR/thermal-camera firmware | Not implemented; requires hardware-specific adapters |
| Absolute radiometric calibration | Not implemented |
| GPS survey maps / automatic spatial reconstruction | Not implemented |
| Raw radioactive dose / human-exposure safety assessment | Not implemented and should not be inferred |

## System pipeline

```
[Sensor/recording] -> [Adapter: JSONL/CSV/WebSerial] -> [Frame validator]
         -> [EM frequency band router] -> [Bounded history buffer]
         -> [Relative false-color plot / spectrogram / 2D pixel image]
         -> [Session export + provenance labels]
```

Data processing functions are hardware-independent in `src/core.mjs`. Renderer is separate (`src/render.mjs`). UI/device code is in `src/app.mjs`.

## Tests

```sh
npm test
```

No dependency installation required (Node 20+ recommended).

## License

MIT, see LICENSE. Prototype by PHI369 Labs. Contributions welcome, but do not present simulations as real measurements.
