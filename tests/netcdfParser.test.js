import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NetCdfParser } from '../src/engine/netcdfParser.js';

describe('NetCdfParser', () => {
  it('parses binary CF-1.8 NetCDF ocean model dataset', () => {
    const filePath = path.resolve(__dirname, '../public/data/incois_roms_sample.nc');
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const dataset = NetCdfParser.parse(arrayBuffer);

    expect(dataset.title).toContain('INCOIS');
    expect(dataset.conventions).toBe('CF-1.8');
    expect(dataset.dimensions.depths.length).toBe(12);
    expect(dataset.dimensions.lats.length).toBe(16);
    expect(dataset.dimensions.lons.length).toBe(24);
    expect(dataset.dimensions.times.length).toBe(4);

    const varIds = dataset.availableVariables.map((v) => v.id);
    expect(varIds).toContain('temp');
    expect(varIds).toContain('salt');
    expect(varIds).toContain('chlorophyll');
    expect(varIds).toContain('oxygen');

    // Extract 3D volume for temperature
    const vol = dataset.get3DVolume('temp', 0);
    expect(vol.data.length).toBe(12 * 16 * 24);
    expect(vol.minVal).toBeGreaterThanOrEqual(3.5);
    expect(vol.maxVal).toBeLessThanOrEqual(32.0);

    // Verify all normalized values are within [0, 1]
    for (let i = 0; i < vol.data.length; i++) {
      expect(vol.data[i]).toBeGreaterThanOrEqual(0.0);
      expect(vol.data[i]).toBeLessThanOrEqual(1.0);
    }
  });
});
