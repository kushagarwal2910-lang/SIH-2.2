import { ColormapEngine } from '../engine/colormapEngine.js';

export class ControlPanel {
  constructor({
    leftContainer,
    rightContainer,
    onVariableChange,
    onColormapChange,
    onExaggerationChange,
    onOpacityChange,
    onLayerToggle,
    onOpenWaterCube,
  }) {
    this.leftContainer = leftContainer;
    this.rightContainer = rightContainer;
    this.onVariableChange = onVariableChange;
    this.onColormapChange = onColormapChange;
    this.onExaggerationChange = onExaggerationChange;
    this.onOpacityChange = onOpacityChange;
    this.onLayerToggle = onLayerToggle;
    this.onOpenWaterCube = onOpenWaterCube;

    this.selectedVar = 'temp';
    this.selectedPal = 'thermal';
    this.isReversed = false;
    this.isLogScale = false;
    this.exaggeration = 25;
    this.opacity = 0.85;

    // Active layer toggles
    this.layers = {
      argo: true,
      gliders: true,
      moorings: true,
      ctd: true,
      vectors: true,
      eez: true,
      coastline: true,
    };

    // Range thresholds per variable
    this.ranges = {
      temp: { name: 'Potential Temperature', min: 4.0, max: 31.0, unit: '°C' },
      salt: { name: 'Practical Salinity', min: 31.5, max: 36.8, unit: 'PSU' },
      chlorophyll: { name: 'Chlorophyll-a', min: 0.05, max: 3.0, unit: 'mg/m³' },
      u: { name: 'Current Velocity', min: 0.0, max: 1.8, unit: 'm/s' },
      oxygen: { name: 'Dissolved Oxygen', min: 10.0, max: 220.0, unit: 'µmol/kg' },
    };

    this.renderLeft();
    this.renderRight();
  }

