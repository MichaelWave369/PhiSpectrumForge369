# Connect the first real sensor: AS7341 optical spectral channels

Goal: get actual per-channel optical measurements from a physical detector, rather than any simulated artwork. This is a sensible first instrument because it operates at low voltages and has well-supported I2C maker interfaces.

## Needed

- A commercial **AS7341 spectral sensor breakout**, compatible with the Adafruit Arduino library
- An **Arduino-compatible microcontroller** with USB serial (ESP32 is also suitable if the board exposes a USB serial port)
- USB data cable, I2C jumper wires or compatible STEMMA QT cable
- Arduino IDE, libraries **Adafruit AS7341** and **Adafruit BusIO**

## Steps

1. Connect sensor VIN/GND/SDA/SCL to the controller using the breakout manufacturer's instructions. I2C address is usually `0x39`. Check voltage levels for your exact board, not just this guide.
2. Upload `firmware/AS7341_SpectrumForge/AS7341_SpectrumForge.ino` through Arduino IDE.
3. Close Arduino Serial Monitor, because the browser must claim the same port.
4. Start the included Python web server (`python -m http.server 8765`); visit `http://localhost:8765` in a recent compatible Chrome or Edge desktop browser.
5. Select **CONNECT SERIAL SENSOR**, approve the USB serial port. The app expects **115200 baud** and newline-delimited JSON objects. View the **VISIBLE** band or **INFRARED** to see raw values.

## What counts as a genuine measurement?

The AS7341 has eight distinct filtered optical channels in the visible range, a broad near-infrared channel, a clear channel, and flicker analysis. The graph places each channel near its nominal/illustrative center frequency; it cannot honestly reconstruct a full, narrowband, continuous spectrum between those channels. This starter firmware puts the broad NIR response at an **approximate 910 nm display coordinate**, strictly for browsing. The raw numbers are ADC counts, not calibrated irradiance. For spectral inference, calibration must account for channel response curves, integration time, sensor gain, dark readings, and ambient illumination.

It does **not** detect long-wave thermal infrared, true X-rays, gamma rays, or an arbitrary invisible "aura". For temperature images, use a separate calibrated thermal camera and adapter; for radio, an SDR; for other wavelengths, matching certified detectors.

This sketch uses documented methods `readAllChannels()` and `getChannel()` from Adafruit's AS7341 Arduino library. **No hardware-compiler build or physical sensor validation has been performed in this environment.**

Reference: https://learn.adafruit.com/adafruit-as7341-10-channel-light-color-sensor-breakout/arduino
