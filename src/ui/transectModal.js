import { ColormapEngine } from '../engine/colormapEngine.js';

export class TransectModal {
  static show(oceanEngine, currentVar, currentTimeIdx, onSelectRoute) {
    const modalRoot = document.getElementById('modal-container');
    const routes = [
      {
        id: 'as-mumbai-maldives',
        name: 'Arabian Sea: Mumbai Coast → Maldives',
        coords: [18.9, 72.8, 4.2, 73.5],
        desc: 'Vertical cross-section through the West India Coastal Current and open Arabian Sea thermocline.',
      },
      {
        id: 'bob-ganges-srilanka',
        name: 'Bay of Bengal: Ganges Delta → Sri Lanka',
        coords: [21.5, 89.0, 7.0, 81.5],
        desc: 'Captures the river runoff freshwater plume and subsurface barrier layer stratification.',
      },
      {
        id: 'equatorial-zonal',
        name: 'Equatorial Indian Ocean Zonal Transect',
        coords: [0.0, 55.0, 0.0, 92.0],
        desc: 'Zonal thermocline slope across the equatorial Indian Ocean Dipole (IOD) axis.',
      },
    ];

    let selectedRoute = routes[0];
    let transectData = oceanEngine.extractTransect(
      currentVar,
      currentTimeIdx,
      selectedRoute.coords[0],
      selectedRoute.coords[1],
      selectedRoute.coords[2],
      selectedRoute.coords[3],
      50
    );

    const isTemp = currentVar === 'temp';
    const unit = isTemp ? '°C' : currentVar === 'salt' ? 'PSU' : 'mg/m³';
    const palette = isTemp ? 'thermal' : currentVar === 'salt' ? 'haline' : 'chlorophyll';

    modalRoot.innerHTML = `
      <div id="transect-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
        <div class="relative w-full max-w-4xl rounded-2xl glass-panel p-3.5 sm:p-6 text-white shadow-2xl border border-slate-700 max-h-[92vh] flex flex-col overflow-y-auto custom-scrollbar">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-800 shrink-0">
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="p-1.5 sm:p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-lg sm:text-xl">
                ✂️
              </div>
              <div>
                <h3 class="font-bold text-xs sm:text-sm tracking-wide text-white">Arbitrary Vertical Ocean Transect (Cross-Section)</h3>
                <p class="text-[10px] sm:text-[11px] text-slate-400">Depth vs Distance vertical profile contour across the North Indian Ocean</p>
              </div>
            </div>
            <button id="btn-close-transect" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer text-base sm:text-lg">
              ✕
            </button>
          </div>

          <!-- Route Selector Pills -->
          <div class="flex flex-wrap gap-1.5 sm:gap-2 my-2 sm:my-3 shrink-0">
            ${routes.map((r, i) => `
              <button data-idx="${i}" class="route-btn px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition cursor-pointer ${
                i === 0
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }">
                ${r.name}
              </button>
            `).join('')}
          </div>

          <p id="route-desc" class="text-xs text-slate-300 mb-2 font-mono text-[11px] bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
            ${selectedRoute.desc}
          </p>

          <!-- 2D Transect Contour Canvas -->
          <div class="flex-1 min-h-[280px] w-full bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col p-2">
            <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 px-2">
              <span id="label-start">Start: ${selectedRoute.coords[0]}°N, ${selectedRoute.coords[1]}°E</span>
              <span class="text-cyan-400 font-bold">${currentVar.toUpperCase()} Vertical Contour (${unit})</span>
              <span id="label-end">End: ${selectedRoute.coords[2]}°N, ${selectedRoute.coords[3]}°E</span>
            </div>
            <div class="flex-1 relative">
              <canvas id="transect-canvas" class="w-full h-full block rounded-lg"></canvas>
            </div>
            <div class="flex justify-between text-[9px] font-mono text-slate-500 mt-1 px-2">
              <span>Surface (0m)</span>
              <span>Thermocline (~150m)</span>
              <span>Intermediate (~500m)</span>
              <span>Abyss (2000m)</span>
            </div>
          </div>

          <!-- Bottom Footer Info -->
          <div class="mt-3 flex items-center justify-between pt-2 border-t border-slate-800 text-xs shrink-0">
            <span class="text-[11px] text-slate-400">
              Contour Resolution: 50 Horizontal Points × 24 Logarithmic Depth Levels.
            </span>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono text-slate-400">cmocean.${palette}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const drawContour = (data) => {
      const canvas = document.getElementById('transect-canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(600, Math.round(rect.width || 700));
      canvas.height = Math.max(240, Math.round(rect.height || 260));

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const lut = ColormapEngine.getLut(palette, 256);

      const numDepths = data.depths.length;
      const numPoints = data.points.length;
      const minVal = Number.isFinite(data.min_val) ? data.min_val : 0;
      const maxVal = Number.isFinite(data.max_val) ? data.max_val : 30;
      const range = (maxVal - minVal) || 1.0;

      const imgData = ctx.createImageData(width, height);

      for (let py = 0; py < height; py++) {
        // Vertical depth fraction (0 at surface top to 1 at abyss bottom)
        const dFrac = py / (height - 1);
        const dIdx = Math.min(numDepths - 1, Math.floor(dFrac * (numDepths - 1)));
        const nextDIdx = Math.min(numDepths - 1, dIdx + 1);
        const dAlpha = (dFrac * (numDepths - 1)) - dIdx;

        for (let px = 0; px < width; px++) {
          // Horizontal point fraction
          const pFrac = px / (width - 1);
          const pIdx = Math.min(numPoints - 1, Math.floor(pFrac * (numPoints - 1)));
          const nextPIdx = Math.min(numPoints - 1, pIdx + 1);
          const pAlpha = (pFrac * (numPoints - 1)) - pIdx;

          // Bilinear interpolation
          const v00 = data.values[dIdx][pIdx];
          const v01 = data.values[dIdx][nextPIdx];
          const v10 = data.values[nextDIdx][pIdx];
          const v11 = data.values[nextDIdx][nextPIdx];

          const vTop = v00 + pAlpha * (v01 - v00);
          const vBottom = v10 + pAlpha * (v11 - v10);
          const val = vTop + dAlpha * (vBottom - vTop);

          const norm = Math.max(0, Math.min(255, Math.round(((val - minVal) / range) * 255)));
          const idx = (py * width + px) * 4;

          imgData.data[idx + 0] = lut[norm * 4 + 0];
          imgData.data[idx + 1] = lut[norm * 4 + 1];
          imgData.data[idx + 2] = lut[norm * 4 + 2];
          imgData.data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Draw isotherm / isohaline contour lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // 100m, 200m, 500m, 1000m reference lines
      [0.05, 0.15, 0.35, 0.65].forEach((frac) => {
        ctx.beginPath();
        ctx.moveTo(0, frac * height);
        ctx.lineTo(width, frac * height);
        ctx.stroke();
      });
    };

    setTimeout(() => drawContour(transectData), 50);

    // Bind route selection
    modalRoot.querySelectorAll('.route-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        modalRoot.querySelectorAll('.route-btn').forEach((b) => {
          b.className = 'route-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800';
        });
        btn.className = 'route-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer bg-cyan-500/20 text-cyan-300 border border-cyan-500/50';

        const idx = parseInt(btn.dataset.idx);
        selectedRoute = routes[idx];
        document.getElementById('route-desc').textContent = selectedRoute.desc;
        document.getElementById('label-start').textContent = `Start: ${selectedRoute.coords[0]}°N, ${selectedRoute.coords[1]}°E`;
        document.getElementById('label-end').textContent = `End: ${selectedRoute.coords[2]}°N, ${selectedRoute.coords[3]}°E`;

        transectData = oceanEngine.extractTransect(
          currentVar,
          currentTimeIdx,
          selectedRoute.coords[0],
          selectedRoute.coords[1],
          selectedRoute.coords[2],
          selectedRoute.coords[3],
          50
        );
        drawContour(transectData);
      });
    });

    const closeModal = () => {
      modalRoot.innerHTML = '';
    };

    document.getElementById('btn-close-transect').addEventListener('click', closeModal);
    document.getElementById('transect-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'transect-backdrop') closeModal();
    });
  }
}