  renderLeft() {
    if (!this.leftContainer) return;

    this.leftContainer.innerHTML = `
      <div class="space-y-4 text-xs select-none">
        <!-- Drawer Close on Mobile -->
        <div class="flex items-center justify-between pb-2 border-b border-slate-800 md:hidden">
          <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
            <span>📂</span> Layer Catalog
          </span>
          <button id="btn-close-sidebar-drawer" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">
            ✕ Close
          </button>
        </div>

        <!-- Section 1: Ocean Model Variables -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span>📊</span> Ocean Model Variable
            </span>
            <span class="text-[9px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">ROMS CF-1.8</span>
          </div>

          <div class="space-y-1">
            <button data-var="temp" class="var-btn w-full flex items-center justify-between px-3 py-2 rounded-xl ${this.selectedVar === 'temp' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800/80'} transition cursor-pointer">
              <span class="flex items-center gap-2 text-xs"><span>🌡️</span> Temperature</span>
              <span class="font-mono text-[10px] text-cyan-400">°C</span>
            </button>
            <button data-var="salt" class="var-btn w-full flex items-center justify-between px-3 py-2 rounded-xl ${this.selectedVar === 'salt' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800/80'} transition cursor-pointer">
              <span class="flex items-center gap-2 text-xs"><span>🧂</span> Salinity</span>
              <span class="font-mono text-[10px] text-slate-400">PSU</span>
            </button>
            <button data-var="chlorophyll" class="var-btn w-full flex items-center justify-between px-3 py-2 rounded-xl ${this.selectedVar === 'chlorophyll' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800/80'} transition cursor-pointer">
              <span class="flex items-center gap-2 text-xs"><span>🌿</span> Chlorophyll-a</span>
              <span class="font-mono text-[10px] text-slate-400">mg/m³</span>
            </button>
            <button data-var="u" class="var-btn w-full flex items-center justify-between px-3 py-2 rounded-xl ${this.selectedVar === 'u' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800/80'} transition cursor-pointer">
              <span class="flex items-center gap-2 text-xs"><span>💨</span> Current Speed</span>
              <span class="font-mono text-[10px] text-slate-400">m/s</span>
            </button>
            <button data-var="oxygen" class="var-btn w-full flex items-center justify-between px-3 py-2 rounded-xl ${this.selectedVar === 'oxygen' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800/80'} transition cursor-pointer">
              <span class="flex items-center gap-2 text-xs"><span>🫧</span> Dissolved Oxygen</span>
              <span class="font-mono text-[10px] text-slate-400">µmol</span>
            </button>
          </div>
        </div>

        <!-- Section 2: In-Situ Observing Networks -->
        <div class="pt-2 border-t border-slate-800/80">
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span>📡</span> In-Situ Observing Networks
            </span>
          </div>

          <div class="space-y-1.5">
            <label class="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/70 hover:bg-slate-800/80 cursor-pointer transition">
              <span class="flex items-center gap-2 text-[11px] text-slate-200">
                <span class="w-2 h-2 rounded-full bg-amber-400"></span> Argo Profiling Floats
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">103</span>
                <input type="checkbox" id="layer-argo" ${this.layers.argo ? 'checked' : ''} class="accent-cyan-400 cursor-pointer">
              </div>
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/70 hover:bg-slate-800/80 cursor-pointer transition">
              <span class="flex items-center gap-2 text-[11px] text-slate-200">
                <span class="w-2 h-2 rounded-full bg-cyan-400"></span> Underwater Gliders
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">12</span>
                <input type="checkbox" id="layer-gliders" ${this.layers.gliders ? 'checked' : ''} class="accent-cyan-400 cursor-pointer">
              </div>
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/70 hover:bg-slate-800/80 cursor-pointer transition">
              <span class="flex items-center gap-2 text-[11px] text-slate-200">
                <span class="w-2 h-2 rounded-full bg-red-400"></span> Moored Buoys (OMNI)
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/60">8</span>
                <input type="checkbox" id="layer-moorings" ${this.layers.moorings ? 'checked' : ''} class="accent-cyan-400 cursor-pointer">
              </div>
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/70 hover:bg-slate-800/80 cursor-pointer transition">
              <span class="flex items-center gap-2 text-[11px] text-slate-200">
                <span class="w-2 h-2 rounded-full bg-purple-400"></span> CTD Hydro Stations
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-400 border border-purple-800/60">4</span>
                <input type="checkbox" id="layer-ctd" ${this.layers.ctd ? 'checked' : ''} class="accent-cyan-400 cursor-pointer">
              </div>
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/70 hover:bg-slate-800/80 cursor-pointer transition">
              <span class="flex items-center gap-2 text-[11px] text-slate-200">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Current Flow Arrows
              </span>
              <input type="checkbox" id="layer-vectors" ${this.layers.vectors ? 'checked' : ''} class="accent-cyan-400 cursor-pointer">
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/70 hover:bg-slate-800/80 cursor-pointer transition">
              <span class="flex items-center gap-2 text-[11px] text-slate-200">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span> India EEZ (200 NM)
              </span>
              <input type="checkbox" id="layer-eez" ${this.layers.eez ? 'checked' : ''} class="accent-cyan-400 cursor-pointer">
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-slate-900/70 border border-slate-800/70 hover:bg-slate-800/80 cursor-pointer transition">
              <span class="flex items-center gap-2 text-[11px] text-slate-200">
                <span class="w-2 h-2 rounded-full bg-sky-400"></span> Coastlines & Islands
              </span>
              <input type="checkbox" id="layer-coastline" ${this.layers.coastline ? 'checked' : ''} class="accent-cyan-400 cursor-pointer">
            </label>
          </div>
        </div>
      </div>
    `;

    this.bindLeftEvents();
  }

