import { describe, it, expect } from 'vitest';
import { OceanDataEngine } from '../src/engine/oceanDataEngine.js';

describe('OceanDataEngine', () => {
  const engine = new OceanDataEngine({
    timeSteps: 4,
    depths: 16,
    lats: 24,
    lons: 32,
  });

  it('generates CF-compliant metadata with all primary oceanographic variables', () => {
    const meta = engine.getMetadata();
    expect(meta.title).toContain('INCOIS');
    expect(meta.conventions).toBe('CF-1.8');
    expect(meta.variables).toHaveProperty('temp');
    expect(meta.variables).toHaveProperty('salt');
    expect(meta.variables).toHaveProperty('chlorophyll');
    expect(meta.variables).toHaveProperty('u');
    expect(meta.variables).toHaveProperty('v');
    expect(meta.variables).toHaveProperty('w');
    expect(meta.depth_levels).toBe(16);
    expect(meta.time_steps.length).toBe(4);
  });

  it('extracts quantized Uint8 3D volume buffer for WebGL 3D texture', () => {
    const vol = engine.get3DVolume('temp', 0);
    expect(vol.shape).toEqual([16, 24, 32]);
    expect(vol.data).toBeInstanceOf(Uint8Array);
    expect(vol.data.length).toBe(16 * 24 * 32);
    expect(vol.min_val).toBeLessThan(vol.max_val);
  });

  it('interpolates point value at exact continuous coordinate', () => {
    const val = engine.samplePoint('temp', 0, 12.0, 75.0, 50.0);
    expect(val).toBeGreaterThan(15.0);
    expect(val).toBeLessThan(32.0);
  });

  it('correctly models Arabian Sea high salinity vs Bay of Bengal low salinity', () => {
    // Arabian Sea (west, lon 65) vs Bay of Bengal (east, lon 88) at surface (depth 5m)
    const saltAS = engine.samplePoint('salt', 0, 15.0, 65.0, 5.0);
    const saltBOB = engine.samplePoint('salt', 0, 15.0, 88.0, 5.0);
    expect(saltAS).toBeGreaterThan(saltBOB);
  });

  it('extracts arbitrary vertical cross-section ocean transect matrix', () => {
    const transect = engine.extractTransect('temp', 0, 18.9, 72.8, 4.2, 73.5, 20);
    expect(transect.points.length).toBe(20);
    expect(transect.values.length).toBe(16); // 16 depth levels
    expect(transect.values[0].length).toBe(20); // 20 points along route
    expect(transect.start.lat).toBe(18.9);
  });
});
