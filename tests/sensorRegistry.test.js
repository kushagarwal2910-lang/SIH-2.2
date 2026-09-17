import { describe, it, expect } from 'vitest';
import { SensorRegistry } from '../src/engine/sensorRegistry.js';

describe('SensorRegistry', () => {
  it('registers observing platform types and loads observations', () => {
    const registry = new SensorRegistry();

    expect(registry.getTypeConfig('ARGO').name).toContain('Argo');
    expect(registry.getTypeConfig('MOORING').name).toContain('OMNI');
    expect(registry.getTypeConfig('CTD').name).toContain('CTD');

    registry.load([
      { platform_id: 'OMNI-BD11', latitude: 13.5, longitude: 84.0, instrument_type: 'MOORING' },
      { platform_id: 'ARGO-01', latitude: 10.0, longitude: 70.0, instrument_type: 'ARGO' },
      { platform_id: 'CTD-SK01', latitude: 15.0, longitude: 74.0, instrument_type: 'CTD' },
    ]);

    expect(registry.getAll().length).toBe(3);
    expect(registry.getByType('MOORING').length).toBe(1);
    expect(registry.getByType('MOORING')[0].platform_id).toBe('OMNI-BD11');
    expect(registry.getByType('CTD').length).toBe(1);
  });
});