  renderRight() {
    if (!this.rightContainer) return;
    const curRange = this.ranges[this.selectedVar] || { name: '', min: 0, max: 100, unit: '' };

    this.rightContainer.innerHTML = `
      <div class="space-y-4 text-xs select-none">
        <div class="flex items-center justify-between pb-1 border-b border-slate-800">
          <span class="font-bold text-slate-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
            <span>🎛️</span> Visualization Controls
          </span>
          <button id="btn-close-controls-drawer" class="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold lg:hidden cursor-pointer">
            ✕ Close
          </button>
        </div>

        <!-- Primary CTA: Inspect 3D Water Block -->
        <div class="p-3 bg-gradient-to-br from-cyan-950/60 to-slate-900 rounded-xl border border-cyan-500/40 shadow-lg flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🧊</span> 3D Ocean Volume
            </span>
            <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700">0–2000m</span>
          </div>
          <p class="text-[10px] text-slate-400 leading-tight">
            Inspect micro-scale vertical depth slices, radar rings, and live depth readings.
          </p>
          <button id="btn-inspect-water-block" class="w-full py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs shadow-md transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5">
            <span>🔍</span> Inspect 3D Water Block
          </button>
        </div>

        <!-- Variable Scale & Colormap -->
        <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-300">${curRange.name}</span>
            <span class="font-mono text-[10px] text-cyan-400 font-semibold">${curRange.min} — ${curRange.max} ${curRange.unit}</span>
          </div>

          <!-- Colorbar preview canvas -->
          <div class="relative w-full h-4 rounded-md overflow-hidden border border-slate-700/80 shadow-inner">
            <canvas id="canvas-colorbar" class="w-full h-full block"></canvas>
          </div>

          <!-- Colormap Palette Dropdown -->
          <div class="flex items-center justify-between gap-2 pt-1">
            <span class="text-[10px] text-slate-400 font-mono">Palette:</span>
            <select id="select-colormap" class="flex-1 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400 cursor-pointer">
              <option value="thermal" ${this.selectedPal === 'thermal' ? 'selected' : ''}>thermal (cmocean)</option>
              <option value="haline" ${this.selectedPal === 'haline' ? 'selected' : ''}>haline (cmocean)</option>
              <option value="deep" ${this.selectedPal === 'deep' ? 'selected' : ''}>deep (cmocean)</option>
              <option value="speed" ${this.selectedPal === 'speed' ? 'selected' : ''}>speed (cmocean)</option>
              <option value="matter" ${this.selectedPal === 'matter' ? 'selected' : ''}>matter (cmocean)</option>
              <option value="chlorophyll" ${this.selectedPal === 'chlorophyll' ? 'selected' : ''}>chlorophyll (cmocean)</option>
              <option value="balance" ${this.selectedPal === 'balance' ? 'selected' : ''}>balance (cmocean)</option>
            </select>
          </div>
        </div>

        <!-- Rendering Controls: Opacity & Exaggeration -->
        <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-3">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11px] text-slate-300">Layer Opacity</span>
              <span id="label-opacity" class="text-[10px] font-mono text-cyan-400 font-bold">${Math.round(this.opacity * 100)}%</span>
            </div>
            <input id="slider-opacity" type="range" min="0.1" max="1.0" step="0.05" value="${this.opacity}" class="w-full accent-cyan-400 cursor-pointer">
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11px] text-slate-300">Vertical Exaggeration</span>
              <span id="label-exaggeration" class="text-[10px] font-mono text-cyan-400 font-bold">${this.exaggeration}x</span>
            </div>
            <input id="slider-exaggeration" type="range" min="5" max="60" step="5" value="${this.exaggeration}" class="w-full accent-cyan-400 cursor-pointer">
          </div>
        </div>

        <!-- Selected In-Situ Sensor Telemetry Card (Dynamic) -->
        <div id="docked-sensor-card" class="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <span>📡</span> Selected Instrument
            </span>
            <span class="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">ACTIVE</span>
          </div>
          <div id="docked-sensor-info" class="text-[11px] text-slate-300 font-mono">
            Click any float marker in the 3D globe to inspect in-situ telemetry & model correlation.
          </div>
          <button id="btn-docked-open-cube" class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-lg text-xs transition border border-slate-700 flex items-center justify-center gap-1 cursor-pointer">
            <span>🧊</span> Inspect 3D Water Block
          </button>
        </div>
      </div>
    `;

    this.bindRightEvents();
    this.drawColorbar();
  }

