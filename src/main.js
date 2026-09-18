import { OceanDataEngine } from './engine/oceanDataEngine.js';
import { ColormapEngine } from './engine/colormapEngine.js';
import { ValidationEngine } from './engine/validationEngine.js';
import { SensorRegistry } from './engine/sensorRegistry.js';
import { ThreeScene } from './renderer/threeScene.js';
import { VectorFieldFlow } from './renderer/vectorFieldFlow.js';
import { InstrumentMarkers } from './renderer/instrumentMarkers.js';
import { ControlPanel } from './ui/controlPanel.js';
import { TimelinePlayer } from './ui/timelinePlayer.js';
import { ProfileChartModal } from './ui/profileChartModal.js';
import { SubsurfaceCubeViewer } from './ui/subsurfaceCubeViewer.js';
import { StoryModal } from './ui/storyModal.js';
import { TransectModal } from './ui/transectModal.js';
import { DataUploadModal } from './ui/dataUploadModal.js';
import { OgcExportModal } from './ui/ogcExportModal.js';
import { LiveApiService } from './engine/liveApiService.js';

import initialArgoProfiles from './data/argoProfiles.json';
import initialGliderMissions from './data/gliderMissions.json';
import initialMooringBuoys from './data/mooringBuoys.json';
import initialCtdCasts from './data/ctdCasts.json';

class App {
  constructor() {
    this.oceanEngine = new OceanDataEngine();
    this.sensorRegistry = new SensorRegistry();

    this.currentVar = 'temp';
    this.currentPalette = 'thermal';
    this.currentTimeIdx = 0;
    this.activeStory = null;
    this.storyStepIdx = 0;

    // Load in-situ observational networks
    this.sensorRegistry.load(initialArgoProfiles, 'ARGO');
    this.sensorRegistry.load(initialGliderMissions, 'GLIDER');
    this.sensorRegistry.load(initialMooringBuoys, 'MOORING');
    this.sensorRegistry.load(initialCtdCasts, 'CTD');

    // Micro 3D Sub-Surface Ocean Cube Studio
    this.subsurfaceCubeViewer = new SubsurfaceCubeViewer(this.oceanEngine, ColormapEngine);

    this.initViewport();
    this.initControls();
    this.initTimeline();
    this.initHeaderActions();
    this.initCameraPresets();
    this.initCursorHUD();
    this.startLoop();
    this.updateData();
    this.syncLiveObservingNetwork();
  }

  initViewport() {
    const viewportContainer = document.getElementById('viewport-container');
    this.threeScene = new ThreeScene(viewportContainer);
    this.vectorFlow = new VectorFieldFlow(this.threeScene.oceanGroup, this.threeScene.globeRadius);

    // Multi-Sensor Observing Networks Marker Manager
    this.instrumentMarkers = new InstrumentMarkers(
      this.threeScene.oceanGroup,
      this.threeScene.camera,
      this.threeScene.renderer.domElement,
      (item, type) => this.handleSelectInstrument(item, type)
    );

    this.refreshInstrumentMarkers();
  }

  refreshInstrumentMarkers() {
    const all = this.sensorRegistry.getAll();
    this.instrumentMarkers.loadInstruments({
      argoList: all.filter((i) => i.instrument_type === 'ARGO'),
      gliderList: all.filter((i) => i.instrument_type === 'GLIDER'),
      mooringList: all.filter((i) => i.instrument_type === 'MOORING'),
      ctdList: all.filter((i) => i.instrument_type === 'CTD'),
    });
  }

