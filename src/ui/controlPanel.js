import { ColormapEngine } from '../engine/colormapEngine.js';

export class ControlPanel {
  constructor(
    container,
    onVariableChange,
    onColormapChange,
    onExaggerationChange,
    onOpacityChange,
    onIsosurfaceToggle,
    onClipDepthChange,
    onLayerToggle,
    onRangeChange
  ) {
    this.container = container;
    this.onVariableChange = onVariableChange;
    this.onColormapChange = onColormapChange;
    this.onExaggerationChange = onExaggerationChange;
    this.onOpacityChange = onOpacityChange;
    this.onIsosurfaceToggle = onIsosurfaceToggle;
    this.onClipDepthChange = onClipDepthChange;
    this.onLayerToggle = onLayerToggle;
    this.onRangeChange = onRangeChange;

    this.selectedVar = 'temp';
    this.selectedPal = 'thermal';
    this.isReversed = false;
    this.isLogScale = false;
    this.exaggeration = 25;
    this.opacity = 0.85;
    this.isIsosurface = false;
    this.isovalue = 0.5;
    this.clipDepth = 1.0;

    // Range thresholds per variable
    this.ranges = {
      temp: { min: 4.0, max: 31.0, unit: '°C' },
      salt: { min: 31.5, max: 36.8, unit: 'PSU' },
      chlorophyll: { min: 0.05, max: 3.0, unit: 'mg/m³' },
      u: { min: -1.2, max: 1.5, unit: 'm/s' },
      w: { min: -0.01, max: 0.01, unit: 'm/s' },
      oxygen: { min: 10.0, max: 220.0, unit: 'µmol/kg' },
    };

    this.render();
  }

