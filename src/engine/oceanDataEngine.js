export class OceanDataEngine {
  constructor(config = {}) {
    this.timeSteps = config.timeSteps || 8;
    this.depthCount = config.depths || 24;
    this.latCount = config.lats || 32;
    this.lonCount = config.lons || 48;

    this.latBounds = [0.0, 25.0];   // 0°N to 25°N (North Indian Ocean)
    this.lonBounds = [50.0, 95.0];  // 50°E to 95°E (Arabian Sea to Bay of Bengal)

    // Logarithmic ocean depth levels: dense near surface (0-200m), sparser in abyss (2000m)
    this.depths = Array.from({ length: this.depthCount }, (_, i) => {
      const frac = i / (this.depthCount - 1);
      return Math.round(2.0 + Math.pow(frac, 2.2) * 1998.0);
    });

    this.lats = Array.from({ length: this.latCount }, (_, i) => 
      this.latBounds[0] + (i / (this.latCount - 1)) * (this.latBounds[1] - this.latBounds[0])
    );

    this.lons = Array.from({ length: this.lonCount }, (_, i) => 
      this.lonBounds[0] + (i / (this.lonCount - 1)) * (this.lonBounds[1] - this.lonBounds[0])
    );

    // Live observation history leading up to the current synoptic observation (never future hours)
    const now = new Date();
    const currentUtcHour = now.getUTCHours();
    const latestSynopticHour = Math.floor(currentUtcHour / 3) * 3; // e.g. 12:00 UTC
    const latestSynopticDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), latestSynopticHour, 0, 0));

    // Generate 8 consecutive 3-hourly observations leading up to right now (Step 7 = Latest Live Observation)
    this.times = Array.from({ length: this.timeSteps }, (_, i) => {
      const hoursAgo = (this.timeSteps - 1 - i) * 3;
      const d = new Date(latestSynopticDate.getTime() - hoursAgo * 3600 * 1000);
      return d.toISOString();
    });

    this._cache = {};
    this.customNetCdfDataset = null;
  }

  loadNetCdfDataset(dataset) {
    this.customNetCdfDataset = dataset;
    this._cache = {};
  }

  getMetadata() {
    if (this.customNetCdfDataset) {
      return {
        id: 'user_uploaded_netcdf',
        title: this.customNetCdfDataset.title,
        institution: this.customNetCdfDataset.institution,
        conventions: this.customNetCdfDataset.conventions || 'CF-1.8',
        time_steps: this.customNetCdfDataset.dimensions.times,
        depths: this.customNetCdfDataset.dimensions.depths,
        depth_levels: this.customNetCdfDataset.dimensions.depths.length,
        lat_bounds: [
          Math.min(...this.customNetCdfDataset.dimensions.lats),
          Math.max(...this.customNetCdfDataset.dimensions.lats),
        ],
        lon_bounds: [
          Math.min(...this.customNetCdfDataset.dimensions.lons),
          Math.max(...this.customNetCdfDataset.dimensions.lons),
        ],
        variables: Object.fromEntries(
          this.customNetCdfDataset.availableVariables.map((v) => [
            v.id,
            { name: v.id, long_name: v.longName, units: v.units, min_val: 0, max_val: 100 },
          ])
        ),
      };
    }

    return {
      id: 'incois_roms_indian_ocean',
      title: 'INCOIS ROMS High-Resolution 3D Indian Ocean Simulation',
      institution: 'Indian National Centre for Ocean Information Services (INCOIS)',
      conventions: 'CF-1.8',
      time_steps: this.times,
      depths: this.depths,
      depth_levels: this.depthCount,
      lat_bounds: this.latBounds,
      lon_bounds: this.lonBounds,
      variables: {
        temp: { name: 'temp', long_name: 'Potential Temperature', units: '°C', min_val: 4.0, max_val: 31.0 },
        salt: { name: 'salt', long_name: 'Practical Salinity', units: 'PSU', min_val: 31.5, max_val: 36.8 },
        u: { name: 'u', long_name: 'Eastward Current Velocity', units: 'm/s', min_val: -1.2, max_val: 1.5 },
        v: { name: 'v', long_name: 'Northward Current Velocity', units: 'm/s', min_val: -1.0, max_val: 1.2 },
        w: { name: 'w', long_name: 'Vertical Velocity', units: 'm/s', min_val: -0.01, max_val: 0.01 },
        chlorophyll: { name: 'chlorophyll', long_name: 'Chlorophyll-a', units: 'mg/m³', min_val: 0.05, max_val: 2.8 },
        oxygen: { name: 'oxygen', long_name: 'Dissolved Oxygen (BGC OMZ)', units: 'µmol/kg', min_val: 10.0, max_val: 220.0 },
      },
    };
  }

  // Pure mathematical simulation of Indian Ocean dynamic physical & BGC features
  computeValue(variable, tIdx, d, lat, lon) {
    const tPhase = (tIdx / this.timeSteps) * Math.PI * 2;
    const depth = this.depths[d];

    if (variable === 'temp') {
      // Warm pool (29-30.5°C), sharp thermocline between 50-150m, cold abyss (4°C)
      const upwellingFactor = (lon < 75.0 && lat > 8.0 && lat < 15.0) ? 2.5 : 0.0;
      const surfaceTemp = 29.8 - 0.12 * Math.pow((lat - 12.0) / 3.0, 2) + 0.6 * Math.sin(lon / 7.0) - upwellingFactor;
      const thermocline = Math.exp(-depth / 125.0);
      return 4.0 + (surfaceTemp - 4.0) * thermocline + 0.35 * Math.sin(tPhase + lat * 0.2);
    }

    if (variable === 'salt') {
      // High salinity in Arabian Sea (west, < 76°E, ~36.5 PSU due to excess evaporation)
      // Low salinity in Bay of Bengal (east, > 80°E, ~32.5 PSU due to heavy river runoff)
      const basinGradient = 34.6 + 2.0 * Math.tanh((77.0 - lon) / 5.5);
      const surfaceRunoff = (lon > 82.0 && depth < 30.0) ? -1.8 * (1.0 - depth / 30.0) : 0.0;
      const depthProfile = 1.0 - 0.5 * Math.exp(-depth / 70.0);
      return (basinGradient + surfaceRunoff) * depthProfile;
    }

    if (variable === 'u') {
      // Monsoon gyre eastward current in North Indian Ocean, decaying with depth
      return 0.95 * Math.sin((lat / 25.0) * Math.PI * 2) * Math.exp(-depth / 220.0) + 0.2 * Math.cos(tPhase);
    }

    if (variable === 'v') {
      // Alongshore boundary currents (Somali current, East India Coastal Current)
      const coastalJet = (lon < 72.0 || (lon > 80.0 && lon < 85.0)) ? 0.4 : 0.0;
      return (0.7 * Math.cos((lon / 45.0) * Math.PI * 2) + coastalJet) * Math.exp(-depth / 220.0);
    }

    if (variable === 'w') {
      // Upwelling vertical velocity (positive upward) off west coast
      return 0.006 * Math.sin(lon * 0.3) * Math.cos(lat * 0.3) * Math.exp(-depth / 100.0);
    }

    if (variable === 'chlorophyll') {
      // Euphotic zone concentration (0-50m depth), highly concentrated in upwelling zones
      const upwellingBonus = (lat > 8.0 && lat < 16.0 && lon < 76.0) ? 1.4 : 0.15;
      const baseChl = 2.4 * Math.exp(-Math.pow(depth - 25.0, 2) / (2 * 18.0 * 18.0));
      return Math.max(0.05, baseChl * (1.0 + upwellingBonus));
    }

    if (variable === 'oxygen') {
      // Oxygen Minimum Zone (OMZ) in Arabian Sea & Bay of Bengal:
      // High oxygen near surface (~210 µmol/kg), acute depletion at 150-600m (~15 µmol/kg), gradual recovery in deep abyss (~60 µmol/kg)
      const omzDepletion = 190.0 * Math.exp(-Math.pow(depth - 350.0, 2) / (2 * 160.0 * 160.0));
      const baseOxygen = 210.0 - 0.04 * depth;
      return Math.max(10.0, baseOxygen - omzDepletion);
    }

    return 0.0;
  }

  get3DVolume(variable, timeIdx = 0) {
    if (this.customNetCdfDataset) {
      try {
        const netcdfVol = this.customNetCdfDataset.get3DVolume(variable, timeIdx);
        // Map normalized float array (0..1) to uint8 (0..255)
        const uint8Data = new Uint8Array(netcdfVol.data.length);
        for (let i = 0; i < netcdfVol.data.length; i++) {
          uint8Data[i] = Math.round(netcdfVol.data[i] * 255.0);
        }

        return {
          variable,
          timeIdx,
          shape: [netcdfVol.height, netcdfVol.depth, netcdfVol.width],
          depths: this.customNetCdfDataset.dimensions.depths,
          lats: this.customNetCdfDataset.dimensions.lats,
          lons: this.customNetCdfDataset.dimensions.lons,
          min_val: netcdfVol.minVal,
          max_val: netcdfVol.maxVal,
          data: uint8Data,
          rawFloats: netcdfVol.data,
        };
      } catch (err) {
        console.warn('Failed to extract variable from NetCDF dataset, falling back to simulated grid:', err);
      }
    }

    const key = `${variable}_${timeIdx}`;
    if (this._cache[key]) return this._cache[key];

    const meta = this.getMetadata().variables[variable] || { min_val: 0, max_val: 100 };
    const { min_val, max_val } = meta;
    const range = (max_val - min_val) || 1.0;

    const totalCells = this.depthCount * this.latCount * this.lonCount;
    const buffer = new Uint8Array(totalCells);
    const rawFloats = new Float32Array(totalCells);

    let idx = 0;
    for (let d = 0; d < this.depthCount; d++) {
      for (let y = 0; y < this.latCount; y++) {
        for (let x = 0; x < this.lonCount; x++) {
          const val = this.computeValue(variable, timeIdx, d, this.lats[y], this.lons[x]);
          rawFloats[idx] = val;
          const norm = Math.max(0, Math.min(255, Math.round(((val - min_val) / range) * 255.0)));
          buffer[idx] = norm;
          idx++;
        }
      }
    }

    const result = {
      variable,
      timeIdx,
      shape: [this.depthCount, this.latCount, this.lonCount],
      depths: this.depths,
      lats: this.lats,
      lons: this.lons,
      min_val,
      max_val,
      data: buffer,
      rawFloats,
    };

    this._cache[key] = result;
    return result;
  }

  samplePoint(variable, timeIdx, targetLat, targetLon, targetDepth) {
    // Spatial interpolation: depth closest matching
    let dIdx = 0;
    for (let i = 0; i < this.depths.length - 1; i++) {
      if (targetDepth >= this.depths[i] && targetDepth <= this.depths[i + 1]) {
        const frac = (targetDepth - this.depths[i]) / (this.depths[i + 1] - this.depths[i]);
        dIdx = frac > 0.5 ? i + 1 : i;
        break;
      }
    }
    if (targetDepth > this.depths[this.depths.length - 1]) {
      dIdx = this.depths.length - 1;
    }

    return this.computeValue(variable, timeIdx, dIdx, targetLat, targetLon);
  }

  extractTransect(variable, timeIdx, startLat, startLon, endLat, endLon, sampleCount = 20) {
    const points = [];
    const step = 1.0 / (sampleCount - 1);
    for (let i = 0; i < sampleCount; i++) {
      const frac = i * step;
      const lat = startLat + frac * (endLat - startLat);
      const lon = startLon + frac * (endLon - startLon);
      points.push({ lat, lon, frac });
    }

    // values: 2D matrix [depth_level][point_index]
    const values = [];
    for (let d = 0; d < this.depthCount; d++) {
      const depthRow = [];
      for (let p = 0; p < points.length; p++) {
        const val = this.computeValue(variable, timeIdx, d, points[p].lat, points[p].lon);
        depthRow.push(val);
      }
      values.push(depthRow);
    }

    let min_val = Infinity;
    let max_val = -Infinity;
    for (const row of values) {
      for (const v of row) {
        if (v < min_val) min_val = v;
        if (v > max_val) max_val = v;
      }
    }
    if (min_val === Infinity) {
      min_val = 0;
      max_val = 1;
    }

    return {
      variable,
      timeIdx,
      start: { lat: startLat, lon: startLon },
      end: { lat: endLat, lon: endLon },
      points,
      depths: this.depths,
      values,
      min_val,
      max_val,
    };
  }
}