  initControls() {
    const leftContainer = document.getElementById('layer-catalog-container');
    const rightContainer = document.getElementById('controls-sidebar-container');

    this.controlPanel = new ControlPanel({
      leftContainer,
      rightContainer,
      onVariableChange: (v, pal) => this.handleVariableChange(v, pal),
      onColormapChange: (pal, opts) => this.handleColormapChange(pal, opts),
      onExaggerationChange: (exag) => this.threeScene.setExaggeration(exag),
      onOpacityChange: (op) => this.updateData(),
      onLayerToggle: (layers) => {
        this.threeScene.setCoastlineVisible(layers.coastline);
        this.threeScene.setEezVisible(layers.eez);
        this.vectorFlow.setVisible(layers.vectors);
        this.instrumentMarkers.setVisible(layers);
      },
      onOpenWaterCube: (lat, lon, varName) => {
        const sensor = this.controlPanel?.activeSensor || null;
        this.subsurfaceCubeViewer.open(lat, lon, varName || this.currentVar, sensor);
      },
    });
  }

  initCameraPresets() {
    const btnGlobe = document.getElementById('btn-cam-globe');
    const btnBasin = document.getElementById('btn-cam-basin');
    const btnArabian = document.getElementById('btn-cam-arabian');
    const btnBengal = document.getElementById('btn-cam-bengal');

    const updateActivePill = (activeBtn) => {
      [btnGlobe, btnBasin, btnArabian, btnBengal].forEach((btn) => {
        if (!btn) return;
        btn.className =
          btn === activeBtn
            ? 'px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1 cursor-pointer font-bold'
            : 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer';
      });
    };

    if (btnGlobe) {
      btnGlobe.addEventListener('click', () => {
        this.threeScene.goToPreset('globe');
        updateActivePill(btnGlobe);
      });
    }

    if (btnBasin) {
      btnBasin.addEventListener('click', () => {
        this.threeScene.goToPreset('basin');
        updateActivePill(btnBasin);
      });
    }

    if (btnArabian) {
      btnArabian.addEventListener('click', () => {
        this.threeScene.goToPreset('arabianSea');
        updateActivePill(btnArabian);
      });
    }

    if (btnBengal) {
      btnBengal.addEventListener('click', () => {
        this.threeScene.goToPreset('bayOfBengal');
        updateActivePill(btnBengal);
      });
    }
  }

  initTimeline() {
    const timelineContainer = document.getElementById('timeline-container');
    const timeSteps = this.oceanEngine.getMetadata().time_steps;
    const currentUtcHour = new Date().getUTCHours();
    const currentSynopticStep = Math.min(timeSteps.length - 1, Math.floor(currentUtcHour / 3));

    this.timeline = new TimelinePlayer(
      timelineContainer,
      timeSteps,
      (tIdx) => this.handleTimeChange(tIdx),
      currentSynopticStep
    );
    this.currentTimeStep = currentSynopticStep;
  }