  render() {
    const curRange = this.ranges[this.selectedVar] || { min: 0, max: 100, unit: '' };

    this.container.innerHTML = `
      <div class="space-y-3.5 text-xs select-none">
        
        <!-- Mobile Drawer Close Header (visible on mobile only) -->
        <div class="flex items-center justify-between pb-2 border-b border-slate-800 md:hidden">
          <span class="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
            <span>⚙️</span> Controls & Layers
          </span>
          <button id="btn-close-sidebar-drawer" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer">
            ✕ Close
          </button>
        </div>

        <!-- 1. Ocean Variables -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span>📊</span> Ocean Model Variable
            </span>
            <span class="text-[9px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">ROMS / CF-1.8</span>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <button data-var="temp" class="var-btn flex items-center justify-between px-2.5 py-1.5 rounded-lg ${this.selectedVar === 'temp' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800/90 border border-transparent'} font-medium transition cursor-pointer">
              <span class="flex items-center gap-1.5 text-[11px]"><span>🌡️</span> Temp</span>
              <span class="font-mono text-[10px] text-cyan-400">°C</span>
            </button>
            <button data-var="salt" class="var-btn flex items-center justify-between px-2.5 py-1.5 rounded-lg ${this.selectedVar === 'salt' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800/90 border border-transparent'} font-medium transition cursor-pointer">
              <span class="flex items-center gap-1.5 text-[11px]"><span>🧂</span> Salinity</span>
              <span class="font-mono text-[10px] text-slate-400">PSU</span>
            </button>
            <button data-var="chlorophyll" class="var-btn flex items-center justify-between px-2.5 py-1.5 rounded-lg ${this.selectedVar === 'chlorophyll' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800/90 border border-transparent'} font-medium transition cursor-pointer">
              <span class="flex items-center gap-1.5 text-[11px]"><span>🌿</span> Chl-a</span>
              <span class="font-mono text-[10px] text-slate-400">mg/m³</span>
            </button>
            <button data-var="u" class="var-btn flex items-center justify-between px-2.5 py-1.5 rounded-lg ${this.selectedVar === 'u' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800/90 border border-transparent'} font-medium transition cursor-pointer">
              <span class="flex items-center gap-1.5 text-[11px]"><span>➡️</span> Velocity U</span>
              <span class="font-mono text-[10px] text-slate-400">m/s</span>
            </button>
            <button data-var="w" class="var-btn flex items-center justify-between px-2.5 py-1.5 rounded-lg ${this.selectedVar === 'w' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800/90 border border-transparent'} font-medium transition cursor-pointer">
              <span class="flex items-center gap-1.5 text-[11px]"><span>⬆️</span> Upwelling W</span>
              <span class="font-mono text-[10px] text-slate-400">m/s</span>
            </button>
            <button data-var="oxygen" class="var-btn flex items-center justify-between px-2.5 py-1.5 rounded-lg ${this.selectedVar === 'oxygen' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800/90 border border-transparent'} font-medium transition cursor-pointer">
              <span class="flex items-center gap-1.5 text-[11px]"><span>🫧</span> BGC Oxygen</span>
              <span class="font-mono text-[10px] text-slate-400">µmol</span>
            </button>
          </div>
        </div>

        <!-- 2. Dynamic Colorbar & Palette Editor -->
        <div class="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5 shadow-lg">
          <div class="flex justify-between items-center">
            <span class="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px]">
              <span>🎨</span> Colorbar & Transfer Function
            </span>
            <div class="flex items-center gap-1.5">
              <button id="btn-scale-toggle" class="px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${this.isLogScale ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-800 text-slate-300 border-slate-700'}">
                ${this.isLogScale ? 'LOG₁₀' : 'LIN'}
              </button>
              <button id="btn-invert-pal" title="Invert Colormap" class="p-1 rounded text-[10px] border ${this.isReversed ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'} cursor-pointer">
                ⇄
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <select id="select-palette" class="w-full bg-slate-800 text-cyan-400 font-bold rounded-md px-2 py-1 border border-slate-700 font-mono text-[11px] cursor-pointer">
              <option value="thermal" ${this.selectedPal === 'thermal' ? 'selected' : ''}>cmocean.thermal (Temperature)</option>
              <option value="haline" ${this.selectedPal === 'haline' ? 'selected' : ''}>cmocean.haline (Salinity)</option>
              <option value="deep" ${this.selectedPal === 'deep' ? 'selected' : ''}>cmocean.deep (Bathymetry)</option>
              <option value="speed" ${this.selectedPal === 'speed' ? 'selected' : ''}>cmocean.speed (Currents)</option>
              <option value="matter" ${this.selectedPal === 'matter' ? 'selected' : ''}>cmocean.matter (Sediment)</option>
              <option value="chlorophyll" ${this.selectedPal === 'chlorophyll' ? 'selected' : ''}>cmocean.chlorophyll (Biology)</option>
              <option value="balance" ${this.selectedPal === 'balance' ? 'selected' : ''}>cmocean.balance (Anomalies)</option>
            </select>
          </div>

          <!-- Colorbar Preview Canvas -->
          <div class="space-y-1">
            <div class="h-3.5 w-full rounded-md overflow-hidden border border-slate-700 shadow-inner">
              <canvas id="colorbar-canvas" class="w-full h-full block"></canvas>
            </div>
            
            <!-- Editable Dynamic Min / Max Range Controls -->
            <div class="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
              <div class="flex items-center gap-1 bg-slate-950/60 p-1 rounded border border-slate-800">
                <span class="text-slate-500">Min:</span>
                <input id="input-range-min" type="number" step="0.1" value="${curRange.min}" class="w-full bg-transparent text-cyan-400 font-bold focus:outline-none">
                <span class="text-slate-500">${curRange.unit}</span>
              </div>
              <div class="flex items-center gap-1 bg-slate-950/60 p-1 rounded border border-slate-800">
                <span class="text-slate-500">Max:</span>
                <input id="input-range-max" type="number" step="0.1" value="${curRange.max}" class="w-full bg-transparent text-cyan-400 font-bold focus:outline-none">
                <span class="text-slate-500">${curRange.unit}</span>
              </div>
            </div>
          </div>

          <!-- Volume Opacity Slider -->
          <div>
            <div class="flex justify-between text-slate-300 mb-1 font-medium text-[11px]">
              <span>Volume Opacity</span>
              <span id="label-opacity" class="font-mono text-cyan-400 font-bold">${Math.round(this.opacity * 100)}%</span>
            </div>
            <input id="slider-opacity" type="range" min="0.1" max="1.0" step="0.05" value="${this.opacity}" class="w-full accent-cyan-400 cursor-pointer">
          </div>

          <!-- Depth Slice / Clipping Slider -->
          <div class="pt-2 border-t border-slate-800/80">
            <div class="flex justify-between text-slate-300 mb-1 font-medium text-[11px]">
              <span class="flex items-center gap-1"><span>✂️</span> Depth Slicing Plane</span>
              <span id="label-clip" class="font-mono text-cyan-400 font-bold">0–${Math.round(this.clipDepth * 2000)}m</span>
            </div>
            <input id="slider-clip" type="range" min="0.05" max="1.0" step="0.05" value="${this.clipDepth}" class="w-full accent-cyan-400 cursor-pointer">
          </div>

          <!-- Isosurface Extraction Mode -->
          <div class="pt-2 border-t border-slate-800/80">
            <label class="flex items-center justify-between cursor-pointer mb-2">
              <span class="text-slate-200 font-medium flex items-center gap-1.5 text-[11px]">
                <span>🌐</span> 3D Isosurface Mode
              </span>
              <input id="check-isosurface" type="checkbox" ${this.isIsosurface ? 'checked' : ''} class="rounded accent-cyan-400 w-4 h-4 cursor-pointer">
            </label>
            <div id="isovalue-container" class="${this.isIsosurface ? '' : 'hidden'} space-y-1">
              <div class="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Isovalue Threshold</span>
                <span id="label-isovalue" class="text-amber-400 font-bold">20.0 °C</span>
              </div>
              <input id="slider-isovalue" type="range" min="0" max="1" step="0.01" value="${this.isovalue}" class="w-full accent-amber-400 cursor-pointer">
              <p class="text-[9px] text-slate-500">Extracts 3D thermocline / halocline front with normal shading.</p>
            </div>
          </div>
        </div>

        <!-- 3. Vertical Exaggeration Slider -->
        <div class="p-3 bg-slate-900/90 rounded-xl border border-slate-800 shadow-lg">
          <div class="flex justify-between text-slate-200 font-semibold mb-1 text-[11px]">
            <span class="flex items-center gap-1.5"><span>📐</span> Vertical Exaggeration</span>
            <span id="label-exag" class="font-mono text-cyan-400 font-bold">${this.exaggeration}x</span>
          </div>
          <input id="slider-exag" type="range" min="1" max="80" value="${this.exaggeration}" class="w-full accent-cyan-400 cursor-pointer">
          <p class="text-[9px] text-slate-500 mt-1">Expands shallow bathymetry & surface thermocline depth.</p>
        </div>

        <!-- 4. Observation & Geospatial Layer Toggles -->
        <div class="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 shadow-lg">
          <span class="font-semibold text-slate-200 block text-[11px]">Geospatial & In-Situ Layers</span>
          
          <div class="grid grid-cols-2 gap-1.5 text-[10px]">
            <!-- Geospatial -->
            <label class="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <span class="text-slate-300 flex items-center gap-1"><span>🇮🇳</span> Coastline</span>
              <input id="check-coastline" type="checkbox" checked class="accent-cyan-400 w-3.5 h-3.5 cursor-pointer">
            </label>
            <label class="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <span class="text-amber-300 flex items-center gap-1"><span>🛡️</span> Indian EEZ</span>
              <input id="check-eez" type="checkbox" checked class="accent-amber-400 w-3.5 h-3.5 cursor-pointer">
            </label>
            <label class="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <span class="text-slate-300 flex items-center gap-1"><span>🏔️</span> 3D Bathymetry</span>
              <input id="check-bathymetry" type="checkbox" checked class="accent-cyan-400 w-3.5 h-3.5 cursor-pointer">
            </label>
            <label class="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <span class="text-slate-300 flex items-center gap-1"><span>🌊</span> 3D Currents</span>
              <input id="check-vectors" type="checkbox" checked class="accent-cyan-400 w-3.5 h-3.5 cursor-pointer">
            </label>

            <!-- Observing Networks -->
            <label class="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <span class="text-amber-400 flex items-center gap-1"><span>🟡</span> Argo Floats</span>
              <input id="check-argo" type="checkbox" checked class="accent-amber-400 w-3.5 h-3.5 cursor-pointer">
            </label>
            <label class="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <span class="text-cyan-400 flex items-center gap-1"><span>🔵</span> Gliders</span>
              <input id="check-gliders" type="checkbox" checked class="accent-cyan-400 w-3.5 h-3.5 cursor-pointer">
            </label>
            <label class="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <span class="text-red-400 flex items-center gap-1"><span>🔴</span> OMNI Moorings</span>
              <input id="check-moorings" type="checkbox" checked class="accent-red-400 w-3.5 h-3.5 cursor-pointer">
            </label>
            <label class="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <span class="text-purple-400 flex items-center gap-1"><span>🟣</span> CTD Casts</span>
              <input id="check-ctd" type="checkbox" checked class="accent-purple-400 w-3.5 h-3.5 cursor-pointer">
            </label>
          </div>
        </div>
      </div>
    `;

    this.drawColorbarCanvas();
    this.bindEvents();
  }

