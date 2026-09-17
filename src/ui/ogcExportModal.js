import { OgcService } from '../engine/ogcService.js';

export class OgcExportModal {
  static show(metadata, instruments = []) {
    const modalRoot = document.getElementById('modal-container');
    const wmsXml = OgcService.generateWmsCapabilities(metadata);
    const geoJsonStr = OgcService.exportGeoJson(instruments);
    const cfReport = OgcService.generateCfMetadataReport(metadata);

    modalRoot.innerHTML = `
      <div id="export-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
        <div class="relative w-full max-w-3xl glass-panel rounded-2xl p-4 sm:p-6 text-white shadow-2xl border border-slate-700 max-h-[92vh] flex flex-col overflow-y-auto custom-scrollbar">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-800 shrink-0">
            <div class="flex items-center gap-2 sm:gap-3">
              <div class="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-lg sm:text-xl">
                🌐
              </div>
              <div>
                <h3 class="font-bold text-xs sm:text-sm tracking-wide text-white">Open Standards & Interoperability Hub</h3>
                <p class="text-[10px] sm:text-[11px] text-slate-400">OGC WMS/WCS Services, CF-1.8 Conventions & GeoJSON In-Situ Export</p>
              </div>
            </div>
            <button id="btn-close-export" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer text-base sm:text-lg">
              ✕
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex flex-wrap border-b border-slate-800 my-2 sm:my-3 gap-1.5 sm:gap-2 shrink-0">
            <button id="tab-btn-wms" class="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-t-lg font-bold text-[10px] sm:text-xs bg-slate-800 text-emerald-400 border-b-2 border-emerald-400 cursor-pointer">
              OGC WMS 1.3.0 XML
            </button>
            <button id="tab-btn-geojson" class="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-t-lg font-bold text-[10px] sm:text-xs text-slate-400 hover:text-white cursor-pointer">
              In-Situ GeoJSON (${instruments.length} Platforms)
            </button>
            <button id="tab-btn-cf" class="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-t-lg font-bold text-[10px] sm:text-xs text-slate-400 hover:text-white cursor-pointer">
              CF-1.8 Metadata Report
            </button>
          </div>

          <!-- Code View Area -->
          <div class="flex-1 min-h-[200px] sm:min-h-[260px] bg-slate-950 p-2 sm:p-3 rounded-xl border border-slate-800 overflow-y-auto font-mono text-[10px] sm:text-[11px] text-slate-300 custom-scrollbar relative">
            <pre id="export-code-content" class="whitespace-pre-wrap select-all"></pre>
          </div>

          <!-- Actions -->
          <div class="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-slate-800 shrink-0">
            <span class="text-[10px] sm:text-[11px] text-slate-400 font-mono">Complies with OGC, ISO-19115 & CF-1.8 NetCDF</span>
            <div class="flex gap-2">
              <button id="btn-copy-code" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition cursor-pointer">
                📋 Copy
              </button>
              <button id="btn-download-export" class="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer">
                📥 Download File
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const closeExport = () => {
      modalRoot.innerHTML = '';
    };

    document.getElementById('btn-close-export').addEventListener('click', closeExport);
    document.getElementById('export-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'export-backdrop') closeExport();
    });

    const codeEl = document.getElementById('export-code-content');
    let currentMode = 'WMS';
    let currentPayload = wmsXml;
    let currentFileName = 'incois_wms_capabilities.xml';
    let currentMime = 'text/xml';

    const setContent = (mode, text, fileName, mime) => {
      currentMode = mode;
      currentPayload = text;
      currentFileName = fileName;
      currentMime = mime;
      codeEl.textContent = text;

      ['tab-btn-wms', 'tab-btn-geojson', 'tab-btn-cf'].forEach((id) => {
        const btn = document.getElementById(id);
        btn.className = 'px-3 py-1.5 rounded-t-lg font-bold text-xs text-slate-400 hover:text-white cursor-pointer';
      });

      const activeId = mode === 'WMS' ? 'tab-btn-wms' : mode === 'GEOJSON' ? 'tab-btn-geojson' : 'tab-btn-cf';
      document.getElementById(activeId).className = 'px-3 py-1.5 rounded-t-lg font-bold text-xs bg-slate-800 text-emerald-400 border-b-2 border-emerald-400 cursor-pointer';
    };

    setContent('WMS', wmsXml, 'incois_wms_capabilities.xml', 'text/xml');

    document.getElementById('tab-btn-wms').addEventListener('click', () => {
      setContent('WMS', wmsXml, 'incois_wms_capabilities.xml', 'text/xml');
    });

    document.getElementById('tab-btn-geojson').addEventListener('click', () => {
      setContent('GEOJSON', geoJsonStr, 'incois_insitu_network.geojson', 'application/geo+json');
    });

    document.getElementById('tab-btn-cf').addEventListener('click', () => {
      setContent('CF', cfReport, 'incois_cf18_metadata.txt', 'text/plain');
    });

    document.getElementById('btn-copy-code').addEventListener('click', () => {
      navigator.clipboard.writeText(currentPayload);
      const btn = document.getElementById('btn-copy-code');
      btn.textContent = '✓ Copied!';
      setTimeout(() => (btn.textContent = '📋 Copy'), 1500);
    });

    document.getElementById('btn-download-export').addEventListener('click', () => {
      const blob = new Blob([currentPayload], { type: currentMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFileName;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
