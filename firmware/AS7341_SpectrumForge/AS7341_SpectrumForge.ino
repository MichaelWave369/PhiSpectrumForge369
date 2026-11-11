/*
  Phi SpectrumForge369 USB optical-sensor bridge (Arduino / ESP32 compatible)
  Requires Adafruit AS7341 + Adafruit BusIO libraries.
  Connect AS7341 via I2C per your board's approved pinout.
  Streams JSON Lines at 115200 baud for the SpectrumForge Web Serial adapter.
  PROTOTYPE: Physical sensor readings are raw ADC counts, NOT radiometrically calibrated.
  The last 910-nm label is a DISPLAY PLACEHOLDER for a broad NIR channel,
  NOT a true narrowband response centered at 910 nm.
*/
#include <Wire.h>
#include <Adafruit_AS7341.h>

Adafruit_AS7341 sensor;

const uint16_t displayNm[] = {415, 445, 480, 515, 555, 590, 630, 680, 910};
const as7341_color_channel_t channels[] = {
  AS7341_CHANNEL_415nm_F1,
  AS7341_CHANNEL_445nm_F2,
  AS7341_CHANNEL_480nm_F3,
  AS7341_CHANNEL_515nm_F4,
  AS7341_CHANNEL_555nm_F5,
  AS7341_CHANNEL_590nm_F6,
  AS7341_CHANNEL_630nm_F7,
  AS7341_CHANNEL_680nm_F8,
  AS7341_CHANNEL_NIR
};

void setup() {
  Serial.begin(115200);
  Wire.begin();
  if (!sensor.begin()) {
    // No malformed streaming JSON. Halt until user checks wiring.
    while (true) delay(1000);
  }
  sensor.setATIME(100);
  sensor.setASTEP(999);
  sensor.setGain(AS7341_GAIN_256X);
}

void loop() {
  if (!sensor.readAllChannels()) {
    delay(250);
    return;
  }
  Serial.print("{\"type\":\"spectrum\",\"source\":\"AS7341 I2C (RAW)\",\"wavelengths_nm\":[");
  for (unsigned i=0; i<9; ++i) {
    if (i) Serial.print(',');
    Serial.print(displayNm[i]);
  }
  Serial.print("],\"values\":[");
  for (unsigned i=0; i<9; ++i) {
    if (i) Serial.print(',');
    Serial.print(sensor.getChannel(channels[i]));
  }
  Serial.println("],\"unit\":\"raw ADC counts\",\"nir_note\":\"broad NIR channel; 910nm display position approximate\"}");
  delay(175);
}
