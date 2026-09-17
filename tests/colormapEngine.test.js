import { describe, it, expect } from 'vitest';
import { ColormapEngine } from '../src/engine/colormapEngine.js';

describe('ColormapEngine', () => {
  it('lists available oceanographic colormaps', () => {
    const list = ColormapEngine.listPalettes();
    expect(list).toContain('thermal');
    expect(list).toContain('haline');
    expect(list).toContain('deep');
    expect(list).toContain('speed');
    expect(list).toContain('matter');
    expect(list).toContain('chlorophyll');
    expect(list).toContain('balance');
  });

  it('generates 256x4 RGBA Uint8Array LUT', () => {
    const lut = ColormapEngine.getLut('thermal', 256);
    expect(lut).toBeInstanceOf(Uint8Array);
    expect(lut.length).toBe(256 * 4);
    // Thermal Cold (blue/dark) to Warm (red/yellow)
    expect(lut[0]).toBeLessThan(lut[255 * 4]); // Red channel increases
    expect(lut[3]).toBe(255); // Alpha channel is 255
  });

  it('generates smooth interpolated gradients across stops', () => {
    const lut = ColormapEngine.getLut('haline', 256);
    // Check midpoint has non-zero colors
    expect(lut[128 * 4 + 0]).toBeGreaterThan(0);
    expect(lut[128 * 4 + 1]).toBeGreaterThan(0);
    expect(lut[128 * 4 + 2]).toBeGreaterThan(0);
  });
});
