// Cmocean standard oceanographic palette control points [pos, r, g, b]
const PALETTES_DEF = {
  thermal: [
    [0.0, 4, 18, 56],
    [0.2, 33, 85, 155],
    [0.4, 214, 96, 77],
    [0.7, 244, 165, 87],
    [1.0, 255, 245, 180],
  ],
  haline: [
    [0.0, 31, 23, 77],
    [0.25, 45, 92, 140],
    [0.5, 49, 163, 137],
    [0.75, 140, 215, 110],
    [1.0, 246, 240, 140],
  ],
  deep: [
    [0.0, 240, 249, 232],
    [0.3, 186, 228, 188],
    [0.6, 123, 204, 196],
    [0.8, 43, 140, 190],
    [1.0, 8, 64, 129],
  ],
  speed: [
    [0.0, 247, 252, 240],
    [0.25, 204, 235, 197],
    [0.5, 123, 204, 196],
    [0.75, 78, 108, 177],
    [1.0, 8, 29, 88],
  ],
  matter: [
    [0.0, 30, 15, 45],
    [0.3, 130, 37, 100],
    [0.6, 215, 75, 75],
    [0.85, 245, 165, 60],
    [1.0, 255, 250, 190],
  ],
  chlorophyll: [
    [0.0, 15, 25, 35],
    [0.25, 30, 80, 50],
    [0.5, 60, 160, 80],
    [0.75, 140, 220, 100],
    [1.0, 235, 255, 180],
  ],
  balance: [
    [0.0, 34, 102, 172],
    [0.25, 103, 169, 207],
    [0.5, 247, 247, 247],
    [0.75, 239, 138, 98],
    [1.0, 178, 24, 43],
  ],
};

export class ColormapEngine {
  static listPalettes() {
    return Object.keys(PALETTES_DEF);
  }

  /**
   * Generates a 1D RGBA lookup table (LUT) for GPU raymarching
   * @param {string} paletteName 
   * @param {number} samples 
   * @param {Object} options { isReversed: boolean, isLogScale: boolean }
   */
  static getLut(paletteName = 'thermal', samples = 256, options = {}) {
    const { isReversed = false, isLogScale = false } = options;
    const stops = PALETTES_DEF[paletteName] || PALETTES_DEF.thermal;
    const lut = new Uint8Array(samples * 4);

    for (let i = 0; i < samples; i++) {
      let t = i / (samples - 1);

      // Logarithmic transfer function
      if (isLogScale) {
        t = Math.log10(1.0 + 9.0 * t);
      }

      // Colormap reversal
      if (isReversed) {
        t = 1.0 - t;
      }

      t = Math.max(0.0, Math.min(1.0, t));
      
      // Find bounding stops
      let s0 = stops[0];
      let s1 = stops[stops.length - 1];
      for (let s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s][0] && t <= stops[s + 1][0]) {
          s0 = stops[s];
          s1 = stops[s + 1];
          break;
        }
      }

      const segSpan = s1[0] - s0[0] || 1e-6;
      const segFrac = (t - s0[0]) / segSpan;

      const r = Math.round(s0[1] + segFrac * (s1[1] - s0[1]));
      const g = Math.round(s0[2] + segFrac * (s1[2] - s0[2]));
      const b = Math.round(s0[3] + segFrac * (s1[3] - s0[3]));

      lut[i * 4 + 0] = r;
      lut[i * 4 + 1] = g;
      lut[i * 4 + 2] = b;
      lut[i * 4 + 3] = 255;
    }

    return lut;
  }
}