  drawColorbarCanvas() {
    const canvas = this.container.querySelector('#colorbar-canvas');
    if (!canvas) return;
    canvas.width = 256;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const lut = ColormapEngine.getLut(this.selectedPal, 256, {
      isReversed: this.isReversed,
      isLogScale: this.isLogScale,
    });

    const imgData = ctx.createImageData(256, 16);
    for (let x = 0; x < 256; x++) {
      const r = lut[x * 4 + 0];
      const g = lut[x * 4 + 1];
      const b = lut[x * 4 + 2];
      const a = lut[x * 4 + 3];

      for (let y = 0; y < 16; y++) {
        const idx = (y * 256 + x) * 4;
        imgData.data[idx + 0] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = a;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  bindEvents() {
    // Variable Selection
    this.container.querySelectorAll('.var-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-var');
        this.selectedVar = v;
        const defaultPalettes = {
          temp: 'thermal',
          salt: 'haline',
          chlorophyll: 'chlorophyll',
          u: 'speed',
          w: 'balance',
          oxygen: 'deep',
        };
        this.selectedPal = defaultPalettes[v] || 'thermal';
        this.render();
        if (this.onVariableChange) this.onVariableChange(v, this.selectedPal);
      });
    });

    // Palette Change
    const palSelect = this.container.querySelector('#select-palette');
    if (palSelect) {
      palSelect.addEventListener('change', (e) => {
        this.selectedPal = e.target.value;
        this.drawColorbarCanvas();
        if (this.onColormapChange) {
          this.onColormapChange(this.selectedPal, {
            isReversed: this.isReversed,
            isLogScale: this.isLogScale,
          });
        }
      });
    }