  initHeaderActions() {
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('layer-catalog-container');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          const isClosed = sidebar.classList.contains('-translate-x-full');
          if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            if (backdrop) backdrop.classList.remove('hidden');
          } else {
            sidebar.classList.add('-translate-x-full');
            if (backdrop) backdrop.classList.add('hidden');
          }
        } else {
          sidebar.classList.toggle('hidden');
          setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        }
      });

      if (backdrop) {
        backdrop.addEventListener('click', () => {
          sidebar.classList.add('-translate-x-full');
          backdrop.classList.add('hidden');
        });
      }
    }

    // 1. Story Mode
    const storyBtn = document.getElementById('btn-story-mode');
    if (storyBtn) {
      storyBtn.addEventListener('click', () => {
        StoryModal.show((story) => this.startStory(story));
      });
    }

    // 2. Transect Cross-Section Tool
    const transectBtn = document.getElementById('btn-transect-tool');
    if (transectBtn) {
      transectBtn.addEventListener('click', () => {
        TransectModal.show(this.oceanEngine, this.currentVar, this.currentTimeIdx);
      });
    }

    // 3. Multi-Format Data Ingestion
    const uploadBtn = document.getElementById('btn-data-upload');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        DataUploadModal.show(
          (newItems, type) => {
            this.sensorRegistry.load(newItems, type);
            this.refreshInstrumentMarkers();
          },
          (parsedNetCdf) => {
            this.oceanEngine.loadNetCdfDataset(parsedNetCdf);
            if (parsedNetCdf.availableVariables?.[0]) {
              this.currentVar = parsedNetCdf.availableVariables[0].id;
            }
            this.updateData();
          }
        );
      });
    }

    // 4. OGC WMS/WCS Export
    const exportBtn = document.getElementById('btn-export-ogc');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        OgcExportModal.show(this.oceanEngine.getMetadata(), this.sensorRegistry.getAll());
      });
    }
  }

  initCursorHUD() {
    const hudText = document.getElementById('hover-coord-text');
    const domElement = this.threeScene.renderer.domElement;

    domElement.addEventListener('pointermove', (e) => {
      const rect = domElement.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;

      // Project approx cursor coords in Indian Ocean
      const lon = (50.0 + nx * 45.0).toFixed(1);
      const lat = (25.0 - ny * 25.0).toFixed(1);
      const depth = 10;

      if (hudText && lat >= 0 && lat <= 25 && lon >= 50 && lon <= 95) {
        const val = this.oceanEngine.samplePoint(this.currentVar, this.currentTimeIdx, parseFloat(lat), parseFloat(lon), depth);
        const unit = this.currentVar === 'temp' ? '°C' : this.currentVar === 'salt' ? 'PSU' : this.currentVar === 'oxygen' ? 'µmol/kg' : 'mg/m³';
        hudText.textContent = `Lat: ${lat}°N • Lon: ${lon}°E • Depth: ${depth}m • ${this.currentVar.toUpperCase()}: ${val.toFixed(2)} ${unit}`;
      }
    });
  }

  async syncLiveObservingNetwork() {
    try {
      const liveFloats = await LiveApiService.fetchLiveArgoFloats();
      if (liveFloats && liveFloats.length > 0) {
        this.sensorRegistry.load(liveFloats, 'ARGO');
        this.refreshInstrumentMarkers();
        const indicator = document.getElementById('live-incois-indicator');
        if (indicator) {
          indicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> INCOIS THREDDS & ARGO LIVE (${liveFloats.length} floats)`;
        }
      }
    } catch (err) {
      console.warn('Live Argo sync skipped:', err);
    }
  }

  async updateData() {
    const vol = this.oceanEngine.get3DVolume(this.currentVar, this.currentTimeIdx);
    const lut = ColormapEngine.getLut(this.currentPalette, 256, {
      isReversed: this.controlPanel?.isReversed || false,
      isLogScale: this.controlPanel?.isLogScale || false,
    });

    let liveWmsImg = null;
    try {
      liveWmsImg = await LiveApiService.fetchIncoisWmsImage(this.currentVar);
    } catch {
      // Offline or variable not hosted on WMS (e.g., chlorophyll / salt)
    }

    // Update 3D Earth Globe ocean scalar texture
    this.threeScene.updateOceanData(vol, lut, this.controlPanel?.opacity || 0.85, liveWmsImg);

    // Update top header badge
    const badge = document.getElementById('active-variable-badge');
    if (badge) {
      const varNames = {
        temp: liveWmsImg ? 'SST (Live INCOIS ncWMS)' : 'Potential Temp (°C)',
        salt: 'Practical Salinity (PSU)',
        chlorophyll: 'Chlorophyll-a (mg/m³)',
        current: liveWmsImg ? 'Currents (Live INCOIS ncWMS)' : 'Current Velocity (m/s)',
        u: 'Current Velocity (m/s)',
        w: 'Upwelling Velocity (m/s)',
        oxygen: 'Dissolved Oxygen OMZ (µmol/kg)',
        mld: 'Mixed Layer Depth (Live INCOIS ncWMS)',
        d20: 'D20 Isotherm Depth (Live INCOIS ncWMS)',
        waves: 'Significant Wave Height (Live INCOIS WW3)',
      };
      badge.textContent = varNames[this.currentVar] || this.currentVar;
    }
  }

  handleVariableChange(varName, palette) {
    this.currentVar = varName;
    this.currentPalette = palette || 'thermal';
    this.updateData();
  }

  handleColormapChange(pal, opts = {}) {
    this.currentPalette = pal;
    this.updateData();
  }

  handleTimeChange(tIdx) {
    this.currentTimeIdx = tIdx;
    this.updateData();
  }

  handleSelectInstrument(item, type) {
    // 1. Show docked telemetry in Right Sidebar
    this.controlPanel.showSensorTelemetry(item, type);

    // 2. Open full validation chart with CTA to launch 3D Subsurface Cube Viewer
    const openCubeFn = (lat, lon, v) => this.subsurfaceCubeViewer.open(lat, lon, v || this.currentVar, item);

    if (type === 'GLIDER') {
      const report = ValidationEngine.validateGlider(
        item,
        this.oceanEngine,
        this.currentVar,
        this.currentTimeIdx
      );
      const formatted = {
        platform_id: item.mission_id,
        wmo_id: item.mission_id,
        basin: item.mission_name || 'Glider Diving Transect',
        instrument_type: 'GLIDER',
        variable: this.currentVar,
        latitude: item.waypoints[0].latitude,
        longitude: item.waypoints[0].longitude,
        timestamp: item.waypoints[0].timestamp,
        metrics: report.metrics,
        comparison: report.comparison,
        onOpenWaterCube: openCubeFn,
      };
      ProfileChartModal.show(formatted);
    } else {
      const report = ValidationEngine.validateArgo(
        item,
        this.oceanEngine,
        this.currentVar,
        this.currentTimeIdx
      );
      report.onOpenWaterCube = openCubeFn;
      ProfileChartModal.show(report);
    }
  }

  startStory(story) {
    this.activeStory = story;
    this.storyStepIdx = 0;
    this.applyStoryStep(story.steps[0]);

    StoryModal.renderStoryHUD(
      this.activeStory,
      this.storyStepIdx,
      () => this.handleNextStoryStep(),
      () => this.handlePrevStoryStep(),
      () => this.handleExitStory()
    );
  }

  applyStoryStep(step) {
    if (step.variable && step.variable !== this.currentVar) {
      this.currentVar = step.variable;
      this.currentPalette = step.palette || 'thermal';
    }
    if (step.exaggeration) {
      this.threeScene.setExaggeration(step.exaggeration);
    }
    if (step.camera) {
      this.threeScene.flyTo(step.camera.pos, step.camera.target);
    }
    this.updateData();
  }

  handleNextStoryStep() {
    this.storyStepIdx++;
    if (this.storyStepIdx < this.activeStory.steps.length) {
      this.applyStoryStep(this.activeStory.steps[this.storyStepIdx]);
      StoryModal.renderStoryHUD(
        this.activeStory,
        this.storyStepIdx,
        () => this.handleNextStoryStep(),
        () => this.handlePrevStoryStep(),
        () => this.handleExitStory()
      );
    }
  }

  handlePrevStoryStep() {
    if (this.storyStepIdx > 0) {
      this.storyStepIdx--;
      this.applyStoryStep(this.activeStory.steps[this.storyStepIdx]);
      StoryModal.renderStoryHUD(
        this.activeStory,
        this.storyStepIdx,
        () => this.handleNextStoryStep(),
        () => this.handlePrevStoryStep(),
        () => this.handleExitStory()
      );
    }
  }

  handleExitStory() {
    this.activeStory = null;
    this.threeScene.goToPreset('basin');
  }

  startLoop() {
    const tick = () => {
      requestAnimationFrame(tick);
      this.vectorFlow.update();
      if (this.instrumentMarkers) {
        this.instrumentMarkers.update();
      }
    };
    tick();
  }
}

// Bootstrap on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
