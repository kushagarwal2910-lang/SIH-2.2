import { describe, it, expect } from 'vitest';
import { OgcService } from '../src/engine/ogcService.js';
import { OceanDataEngine } from '../src/engine/oceanDataEngine.js';

describe('OgcService', () => {
  it('generates compliant OGC WMS 1.3.0 GetCapabilities XML', () => {
    const engine = new OceanDataEngine();
    const xml = OgcService.generateWmsCapabilities(engine.getMetadata());

    expect(xml).toContain('<WMS_Capabilities version="1.3.0"');
    expect(xml).toContain('INCOIS');
    expect(xml).toContain('<Layer');
    expect(xml).toContain('<CRS>EPSG:4326</CRS>');
    expect(xml).toContain('<Name>temp</Name>');
    expect(xml).toContain('<Name>salt</Name>');
  });

  it('exports in-situ observing network to valid GeoJSON', () => {
    const mockInstruments = [
      {
        platform_id: 'OMNI-BD08',
        instrument_type: 'MOORING',
        latitude: 18.2,
        longitude: 89.7,
        basin: 'Bay of Bengal',
      },
      {
        platform_id: 'ARGO-2903088',
        instrument_type: 'ARGO',
        latitude: 9.8,
        longitude: 72.1,
        basin: 'Arabian Sea',
      },
    ];

    const geoJsonStr = OgcService.exportGeoJson(mockInstruments);
    const parsed = JSON.parse(geoJsonStr);

    expect(parsed.type).toBe('FeatureCollection');
    expect(parsed.features.length).toBe(2);
    expect(parsed.features[0].geometry.coordinates[0]).toBe(89.7);
    expect(parsed.features[0].geometry.coordinates[1]).toBe(18.2);
    expect(parsed.features[0].properties.platform_id).toBe('OMNI-BD08');
  });

  it('generates CF-1.8 metadata report text', () => {
    const engine = new OceanDataEngine();
    const report = OgcService.generateCfMetadataReport(engine.getMetadata());

    expect(report).toContain('NetCDF-CF Convention v1.8');
    expect(report).toContain('INCOIS');
    expect(report).toContain('North Indian Ocean');
  });
});
