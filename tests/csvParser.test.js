import { describe, it, expect } from 'vitest';
import { CsvParser } from '../src/engine/csvParser.js';

describe('CsvParser', () => {
  it('parses comma-delimited in-situ profile data', () => {
    const csvContent = `depth_m,temp_c,salinity_psu,oxygen_umol,lat,lon
5.0,29.4,34.2,210.0,12.5,75.0
25.0,28.8,34.5,205.0,12.5,75.0
100.0,21.0,35.2,80.0,12.5,75.0
500.0,10.2,35.0,22.0,12.5,75.0
1000.0,6.8,34.8,40.0,12.5,75.0`;

    const parsed = CsvParser.parse(csvContent, 'CTD');

    expect(parsed.instrument_type).toBe('CTD');
    expect(parsed.latitude).toBe(12.5);
    expect(parsed.longitude).toBe(75.0);
    expect(parsed.profile.length).toBe(5);
    expect(parsed.profile[0].depth).toBe(5.0);
    expect(parsed.profile[0].temp).toBe(29.4);
    expect(parsed.profile[0].oxygen).toBe(210.0);
    expect(parsed.profile[4].depth).toBe(1000.0);
  });

  it('handles tab-delimited text and header variations', () => {
    const tsvContent = `PRES\tTE90\tPSAL\tSTATION\tLATITUDE\tLONGITUDE
10.0\t28.5\t35.5\tWMO-2903088\t15.2\t69.4
50.0\t26.0\t35.8\tWMO-2903088\t15.2\t69.4
200.0\t15.4\t35.2\tWMO-2903088\t15.2\t69.4`;

    const parsed = CsvParser.parse(tsvContent, 'ARGO');

    expect(parsed.platform_id).toBe('WMO-2903088');
    expect(parsed.latitude).toBe(15.2);
    expect(parsed.longitude).toBe(69.4);
    expect(parsed.profile.length).toBe(3);
    expect(parsed.profile[1].temp).toBe(26.0);
  });
});