  drawColorbar() {
    const canvas = this.rightContainer.querySelector('#canvas-colorbar');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 16;

    const lut = ColormapEngine.getLut(this.selectedPal, 256, {
      reversed: this.isReversed,
      logScale: this.isLogScale,
    });

    const imgData = ctx.createImageData(256, 16);
    for (let x = 0; x < 256; x++) {
      const r = lut[x * 4 + 0];
      const g = lut[x * 4 + 1];
      const b = lut[x * 4 + 2];
      for (let y = 0; y < 16; y++) {
        const idx = (y * 256 + x) * 4;
        imgData.data[idx + 0] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  bindLeftEvents() {
    // Variable selection
    this.leftContainer.querySelectorAll('.var-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const v = btn.dataset.var;
        this.selectedVar = v;
        this.renderLeft();
        this.renderRight();
        if (this.onVariableChange) {
          this.onVariableChange(v, this.selectedPal);
        }
      });
    });

    // Layer checkboxes
    const bindLayer = (id, key) => {
      const chk = this.leftContainer.querySelector(`#${id}`);
      if (chk) {
        chk.addEventListener('change', (e) => {
          this.layers[key] = e.target.checked;
          if (this.onLayerToggle) this.onLayerToggle(this.layers);
        });
      }
    };
    bindLayer('layer-argo', 'argo');
    bindLayer('layer-gliders', 'gliders');
    bindLayer('layer-moorings', 'moorings');
    bindLayer('layer-ctd', 'ctd');
    bindLayer('layer-vectors', 'vectors');
    bindLayer('layer-eez', 'eez');
    bindLayer('layer-coastline', 'coastline');

    // Mobile close
    const closeBtn = this.leftContainer.querySelector('#btn-close-sidebar-drawer');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.leftContainer.classList.add('-translate-x-full');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) backdrop.classList.add('hidden');
      });
    }
  }

  bindRightEvents() {
    // Colormap dropdown
    const sel = this.rightContainer.querySelector('#select-colormap');
    if (sel) {
      sel.addEventListener('change', (e) => {
        this.selectedPal = e.target.value;
        this.drawColorbar();
        if (this.onColormapChange) {
          this.onColormapChange(this.selectedPal, {
            reversed: this.isReversed,
            logScale: this.isLogScale,
          });
        }
      });
    }

    // Opacity slider
    const opSlider = this.rightContainer.querySelector('#slider-opacity');
    if (opSlider) {
      opSlider.addEventListener('input', (e) => {
        this.opacity = parseFloat(e.target.value);
        this.rightContainer.querySelector('#label-opacity').innerText = `${Math.round(this.opacity * 100)}%`;
        if (this.onOpacityChange) this.onOpacityChange(this.opacity);
      });
    }

    // Exaggeration slider
    const exagSlider = this.rightContainer.querySelector('#slider-exaggeration');
    if (exagSlider) {
      exagSlider.addEventListener('input', (e) => {
        this.exaggeration = parseInt(e.target.value);
        this.rightContainer.querySelector('#label-exaggeration').innerText = `${this.exaggeration}x`;
        if (this.onExaggerationChange) this.onExaggerationChange(this.exaggeration);
      });
    }

    // Inspect 3D Water Block primary button
    const btnWaterBlock = this.rightContainer.querySelector('#btn-inspect-water-block');
    if (btnWaterBlock) {
      btnWaterBlock.addEventListener('click', () => {
        if (this.onOpenWaterCube) {
          this.onOpenWaterCube(13.32, 86.82, this.selectedVar);
        }
      });
    }

    // Docked sensor water block button
    const btnDockedCube = this.rightContainer.querySelector('#btn-docked-open-cube');
    if (btnDockedCube) {
      btnDockedCube.addEventListener('click', () => {
        if (this.activeSensor && this.onOpenWaterCube) {
          this.onOpenWaterCube(this.activeSensor.latitude, this.activeSensor.longitude, this.selectedVar);
        } else if (this.onOpenWaterCube) {
          this.onOpenWaterCube(13.32, 86.82, this.selectedVar);
        }
      });
    }

    // Mobile close
    const closeRightBtn = this.rightContainer.querySelector('#btn-close-controls-drawer');
    if (closeRightBtn) {
      closeRightBtn.addEventListener('click', () => {
        this.rightContainer.classList.add('translate-x-full');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) backdrop.classList.add('hidden');
      });
    }
  }

  showSensorTelemetry(sensor, type) {
    this.activeSensor = sensor;
    const infoEl = this.rightContainer?.querySelector('#docked-sensor-info');
    if (infoEl) {
      const name = sensor.wmo_id ? `Argo #${sensor.wmo_id}` : sensor.station_name || sensor.id || type;
      infoEl.innerHTML = `
        <div class="text-white font-bold">${name}</div>
        <div class="text-slate-400">Position: ${sensor.latitude.toFixed(2)}°N, ${sensor.longitude.toFixed(2)}°E</div>
        <div class="text-cyan-400">Cycle: ${sensor.cycle_number || '1'} • 0–2000m CTD Cast</div>
      `;
    }
  }
}
