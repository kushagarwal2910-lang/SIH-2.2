import { OceanDataEngine } from './engine/oceanDataEngine.js';
import { ColormapEngine } from './engine/colormapEngine.js';
import { ValidationEngine } from './engine/validationEngine.js';
import { SensorRegistry } from './engine/sensorRegistry.js';
import { ThreeScene } from './renderer/threeScene.js';
import { VolumeRaymarcher } from './renderer/volumeRaymarcher.js';
import { VectorFieldFlow } from './renderer/vectorFieldFlow.js';
import { InstrumentMarkers } from './renderer/instrumentMarkers.js';
import { ControlPanel } from './ui/controlPanel.js';
import { TimelinePlayer } from './ui/timelinePlayer.js';
import { ProfileChartModal } from './ui/profileChartModal.js';
import { StoryModal } from './ui/storyModal.js';
import { TransectModal } from './ui/transectModal.js';
import { DataUploadModal } from './ui/dataUploadModal.js';
import { OgcExportModal } from './ui/ogcExportModal.js';

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

    // Load in-situ observational networks into sensor registry
    this.sensorRegistry.load(initialArgoProfiles, 'ARGO');
    this.sensorRegistry.load(initialGliderMissions, 'GLIDER');
    this.sensorRegistry.load(initialMooringBuoys, 'MOORING');
    this.sensorRegistry.load(initialCtdCasts, 'CTD');

    this.initViewport();
    this.initControls();
    this.initTimeline();
    this.initHeaderActions();
    this.initCursorHUD();
    this.startLoop();
    this.updateData();
  }

  initViewport() {
    const viewportContainer = document.getElementById('viewport-container');
    this.threeScene = new ThreeScene(viewportContainer);
    this.volumeRaymarcher = new VolumeRaymarcher(this.threeScene.oceanGroup);
    this.vectorFlow = new VectorFieldFlow(this.threeScene.oceanGroup);

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
    const controlContainer = document.getElementById('control-panel-container');
    this.controlPanel = new ControlPanel(
      controlContainer,
      (v, pal) => this.handleVariableChange(v, pal),
      (pal, opts) => this.handleColormapChange(pal, opts),
      (exag) => this.threeScene.setExaggeration(exag),
      (op) => this.volumeRaymarcher.setParams({ opacity: op }),
      (iso, val) => this.volumeRaymarcher.setParams({ isIsosurface: iso, isovalue: val }),
      (clip) => this.volumeRaymarcher.setParams({ clipDepth: clip }),
      (layers) => {
        // Geospatial Layers
        this.threeScene.setCoastlineVisible(layers.coastline);
        this.threeScene.setEezVisible(layers.eez);
        this.threeScene.setBathymetryVisible(layers.bathymetry);

        // Vector currents
        this.vectorFlow.setVisible(layers.vectors);

        // Observing Networks
        this.instrumentMarkers.setVisible({
          argo: layers.argo,
          gliders: layers.gliders,
          moorings: layers.moorings,
          ctd: layers.ctd,
        });
      },
      (variable, min, max) => {
        // Dynamic Range Change
        this.updateData();
      }
    );
  }

  initTimeline() {
    const timelineContainer = document.getElementById('timeline-container');
    this.timeline = new TimelinePlayer(
      timelineContainer,
      this.oceanEngine.getMetadata().time_steps,
      (tIdx) => this.handleTimeChange(tIdx)
    );
  }

  initHeaderActions() {
    // 1. Story Mode (Audio-Guided Outreach)
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

    // 3. Multi-Format Data Ingestion (NetCDF, CSV, JSON)
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
            // Select first variable if available
            if (parsedNetCdf.availableVariables?.[0]) {
              this.currentVar = parsedNetCdf.availableVariables[0].id;
            }
            this.updateData();
          }
        );
      });
    }

    // 4. OGC WMS/WCS & Standards Export Tool
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

      // Project screen normalized coordinate to ocean domain
      const lon = (50.0 + nx * 45.0).toFixed(1);
      const lat = (25.0 - ny * 25.0).toFixed(1);
      const depth = 10; // Surface sample

      if (hudText && lat >= 0 && lat <= 25 && lon >= 50 && lon <= 95) {
        const val = this.oceanEngine.samplePoint(this.currentVar, this.currentTimeIdx, parseFloat(lat), parseFloat(lon), depth);
        const unit = this.currentVar === 'temp' ? '°C' : this.currentVar === 'salt' ? 'PSU' : this.currentVar === 'oxygen' ? 'µmol/kg' : 'mg/m³';
        hudText.textContent = `Lat: ${lat}°N • Lon: ${lon}°E • Depth: ${depth}m • ${this.currentVar.toUpperCase()}: ${val.toFixed(2)} ${unit}`;
      }
    });
  }

  updateData() {
    const vol = this.oceanEngine.get3DVolume(this.currentVar, this.currentTimeIdx);
    const lut = ColormapEngine.getLut(this.currentPalette, 256, {
      isReversed: this.controlPanel?.isReversed || false,
      isLogScale: this.controlPanel?.isLogScale || false,
    });
    this.volumeRaymarcher.updateVolume(vol, lut);

    // Update top header badge
    const badge = document.getElementById('active-variable-badge');
    if (badge) {
      const varNames = {
        temp: 'Potential Temp (°C)',
        salt: 'Practical Salinity (PSU)',
        chlorophyll: 'Chlorophyll-a (mg/m³)',
        u: 'Eastward Velocity U (m/s)',
        w: 'Vertical Velocity W (m/s)',
        oxygen: 'Dissolved Oxygen OMZ (µmol/kg)',
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
    const lut = ColormapEngine.getLut(this.currentPalette, 256, opts);
    const vol = this.oceanEngine.get3DVolume(this.currentVar, this.currentTimeIdx);
    this.volumeRaymarcher.updateVolume(vol, lut);
  }

  handleTimeChange(tIdx) {
    this.currentTimeIdx = tIdx;
    this.updateData();
  }

  handleSelectInstrument(item, type) {
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
      };
      ProfileChartModal.show(formatted);
    } else {
      // Argo, OMNI Mooring, or CTD
      const report = ValidationEngine.validateArgo(
        item,
        this.oceanEngine,
        this.currentVar,
        this.currentTimeIdx
      );
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
      this.controlPanel.setExaggeration(step.exaggeration);
    }
    if (step.isIsosurface !== undefined) {
      this.volumeRaymarcher.setParams({
        isIsosurface: step.isIsosurface,
        isovalue: step.isovalue || 0.5,
      });
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
    this.threeScene.flyTo([0, 160, 240], [0, -20, 0]);
  }

  startLoop() {
    const tick = () => {
      requestAnimationFrame(tick);
      this.vectorFlow.update();
    };
    tick();
  }
}

// Bootstrap on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
