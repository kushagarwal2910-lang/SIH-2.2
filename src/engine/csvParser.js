/**
 * CsvParser: Ingests delimited text (CSV, TSV) for in-situ ocean instruments
 * Handles WMO standard Argo profiles, INCOIS Glider dive logs, and CTD hydrographic stations.
 */
export class CsvParser {
  /**
   * Auto-detects delimiter and parses CSV text into structured observation profiles
   * @param {string} text
   * @param {string} instrumentTypeHint 'ARGO' | 'GLIDER' | 'CTD' | 'MOORING'
   * @returns {Object} Structured instrument object with metadata and profile array
   */
  static parse(text, instrumentTypeHint = 'ARGO') {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row.');
    }

    // Detect delimiter: comma, tab, or semicolon
    const headerLine = lines[0];
    const delim = [',', '\t', ';'].reduce((best, d) => 
      (headerLine.split(d).length > headerLine.split(best).length ? d : best), ','
    );

    const headers = headerLine.split(delim).map((h) => h.trim().toLowerCase().replace(/["']/g, ''));

    // Map common oceanographic column header aliases
    const findCol = (...aliases) => {
      for (const a of aliases) {
        const idx = headers.findIndex((h) => h === a || h.includes(a));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const depthIdx = findCol('depth', 'pres', 'pressure', 'dep', 'z');
    const tempIdx = findCol('temp', 'temperature', 'pot_temp', 'te90', 't_c');
    const saltIdx = findCol('salt', 'salinity', 'psal', 'sss', 'psu');
    const chlIdx = findCol('chlorophyll', 'chl', 'chla', 'fluorescence');
    const oxyIdx = findCol('oxygen', 'dox', 'dox2', 'dissolved_oxygen', 'o2');
    const latIdx = findCol('lat', 'latitude', 'y');
    const lonIdx = findCol('lon', 'longitude', 'long', 'x');
    const timeIdx = findCol('time', 'timestamp', 'datetime', 'date');
    const idIdx = findCol('platform_id', 'wmo_id', 'float_id', 'station', 'id');

    if (depthIdx === -1 && (tempIdx === -1 || saltIdx === -1)) {
      throw new Error('CSV must contain a depth column and at least temperature or salinity data.');
    }

    const rows = [];
    let detectedLat = 12.0;
    let detectedLon = 75.0;
    let detectedId = `INCOIS-CSV-${Math.floor(100000 + Math.random() * 900000)}`;
    let detectedTime = new Date().toISOString();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delim).map((p) => p.trim().replace(/["']/g, ''));
      if (parts.length < headers.length * 0.6) continue;

      const depth = depthIdx !== -1 ? parseFloat(parts[depthIdx]) : NaN;
      const temp = tempIdx !== -1 ? parseFloat(parts[tempIdx]) : NaN;
      const salt = saltIdx !== -1 ? parseFloat(parts[saltIdx]) : NaN;
      const chlorophyll = chlIdx !== -1 ? parseFloat(parts[chlIdx]) : undefined;
      const oxygen = oxyIdx !== -1 ? parseFloat(parts[oxyIdx]) : undefined;

      if (!isNaN(depth) && (!isNaN(temp) || !isNaN(salt))) {
        rows.push({
          depth: Math.abs(depth),
          temp: isNaN(temp) ? null : temp,
          salt: isNaN(salt) ? null : salt,
          chlorophyll: isNaN(chlorophyll) ? null : chlorophyll,
          oxygen: isNaN(oxygen) ? null : oxygen,
          qc: 1,
        });
      }

      if (latIdx !== -1 && !isNaN(parseFloat(parts[latIdx]))) detectedLat = parseFloat(parts[latIdx]);
      if (lonIdx !== -1 && !isNaN(parseFloat(parts[lonIdx]))) detectedLon = parseFloat(parts[lonIdx]);
      if (idIdx !== -1 && parts[idIdx]) detectedId = parts[idIdx];
      if (timeIdx !== -1 && parts[timeIdx]) detectedTime = parts[timeIdx];
    }

    // Sort profile ascending by depth
    rows.sort((a, b) => a.depth - b.depth);

    return {
      platform_id: detectedId,
      wmo_id: detectedId,
      instrument_type: instrumentTypeHint,
      latitude: detectedLat,
      longitude: detectedLon,
      timestamp: detectedTime,
      basin: detectedLon < 78.0 ? 'Arabian Sea' : 'Bay of Bengal',
      profile: rows,
      summary: {
        minDepth: rows[0]?.depth ?? 0,
        maxDepth: rows[rows.length - 1]?.depth ?? 0,
        levels: rows.length,
      },
    };
  }
}