    // Scale Mode (Linear vs Logarithmic)
    const scaleBtn = this.container.querySelector('#btn-scale-toggle');
    if (scaleBtn) {
      scaleBtn.addEventListener('click', () => {
        this.isLogScale = !this.isLogScale;
        this.render();
        if (this.onColormapChange) {
          this.onColormapChange(this.selectedPal, {
            isReversed: this.isReversed,
            isLogScale: this.isLogScale,
          });
        }
      });
    }

    // Invert Colormap
    const invertBtn = this.container.querySelector('#btn-invert-pal');
    if (invertBtn) {
      invertBtn.addEventListener('click', () => {
        this.isReversed = !this.isReversed;
        this.render();
        if (this.onColormapChange) {
          this.onColormapChange(this.selectedPal, {
            isReversed: this.isReversed,
            isLogScale: this.isLogScale,
          });
        }
      });
    }

    // Min / Max Inputs
    const minInput = this.container.querySelector('#input-range-min');
    const maxInput = this.container.querySelector('#input-range-max');
    const handleRangeUpdate = () => {
      const min = parseFloat(minInput.value);
      const max = parseFloat(maxInput.value);
      if (!isNaN(min) && !isNaN(max) && max > min) {
        this.ranges[this.selectedVar] = { ...this.ranges[this.selectedVar], min, max };
        if (this.onRangeChange) this.onRangeChange(this.selectedVar, min, max);
      }
    };
    if (minInput) minInput.addEventListener('change', handleRangeUpdate);
    if (maxInput) maxInput.addEventListener('change', handleRangeUpdate);

