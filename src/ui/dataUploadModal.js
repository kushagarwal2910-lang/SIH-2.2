import { NetCdfParser } from '../engine/netcdfParser.js';
import { CsvParser } from '../engine/csvParser.js';
import { LiveApiService } from '../engine/liveApiService.js';

export class DataUploadModal {
  static show(onNewInstrumentLoaded, onNewModelLoaded) {
    const modalRoot = document.getElementById('modal-container');

    modalRoot.innerHTML = `
      <div id="upload-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
        <div class="relative w-full max-w-2xl glass-panel rounded-2xl p-6 text-white shadow-2xl border border-slate-700">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xl">
                📥
              </div>
              <div>
                <h3 class="font-bold text-sm tracking-wide text-white">Multi-Format Ocean Data Ingestion</h3>
                <p class="text-[11px] text-slate-400">Automated CF-compliant NetCDF (.nc), CSV in-situ profiles & JSON ingestion</p>
              </div>
            </div>
            <button id="btn-close-upload" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer text-lg">
              ✕
            </button>
          </div>

          <!-- Format Selector Badges -->
          <div class="flex gap-2 my-3">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
              ⚡ NetCDF-3 / NetCDF-4 (.nc)
            </span>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">
              📊 CSV / WMO Delimited Text
            </span>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-950/80 border border-purple-500/40 text-purple-300">
              🌐 GeoJSON / WMO JSON
            </span>
          </div>

          <!-- Drag and drop zone -->
          <div id="drop-zone" class="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-xl p-6 text-center cursor-pointer transition bg-slate-900/60 hover:bg-slate-800/40 flex flex-col items-center justify-center">
            <div class="text-3xl mb-2">📂</div>
            <p class="text-xs font-semibold text-slate-200">Drag & Drop your NetCDF (.nc), CSV or JSON file here</p>
            <p class="text-[10px] text-slate-400 mt-1">Supports INCOIS ROMS/NEMO model fields, Argo profiles, OMNI buoys, and Glider dive logs</p>
            <input id="file-input" type="file" accept=".nc,.cdf,.csv,.txt,.json" class="hidden">
          </div>

          <!-- Upload Status Indicator -->
          <div id="upload-status" class="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono hidden"></div>

          <!-- Quick Evaluation Presets -->
          <div class="mt-4 space-y-2">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">One-Click Operational Data Presets:</span>
            
            <button id="btn-sample-netcdf" class="w-full p-2.5 rounded-xl bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/50 hover:border-cyan-400 text-left transition cursor-pointer flex items-center justify-between shadow-md">
              <div class="flex items-center gap-2.5">
                <span class="text-xl">⚡</span>
                <div>
                  <div class="font-bold text-xs text-cyan-300">Load INCOIS ROMS NetCDF Model File (.nc)</div>
                  <div class="text-[10px] text-slate-400">CF-1.8 Compliant 4D Grid (Time, Depth, Lat, Lon, Temp, Salinity, U, Chl, O₂)</div>
                </div>
              </div>
              <span class="px-2 py-1 rounded text-[10px] font-bold bg-cyan-500 text-slate-950">Ingest .nc ➔</span>
            </button>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <button id="btn-sample-omni" class="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-red-500/60 text-left transition cursor-pointer flex flex-col">
                <span class="font-semibold text-red-400">🔴 Deploy OMNI Moored Buoy (BD11)</span>
                <span class="text-[10px] text-slate-400 mt-1">Bay of Bengal Cyclone Corridor (13.5°N, 84.0°E)</span>
              </button>
              <button id="btn-sample-ctd" class="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/60 text-left transition cursor-pointer flex flex-col">
                <span class="font-semibold text-purple-400">🟣 Deploy Sagar Kanya CTD Cast</span>
                <span class="text-[10px] text-slate-400 mt-1">Malabar Upwelling Station (10.5°N, 75.2°E)</span>
              </button>
              <button id="btn-sample-argo" class="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 text-left transition cursor-pointer flex flex-col">
                <span class="font-semibold text-amber-400">🟡 Deploy Live Argo Float (2903088)</span>
                <span class="text-[10px] text-slate-400 mt-1">Lakshadweep Deep Sea (9.8°N, 72.1°E)</span>
              </button>
              <button id="btn-sample-glider" class="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/60 text-left transition cursor-pointer flex flex-col">
                <span class="font-semibold text-cyan-400">🔵 Deploy Underwater Glider</span>
                <span class="text-[10px] text-slate-400 mt-1">Andaman Deep Basin Sawtooth Mission</span>
              </button>
            </div>
          </div>

          <!-- Live Public Ocean APIs Section (Zero Key • 100% Free) -->
          <div class="mt-4 p-3 bg-slate-900/90 rounded-xl border border-cyan-500/30 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🌐</span> Live Public Ocean APIs (Zero Key • 100% Free)
              </span>
              <span class="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                10k calls/day Fair Use
              </span>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-xs">
              <button id="btn-live-argo-api" class="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 text-left transition cursor-pointer flex flex-col group">
                <span class="font-semibold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                  <span>📡</span> Stream Real INCOIS Argo (ERDDAP)
                </span>
                <span class="text-[10px] text-slate-400 mt-1">Queries active Indian Ocean floats directly from Global GDAC</span>
              </button>
              
              <button id="btn-live-marine-api" class="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/60 text-left transition cursor-pointer flex flex-col group">
                <span class="font-semibold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                  <span>🌊</span> Stream Live Currents & Waves (Copernicus)
                </span>
                <span class="text-[10px] text-slate-400 mt-1">Real-time ECMWF/Copernicus currents for 7 Indian coastal ports</span>
              </button>
            </div>
            <div id="live-api-status" class="hidden text-[10px] font-mono p-2 rounded bg-slate-950/80 border border-slate-800 text-slate-300"></div>
          </div>
        </div>
      </div>
    `;

    const closeUpload = () => {
      modalRoot.innerHTML = '';
    };

    document.getElementById('btn-close-upload').addEventListener('click', closeUpload);
    document.getElementById('upload-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'upload-backdrop') closeUpload();
    });

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const statusEl = document.getElementById('upload-status');

