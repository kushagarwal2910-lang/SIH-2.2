import { NetCDFReader } from 'netcdfjs';

/**
 * NetCdfParser: Client-side browser-native binary NetCDF (CF-compliant) parser.
 * Handles ocean model variables (ROMS, NEMO, HYCOM, INCOIS GODAS).
 */
export class NetCdfParser {
  /**
   * Parse a NetCDF file from an ArrayBuffer
   * @param {ArrayBuffer} buffer
   * @returns {Object} Parsed dataset with metadata, dimension axes, and 3D volume extractor
   */
  static parse(buffer) {
    const reader = new NetCDFReader(buffer);

    // 1. Extract Global Attributes & CF Conventions
    const globalAttrs = {};
    if (reader.globalAttributes) {
      reader.globalAttributes.forEach((attr) => {
        globalAttrs[attr.name] = attr.value;
      });
    }

    // 2. Identify Dimension Axes
    const dimNames = reader.dimensions.map((d) => d.name.toLowerCase());
    const findVar = (...candidates) => {
      for (const cand of candidates) {
        const v = reader.variables.find((item) => item.name.toLowerCase() === cand.toLowerCase());
        if (v) return v;
      }
      return null;
    };

    const latVar = findVar('lat', 'latitude', 'nav_lat', 'y');
    const lonVar = findVar('lon', 'longitude', 'nav_lon', 'x');
    const depthVar = findVar('depth', 'level', 'lev', 'z', 'depth_surface', 'ocean_depth');
    const timeVar = findVar('time', 'ocean_time', 't');

    // Extract coordinate values
    const lats = latVar ? Array.from(reader.getDataVariable(latVar.name)) : [0, 25];
    const lons = lonVar ? Array.from(reader.getDataVariable(lonVar.name)) : [50, 95];
    const depths = depthVar ? Array.from(reader.getDataVariable(depthVar.name)) : [0, 50, 100, 200, 500, 1000, 2000];
    const timesRaw = timeVar ? Array.from(reader.getDataVariable(timeVar.name)) : [0];

    // 3. Catalog Ocean Model Variables
    const standardVars = {};
    const varCatalog = [];

    const recognizedKeys = {
      temp: ['temp', 'temperature', 'pot_temp', 'thetao', 'votemper', 'sst'],
      salt: ['salt', 'salinity', 'so', 'vosaline', 'sss'],
      u: ['u', 'uo', 'u_current', 'eastward_velocity', 'vozocrtx'],
      v: ['v', 'vo', 'v_current', 'northward_velocity', 'vomecrty'],
      w: ['w', 'wo', 'vertical_velocity', 'vovecrtz'],
      chlorophyll: ['chlorophyll', 'chl', 'chla', 'chlorophyll_a'],
      oxygen: ['oxygen', 'o2', 'dox', 'dissolved_oxygen'],
    };

    reader.variables.forEach((v) => {
      const vName = v.name.toLowerCase();
      // Skip 1D coordinate axes
      if (['lat', 'lon', 'latitude', 'longitude', 'depth', 'level', 'time'].includes(vName)) return;

      // Find attribute info
      const attrs = {};
      if (v.attributes) {
        v.attributes.forEach((a) => (attrs[a.name] = a.value));
      }

      let canonicalName = v.name;
      for (const [key, aliases] of Object.entries(recognizedKeys)) {
        if (aliases.includes(vName) || aliases.some((a) => vName.includes(a))) {
          canonicalName = key;
          break;
        }
      }

      standardVars[canonicalName] = {
        originalName: v.name,
        canonicalName,
        dimensions: v.dimensions,
        units: attrs.units || attrs.unit || '',
        long_name: attrs.long_name || v.name,
      };

      varCatalog.push({
        id: canonicalName,
        name: v.name,
        longName: attrs.long_name || v.name,
        units: attrs.units || '',
      });
    });

    return {
      title: globalAttrs.title || 'INCOIS Ocean Numerical Simulation',
      institution: globalAttrs.institution || 'INCOIS (Ministry of Earth Sciences)',
      conventions: globalAttrs.Conventions || 'CF-1.8',
      dimensions: {
        depths,
        lats,
        lons,
        times: timesRaw.map((t, idx) => `T+${idx * 6}h (Step ${idx + 1})`),
      },
      availableVariables: varCatalog,
      /**
       * Extract a 3D volume as normalized Float32Array suitable for WebGL2 Data3DTexture
       */
      get3DVolume: (canonicalOrRawName, timeStep = 0) => {
        const vInfo = standardVars[canonicalOrRawName] || 
          Object.values(standardVars).find((item) => item.originalName === canonicalOrRawName);
        
        if (!vInfo) {
          throw new Error(`Variable ${canonicalOrRawName} not found in NetCDF dataset.`);
        }

        const rawData = reader.getDataVariable(vInfo.originalName);
        const depthLen = depths.length;
        const latLen = lats.length;
        const lonLen = lons.length;
        const volumeSize = depthLen * latLen * lonLen;

        // Calculate offset if 4D [time, depth, lat, lon]
        const offset = timeStep * volumeSize;
        const subData = rawData.subarray ? rawData.subarray(offset, offset + volumeSize) : rawData.slice(offset, offset + volumeSize);

        // Find min and max for normalization
        let minVal = Infinity;
        let maxVal = -Infinity;
        for (let i = 0; i < subData.length; i++) {
          const val = subData[i];
          // Handle missing / fill values (-999, 1e20, NaN)
          if (!isNaN(val) && val > -900 && val < 1e15) {
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
          }
        }

        if (minVal === Infinity) {
          minVal = 0;
          maxVal = 1;
        }

        const range = maxVal - minVal || 1.0;
        const normalized = new Float32Array(volumeSize);

        for (let i = 0; i < volumeSize; i++) {
          const val = subData[i];
          if (isNaN(val) || val < -900 || val > 1e15) {
            normalized[i] = 0.0;
          } else {
            normalized[i] = Math.max(0.0, Math.min(1.0, (val - minVal) / range));
          }
        }

        return {
          data: normalized,
          width: lonLen,
          height: depthLen,
          depth: latLen,
          minVal,
          maxVal,
          units: vInfo.units,
          variableName: vInfo.canonicalName,
        };
      },
    };
  }
}