    // Opacity
    const opacitySlider = this.container.querySelector('#slider-opacity');
    const opacityLabel = this.container.querySelector('#label-opacity');
    if (opacitySlider) {
      opacitySlider.addEventListener('input', (e) => {
        this.opacity = parseFloat(e.target.value);
        if (opacityLabel) opacityLabel.textContent = `${Math.round(this.opacity * 100)}%`;
        if (this.onOpacityChange) this.onOpacityChange(this.opacity);
      });
    }

    // Exaggeration
    const exagSlider = this.container.querySelector('#slider-exag');
    const exagLabel = this.container.querySelector('#label-exag');
    if (exagSlider) {
      exagSlider.addEventListener('input', (e) => {
        this.exaggeration = parseInt(e.target.value, 10);
        if (exagLabel) exagLabel.textContent = `${this.exaggeration}x`;
        if (this.onExaggerationChange) this.onExaggerationChange(this.exaggeration);
      });
    }

    // Depth Clip
    const clipSlider = this.container.querySelector('#slider-clip');
    const clipLabel = this.container.querySelector('#label-clip');
    if (clipSlider) {
      clipSlider.addEventListener('input', (e) => {
        this.clipDepth = parseFloat(e.target.value);
        if (clipLabel) clipLabel.textContent = `0–${Math.round(this.clipDepth * 2000)}m`;
        if (this.onClipDepthChange) this.onClipDepthChange(this.clipDepth);
      });
    }

    // Isosurface
    const isoCheck = this.container.querySelector('#check-isosurface');
    const isoContainer = this.container.querySelector('#isovalue-container');
    const isoSlider = this.container.querySelector('#slider-isovalue');
    const isoLabel = this.container.querySelector('#label-isovalue');

    if (isoCheck) {
      isoCheck.addEventListener('change', (e) => {
        this.isIsosurface = e.target.checked;
        if (isoContainer) isoContainer.classList.toggle('hidden', !this.isIsosurface);
        if (this.onIsosurfaceToggle) this.onIsosurfaceToggle(this.isIsosurface, this.isovalue);
      });
    }

    if (isoSlider) {
      isoSlider.addEventListener('input', (e) => {
        this.isovalue = parseFloat(e.target.value);
        if (isoLabel) {
          const cur = this.ranges[this.selectedVar] || { min: 0, max: 100, unit: '' };
          const realVal = (cur.min + this.isovalue * (cur.max - cur.min)).toFixed(1);
          isoLabel.textContent = `${realVal} ${cur.unit}`;
        }
        if (this.onIsosurfaceToggle) this.onIsosurfaceToggle(this.isIsosurface, this.isovalue);
      });
    }

    // Layer Toggles
    const getLayerStates = () => ({
      coastline: this.container.querySelector('#check-coastline')?.checked ?? true,
      eez: this.container.querySelector('#check-eez')?.checked ?? true,
      bathymetry: this.container.querySelector('#check-bathymetry')?.checked ?? true,
      vectors: this.container.querySelector('#check-vectors')?.checked ?? true,
      argo: this.container.querySelector('#check-argo')?.checked ?? true,
      gliders: this.container.querySelector('#check-gliders')?.checked ?? true,
      moorings: this.container.querySelector('#check-moorings')?.checked ?? true,
      ctd: this.container.querySelector('#check-ctd')?.checked ?? true,
    });

    [
      '#check-coastline',
      '#check-eez',
      '#check-bathymetry',
      '#check-vectors',
      '#check-argo',
      '#check-gliders',
      '#check-moorings',
      '#check-ctd',
    ].forEach((id) => {
      const el = this.container.querySelector(id);
      if (el) {
        el.addEventListener('change', () => {
          if (this.onLayerToggle) this.onLayerToggle(getLayerStates());
        });
      }
    });

    const closeDrawerBtn = this.container.querySelector('#btn-close-sidebar-drawer');
    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('control-panel-container');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar) sidebar.classList.add('-translate-x-full');
        if (backdrop) backdrop.classList.add('hidden');
      });
    }
  }

  setExaggeration(val) {
    this.exaggeration = val;
    const slider = this.container.querySelector('#slider-exag');
    const label = this.container.querySelector('#label-exag');
    if (slider) slider.value = val;
    if (label) label.textContent = `${val}x`;
  }
}
