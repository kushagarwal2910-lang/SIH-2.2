import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export class ProfileChartModal {
  static show(validationReport, onClose) {
    const modalRoot = document.getElementById('modal-container');
    const isTemp = validationReport.variable === 'temp';
    const isSalt = validationReport.variable === 'salt';
    const unit = isTemp ? '°C' : isSalt ? 'PSU' : 'mg/m³';
    const varLabel = isTemp ? 'Potential Temperature' : isSalt ? 'Practical Salinity' : 'Chlorophyll-a';

    const isHighCorr = validationReport.metrics.pearsonR >= 0.85;

    modalRoot.innerHTML = `
      <div id="modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
        <div class="relative w-full max-w-3xl rounded-2xl glass-panel p-4 sm:p-6 text-white shadow-2xl border border-slate-700 max-h-[92vh] flex flex-col overflow-y-auto custom-scrollbar">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 shrink-0">
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-lg sm:text-xl">
                🟡
              </div>
              <div>
                <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 class="font-bold text-xs sm:text-sm tracking-wide text-white">In-Situ vs Model Profile Co-Validation</h3>
                  <span class="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">${validationReport.platform_id}</span>
                </div>
                <p class="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5">
                  Location: ${validationReport.latitude}°N, ${validationReport.longitude}°E • Basin: ${validationReport.basin}
                </p>
              </div>
            </div>
            <button id="btn-close-modal" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer text-base sm:text-lg">
              ✕
            </button>
          </div>

          <!-- Statistical Metrics Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 my-3 sm:my-4 shrink-0 font-mono text-xs">
            <div class="bg-slate-900/90 p-2.5 sm:p-3 rounded-xl border border-slate-800 flex flex-col shadow-inner">
              <span class="text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">RMSE</span>
              <span class="text-amber-400 font-bold text-sm sm:text-base mt-1">${validationReport.metrics.rmse} ${unit}</span>
            </div>
            <div class="bg-slate-900/90 p-2.5 sm:p-3 rounded-xl border border-slate-800 flex flex-col shadow-inner">
              <span class="text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">Mean Bias</span>
              <span class="text-cyan-400 font-bold text-sm sm:text-base mt-1">${validationReport.metrics.bias > 0 ? '+' : ''}${validationReport.metrics.bias} ${unit}</span>
            </div>
            <div class="bg-slate-900/90 p-2.5 sm:p-3 rounded-xl border border-slate-800 flex flex-col shadow-inner">
              <span class="text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">Pearson (r)</span>
              <span class="${isHighCorr ? 'text-emerald-400' : 'text-rose-400'} font-bold text-sm sm:text-base mt-1">
                ${validationReport.metrics.pearsonR} ${isHighCorr ? '✓' : ''}
              </span>
            </div>
            <div class="bg-slate-900/90 p-2.5 sm:p-3 rounded-xl border border-slate-800 flex flex-col shadow-inner">
              <span class="text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">Sample Levels</span>
              <span class="text-slate-200 font-bold text-sm sm:text-base mt-1">${validationReport.metrics.point_count} pts (0–2000m)</span>
            </div>
          </div>

          <!-- Chart Area -->
          <div class="h-56 sm:h-72 w-full bg-slate-950 p-2 sm:p-3 rounded-xl border border-slate-800 shadow-inner shrink-0 relative">
            <canvas id="profile-chart-canvas"></canvas>
          </div>

          <!-- Point Data Table & Actions -->
          <div class="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-slate-800 shrink-0">
            <div class="text-[10px] sm:text-[11px] text-slate-400">
              <span class="text-amber-400 font-semibold">● In-Situ Profile</span> vs <span class="text-cyan-400 font-semibold">--- ROMS Model</span> (QC=1 Verified)
            </div>
            <div class="flex items-center gap-2">
              <button id="btn-modal-open-cube" class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer shadow-md">
                <span>🧊</span> Inspect 3D Water Block
              </button>
              <button id="btn-export-csv" class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition cursor-pointer">
                <span>📥</span> Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook up open cube
    modalRoot.querySelector('#btn-modal-open-cube').addEventListener('click', () => {
      if (validationReport.onOpenWaterCube) {
        validationReport.onOpenWaterCube(validationReport.latitude, validationReport.longitude, validationReport.variable);
      }
    });

    // Render Chart.js
    const canvas = document.getElementById('profile-chart-canvas');
    const depths = validationReport.comparison.map((c) => c.depth);
    const obsValues = validationReport.comparison.map((c) => c.observed);
    const modValues = validationReport.comparison.map((c) => c.modeled);

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: depths,
        datasets: [
          {
            label: `In-Situ Argo Cast (${validationReport.platform_id})`,
            data: obsValues,
            borderColor: '#f59e0b',
            backgroundColor: '#f59e0b',
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 2.5,
            tension: 0.2,
          },
          {
            label: 'INCOIS ROMS Ocean Numerical Model',
            data: modValues,
            borderColor: '#06b6d4',
            backgroundColor: '#06b6d4',
            borderDash: [6, 4],
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            tension: 0.2,
          },
        ],
      },
      options: {
        indexAxis: 'y', // Inverted vertical depth profile
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            reverse: true, // 0m surface at top, 2000m abyss at bottom
            title: {
              display: true,
              text: 'Depth (meters)',
              color: '#94a3b8',
              font: { family: 'monospace', size: 11, weight: 'bold' },
            },
            ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } },
            grid: { color: '#1e293b' },
          },
          x: {
            title: {
              display: true,
              text: `${varLabel} (${unit})`,
              color: '#94a3b8',
              font: { family: 'monospace', size: 11, weight: 'bold' },
            },
            ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } },
            grid: { color: '#1e293b' },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: '#f8fafc',
              font: { family: 'system-ui', size: 11, weight: 'bold' },
              boxWidth: 14,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#38bdf8',
            bodyColor: '#f8fafc',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: (items) => `Depth: ${items[0].label} m`,
              label: (item) => `${item.dataset.label}: ${item.raw} ${unit}`,
            },
          },
        },
      },
    });

    // Close handlers
    const closeModal = () => {
      chart.destroy();
      modalRoot.innerHTML = '';
      if (onClose) onClose();
    };

    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });

    // CSV Export
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      let csv = 'depth_m,observed,modeled,difference,qc_flag\n';
      validationReport.comparison.forEach((row) => {
        csv += `${row.depth},${row.observed},${row.modeled},${row.diff},${row.qc || 1}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validation_${validationReport.platform_id}_${validationReport.variable}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