    const showStatus = (msg, isError = false) => {
      statusEl.className = `mt-3 p-2.5 rounded-lg border text-[11px] font-mono ${
        isError ? 'bg-red-950/80 border-red-800 text-red-300' : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
      }`;
      statusEl.innerHTML = msg;
      statusEl.classList.remove('hidden');
    };

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-cyan-400', 'bg-slate-800/80');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-cyan-400', 'bg-slate-800/80');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-cyan-400', 'bg-slate-800/80');
      if (e.dataTransfer.files?.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    const handleFile = (file) => {
      const fileName = file.name.toLowerCase();

      // 1. NetCDF Binary Ingestion
      if (fileName.endsWith('.nc') || fileName.endsWith('.cdf')) {
        showStatus(`Parsing CF-compliant NetCDF binary: ${file.name}...`);
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsedDataset = NetCdfParser.parse(ev.target.result);
            showStatus(`✅ Successfully parsed NetCDF: ${parsedDataset.title} with ${parsedDataset.availableVariables.length} variables.`);
            if (onNewModelLoaded) onNewModelLoaded(parsedDataset);
            setTimeout(closeUpload, 1500);
          } catch (err) {
            showStatus(`❌ NetCDF Parse Error: ${err.message}`, true);
          }
        };
        reader.readAsArrayBuffer(file);
        return;
      }

      // 2. CSV / Delimited In-Situ Ingestion
      if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        showStatus(`Parsing in-situ observation profile: ${file.name}...`);
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsedInst = CsvParser.parse(ev.target.result, 'CSV_STATION');
            showStatus(`✅ Ingested profile: ${parsedInst.platform_id} (${parsedInst.profile.length} depth levels, Lat: ${parsedInst.latitude}°N, Lon: ${parsedInst.longitude}°E)`);
            if (onNewInstrumentLoaded) onNewInstrumentLoaded([parsedInst], 'CSV');
            setTimeout(closeUpload, 1500);
          } catch (err) {
            showStatus(`❌ CSV Parse Error: ${err.message}`, true);
          }
        };
        reader.readAsText(file);
        return;
      }

      // 3. JSON Ingestion
      if (fileName.endsWith('.json')) {
        showStatus(`Parsing JSON instrument dataset...`);
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target.result);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            showStatus(`✅ Loaded ${list.length} observation platform(s).`);
            if (onNewInstrumentLoaded) onNewInstrumentLoaded(list, 'JSON');
            setTimeout(closeUpload, 1200);
          } catch (err) {
            showStatus(`❌ JSON Error: ${err.message}`, true);
          }
        };
        reader.readAsText(file);
        return;
      }

      showStatus(`Unsupported file format. Please upload .nc, .csv, or .json`, true);
    };

    // Quick Action Handlers
    document.getElementById('btn-sample-netcdf').addEventListener('click', async () => {
      showStatus('Fetching and parsing sample INCOIS ROMS NetCDF file (public/data/incois_roms_sample.nc)...');
      try {
        const resp = await fetch('./data/incois_roms_sample.nc');
        const buffer = await resp.arrayBuffer();
        const parsed = NetCdfParser.parse(buffer);
        showStatus(`✅ Successfully loaded CF-1.8 NetCDF: ${parsed.title}`);
        if (onNewModelLoaded) onNewModelLoaded(parsed);
        setTimeout(closeUpload, 1500);
      } catch (err) {
        showStatus(`❌ NetCDF Ingest Error: ${err.message}`, true);
      }
    });

    document.getElementById('btn-sample-omni').addEventListener('click', () => {
      const newMooring = {
        platform_id: 'INCOIS-OMNI-BD11',
        wmo_id: '23011',
        name: 'OMNI Deep-Sea Buoy BD11',
        basin: 'Central Bay of Bengal',
        instrument_type: 'MOORING',
        latitude: 13.5,
        longitude: 84.0,
        timestamp: new Date().toISOString(),
        profile: [
          { depth: 1.0, temp: 29.4, salt: 33.2, oxygen: 208.0, qc: 1 },
          { depth: 20.0, temp: 29.0, salt: 33.5, oxygen: 204.0, qc: 1 },
          { depth: 50.0, temp: 27.5, salt: 34.4, oxygen: 175.0, qc: 1 },
          { depth: 100.0, temp: 22.0, salt: 34.9, oxygen: 105.0, qc: 1 },
          { depth: 200.0, temp: 16.5, salt: 35.1, oxygen: 52.0, qc: 1 },
          { depth: 500.0, temp: 10.2, salt: 35.0, oxygen: 26.0, qc: 1 },
          { depth: 1000.0, temp: 7.0, salt: 34.8, oxygen: 42.0, qc: 1 },
        ],
      };
      if (onNewInstrumentLoaded) onNewInstrumentLoaded([newMooring], 'MOORING');
      closeUpload();
    });

    document.getElementById('btn-sample-ctd').addEventListener('click', () => {
      const newCtd = {
        platform_id: 'CRUISE-SK392-STN08',
        wmo_id: 'SK392-08',
        name: 'ORV Sagar Kanya Hydrographic Cast',
        basin: 'Southwest Coast of India',
        instrument_type: 'CTD',
        latitude: 10.5,
        longitude: 75.2,
        timestamp: new Date().toISOString(),
        profile: [
          { depth: 2.0, temp: 27.5, salt: 35.5, oxygen: 215.0, ph: 8.15, nitrate: 3.5, qc: 1 },
          { depth: 25.0, temp: 25.2, salt: 35.6, oxygen: 180.0, ph: 8.05, nitrate: 8.0, qc: 1 },
          { depth: 50.0, temp: 21.0, salt: 35.5, oxygen: 110.0, ph: 7.90, nitrate: 15.0, qc: 1 },
          { depth: 100.0, temp: 17.2, salt: 35.3, oxygen: 40.0, ph: 7.75, nitrate: 24.0, qc: 1 },
          { depth: 200.0, temp: 13.8, salt: 35.1, oxygen: 18.0, ph: 7.65, nitrate: 30.0, qc: 1 },
          { depth: 500.0, temp: 9.9, salt: 35.0, oxygen: 15.0, ph: 7.62, nitrate: 34.0, qc: 1 },
          { depth: 1000.0, temp: 7.1, salt: 34.8, oxygen: 35.0, ph: 7.68, nitrate: 35.5, qc: 1 },
        ],
      };
      if (onNewInstrumentLoaded) onNewInstrumentLoaded([newCtd], 'CTD');
      closeUpload();
    });

    document.getElementById('btn-sample-argo').addEventListener('click', () => {
      const newArgo = {
        platform_id: 'INCOIS-ARGO-2903088',
        wmo_id: '2903088',
        latitude: 9.8,
        longitude: 72.1,
        basin: 'Lakshadweep Sea',
        instrument_type: 'ARGO',
        timestamp: new Date().toISOString(),
        profile: [
          { depth: 5.0, temp: 29.5, salt: 35.8, qc: 1 },
          { depth: 50.0, temp: 28.0, salt: 35.9, qc: 1 },
          { depth: 100.0, temp: 21.5, salt: 35.5, qc: 1 },
          { depth: 200.0, temp: 15.2, salt: 35.2, qc: 1 },
          { depth: 500.0, temp: 10.4, salt: 35.0, qc: 1 },
          { depth: 1000.0, temp: 6.9, salt: 34.8, qc: 1 },
          { depth: 2000.0, temp: 3.8, salt: 34.7, qc: 1 },
        ],
      };
      if (onNewInstrumentLoaded) onNewInstrumentLoaded([newArgo], 'ARGO');
      closeUpload();
    });

    document.getElementById('btn-sample-glider').addEventListener('click', () => {
      const newGlider = {
        mission_id: 'INCOIS-GLIDER-ANDAMAN-03',
        mission_name: 'Andaman Basin Deep Transect Mission',
        instrument_type: 'GLIDER',
        waypoints: [
          { timestamp: '2026-09-01T00:00:00Z', latitude: 11.5, longitude: 92.5, depth: 5.0, temp: 29.0, salt: 32.5, chlorophyll: 1.0 },
          { timestamp: '2026-09-01T06:00:00Z', latitude: 11.7, longitude: 92.8, depth: 400.0, temp: 11.8, salt: 34.8, chlorophyll: 0.2 },
          { timestamp: '2026-09-01T12:00:00Z', latitude: 11.9, longitude: 93.1, depth: 800.0, temp: 7.5, salt: 35.0, chlorophyll: 0.05 },
          { timestamp: '2026-09-01T18:00:00Z', latitude: 12.1, longitude: 93.4, depth: 10.0, temp: 28.9, salt: 32.7, chlorophyll: 1.2 },
        ],
      };
      if (onNewInstrumentLoaded) onNewInstrumentLoaded([newGlider], 'GLIDER');
      closeUpload();
    });

    // Live ERDDAP Argo API Fetcher
    const liveArgoBtn = document.getElementById('btn-live-argo-api');
    const liveStatus = document.getElementById('live-api-status');
    if (liveArgoBtn) {
      liveArgoBtn.addEventListener('click', async () => {
        liveStatus.classList.remove('hidden');
        liveStatus.innerHTML = '<span class="animate-pulse text-amber-400">⏳ Connecting to Global Argo ERDDAP Gateway...</span>';
        try {
          const floats = await LiveApiService.fetchLiveArgoFloats((msg) => {
            liveStatus.innerHTML = `<span class="animate-pulse text-cyan-400">⏳ ${msg}</span>`;
          });
          if (floats && floats.length > 0) {
            if (onNewInstrumentLoaded) onNewInstrumentLoaded(floats, 'ARGO');
            liveStatus.innerHTML = `<span class="text-emerald-400 font-bold">✓ Success:</span> Ingested ${floats.length} live operational INCOIS Argo floats into 3D scene!`;
            setTimeout(closeUpload, 1500);
          } else {
            liveStatus.innerHTML = '<span class="text-amber-400">No floats found in target region.</span>';
          }
        } catch (err) {
          liveStatus.innerHTML = `<span class="text-rose-400">Error: ${err.message}</span>`;
        }
      });
    }

    // Live Copernicus / Open-Meteo Marine API Fetcher
    const liveMarineBtn = document.getElementById('btn-live-marine-api');
    if (liveMarineBtn) {
      liveMarineBtn.addEventListener('click', async () => {
        liveStatus.classList.remove('hidden');
        liveStatus.innerHTML = '<span class="animate-pulse text-cyan-400">⏳ Fetching real-time coastal currents...</span>';
        try {
          const observations = await LiveApiService.fetchLiveMarineObservations(undefined, (msg) => {
            liveStatus.innerHTML = `<span class="animate-pulse text-cyan-400">⏳ ${msg}</span>`;
          });
          if (observations && observations.length > 0) {
            const lines = observations.map((o) => `${o.name}: ${o.current_velocity_ms} m/s (${o.current_direction_deg}°), wave: ${o.wave_height_m}m`).join(' • ');
            liveStatus.innerHTML = `<span class="text-emerald-400 font-bold">✓ Live Copernicus Currents:</span> <div class="mt-1 text-[9px] text-slate-300">${lines}</div>`;
          } else {
            liveStatus.innerHTML = '<span class="text-amber-400">Could not fetch live coastal currents.</span>';
          }
        } catch (err) {
          liveStatus.innerHTML = `<span class="text-rose-400">Error: ${err.message}</span>`;
        }
      });
    }
  }
}
