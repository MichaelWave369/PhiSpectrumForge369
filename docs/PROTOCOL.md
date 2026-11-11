# SpectrumForge369 streaming protocol v0.1

**Transport:** UTF-8 JSON Lines (one JSON object per line) via serial at **115200 baud**; the same messages may be imported in `.jsonl` files. Numeric units are explicit. No JavaScript-specific binary protocol required.

## Frequency spectrum frame

```json
{"type":"spectrum","source":"SDR-RX","timestamp":"2026-11-10T23:00:00Z","frequencies_hz":[100000000,100100000,100200000],"values":[-72,-45,-67],"unit":"dBm"}
```

Arrays are sorted by frequency internally. The UI groups bins by approximate EM band. A dense SDR spectrum may use up to 8192 bins per frame. A CSV may contain `frequency_hz,value` or `wavelength_nm,value` with a header. `wavelengths_nm` can replace `frequencies_hz` in JSONL; wavelengths are converted using `f = c / λ`.

Near-IR multispectral optical sensor example (illustrative values, **not an actual capture**):

```json
{"type":"spectrum","source":"AS7341-EXAMPLE","wavelengths_nm":[415,445,480,515,555,590,630,680,910],"values":[120,180,204,218,232,205,170,153,64],"unit":"raw counts"}
```

AS7341 samples several **wide, calibrated response channels**, not a continuous high-resolution spectrum; central wavelengths here are convenient labels, not claims of delta-function bandwidth. If using its readings quantitatively, preserve calibration/metadata and refer to the sensor's actual filter curves.

## Pixel-array image frame

```json
{"type":"image","source":"THERMAL-MODULE","band":"infrared","width":2,"height":2,"pixels":[24.8,25.4,32.1,27.2],"unit":"°C"}
```

Pixel sequence is **row-major**, top-left first. Up to 2 million pixels in a single frame; large frame transport is better handled by a binary or network adapter in a later version. Values must be finite numbers, not null or NaN. For a temperature image, temperature accuracy is the responsibility of the calibrated detector and driver.

## Sensor semantics and integrity

`origin` is **assigned by the runtime** as `simulation`, `serial`, or `file`, not trusted from incoming JSON. A file can only prove a user supplied those numbers, not that a sensor genuinely recorded them. Each frame also has the sensor-provided freeform `source` label. Production deployment should add device identification, raw unmodified frames, calibration version, timestamps, units, checksums, and signature verification where feasible.

The current visualization rescales each spectral frame's value range for contrast; it must **not** be interpreted as an absolute signal intensity or health/safety threshold. The bands are approximate. The display palette is a visualization aid and says nothing about the actual color of non-visible radiation.

## Hardware bridge suggestions

- **Optical near-visible:** AS7341 + microcontroller over USB Serial JSONL; sensor covers visible channels plus near IR, not the full ultraviolet or infrared band.
- **Thermal imaging:** radiometric FLIR Lepton + compatible microcontroller/USB bridge that exports 2D pixels as `image` frames.
- **Radio:** SDR acquisition process/firmware that computes FFT bins and emits `spectrum` frames; USB-SDR hardware commonly needs a native-process adapter rather than direct Web Serial.
- **UV, X-ray, gamma:** only with dedicated compliant instruments and their approved acquisition software; never infer them from RGB/thermal images or synthesize measurements without explicitly labeling them.

## Known limitations

No waveform digital signal processing/FFT on IQ files yet; no detector calibration routines; no cross-instrument clock synchronization; no spatial registration between visible and thermal image sensors; no active spectral illumination or radiation-generation control. No hardware vendor driver is bundled.
