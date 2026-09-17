import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  INDIA_COASTLINE,
  SRI_LANKA_COASTLINE,
  ANDAMAN_ISLANDS,
  NICOBAR_ISLANDS,
  LAKSHADWEEP_ISLANDS,
  INDIA_EEZ_BOUNDARY,
  KEY_STATIONS,
} from '../data/geospatialData.js';

export class ThreeScene {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617); // Deep slate ocean navy

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 2000);
    this.camera.position.set(0, 160, 240);

    // Renderer (WebGL2 with high precision for 3D textures)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 800;
    this.controls.minDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.15; // Allow slight under-ocean viewing

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(120, 220, 120);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x0284c7, 0.6);
    dirLight2.position.set(-120, -100, -120);
    this.scene.add(dirLight2);

    // Bounding Box Group for 3D Ocean Volume
    this.oceanGroup = new THREE.Group();
    this.scene.add(this.oceanGroup);

    // Geospatial Subgroups
    this.coastlineGroup = new THREE.Group();
    this.eezGroup = new THREE.Group();
    this.bathymetryGroup = new THREE.Group();
    this.oceanGroup.add(this.coastlineGroup);
    this.oceanGroup.add(this.eezGroup);
    this.oceanGroup.add(this.bathymetryGroup);

    // Camera animation state
    this.targetCamPos = null;
    this.targetLookAt = null;

    this.setupBoundingBox();
    this.setupGeospatialLayers();
    this.setup3DBathymetry();
    this.setupResizeListener();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  // Geographic Projection: [Lon 50..95 -> X -100..100, Lat 0..25 -> Z 75..-75, Depth 0..2000 -> Y 0..-40]
  projectCoord(lat, lon, depth = 0) {
    const x = ((lon - 50.0) / 45.0 - 0.5) * 200.0;
    const z = -((lat - 0.0) / 25.0 - 0.5) * 150.0;
    const y = -(depth / 2000.0) * 40.0;
    return new THREE.Vector3(x, y, z);
  }

  setupBoundingBox() {
    // Ocean Box dimensions: X: 200 (Longitudes 50E-95E), Y: 40 (Depth 0-2000m), Z: 150 (Latitudes 0N-25N)
    const boxGeo = new THREE.BoxGeometry(200, 40, 150);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.7,
      linewidth: 1,
    });
    this.bboxMesh = new THREE.LineSegments(edges, lineMat);
    this.bboxMesh.position.set(0, -20, 0);
    this.oceanGroup.add(this.bboxMesh);

    // Sea Surface Translucent Plane at Depth = 0
    const surfaceGeo = new THREE.PlaneGeometry(200, 150);
    const surfaceMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    });
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.position.set(0, 0, 0);
    this.oceanGroup.add(surfaceMesh);

    // Geographic boundary markers / labels
    this.createAxisLabels();
  }

  setupGeospatialLayers() {
    // 1. Indian Mainland & Island Coastlines
    const coastMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8, // Luminous cyan
      linewidth: 2,
    });

    const createCoastLine = (coords, isLoop = false) => {
      const points = coords.map(([lon, lat]) => this.projectCoord(lat, lon, 0.2));
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = isLoop ? new THREE.LineLoop(geo, coastMat) : new THREE.Line(geo, coastMat);
      this.coastlineGroup.add(line);
    };

    createCoastLine(INDIA_COASTLINE, false);
    createCoastLine(SRI_LANKA_COASTLINE, true);
    createCoastLine(ANDAMAN_ISLANDS, true);
    createCoastLine(NICOBAR_ISLANDS, true);
    createCoastLine(LAKSHADWEEP_ISLANDS, true);

    // 2. Indian Exclusive Economic Zone (EEZ) Boundary (200 NM sovereign frontier)
    const eezPoints = INDIA_EEZ_BOUNDARY.map(([lon, lat]) => this.projectCoord(lat, lon, 0.4));
    const eezGeo = new THREE.BufferGeometry().setFromPoints(eezPoints);
    const eezMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b, // Amber Gold
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
    const eezLine = new THREE.Line(eezGeo, eezMat);
    this.eezGroup.add(eezLine);

    // 3. Station Labels (INCOIS, NIOT, NIO)
    KEY_STATIONS.forEach((stn) => {
      const pos = this.projectCoord(stn.lat, stn.lon, -1.0);
      const beaconGeo = new THREE.ConeGeometry(1.2, 4, 8);
      beaconGeo.rotateX(Math.PI);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.copy(pos);
      this.coastlineGroup.add(beaconMesh);
    });
  }

  setup3DBathymetry() {
    // 3D Contoured Seafloor Mesh (200 x 150, 40 x 30 grid)
    const gridX = 40;
    const gridZ = 30;
    const bathyGeo = new THREE.PlaneGeometry(200, 150, gridX, gridZ);
    bathyGeo.rotateX(-Math.PI / 2);

    const posAttr = bathyGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // Convert x, z back to approx lon, lat
      const lon = 50.0 + ((x / 200.0) + 0.5) * 45.0;
      const lat = -(z / 150.0 - 0.5) * 25.0;

      // Realistic bathymetric elevation calculation
      // Continental shelf: shallow off Gujarat/Mumbai (Lon 68-73, Lat 18-23)
      let depthMeters = 3600; // Deep ocean abyss

      // Shallow shelf near India West Coast
      if (lon > 70 && lon < 76 && lat > 14 && lat < 22) {
        depthMeters = 80 + Math.pow((76 - lon), 2) * 180;
      }
      // Shallow shelf near Gulf of Mannar / Palk Strait
      else if (lon > 78 && lon < 81 && lat > 8 && lat < 11) {
        depthMeters = 40 + Math.abs(lon - 79.5) * 400;
      }
      // Bay of Bengal shelf & Bengal submarine fan
      else if (lon > 86 && lat > 18) {
        depthMeters = 150 + (22 - lat) * 350;
      }
      // Chagos-Laccadive submarine ridge (Lon ~72-73, Lat 8-14)
      else if (lon > 71.5 && lon < 73.5 && lat > 8 && lat < 14) {
        depthMeters = 1200;
      } else {
        depthMeters = 2000 + Math.sin(lon * 0.4) * 300;
      }

      // Map depth meters (0..2000) to scene Y (0..-40)
      const sceneY = -Math.min(40.0, (depthMeters / 2000.0) * 40.0);
      posAttr.setY(i, sceneY);
    }

    bathyGeo.computeVertexNormals();

    const bathyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: false,
      flatShading: true,
    });

    const bathyMesh = new THREE.Mesh(bathyGeo, bathyMat);
    this.bathymetryGroup.add(bathyMesh);

    // Contoured wireframe overlay for bathymetric isobaths
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const wireMesh = new THREE.Mesh(bathyGeo, wireMat);
    this.bathymetryGroup.add(wireMesh);
  }

  createAxisLabels() {
    const createLabel = (text, pos, color = '#38bdf8') => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, 252, 60);
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);

      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.set(30, 8, 1);
      this.oceanGroup.add(sprite);
    };

    createLabel('Arabian Sea (65°E)', new THREE.Vector3(-60, 6, 0), '#38bdf8');
    createLabel('Bay of Bengal (88°E)', new THREE.Vector3(60, 6, 0), '#38bdf8');
    createLabel('Indian EEZ Boundary', new THREE.Vector3(20, 6, 40), '#f59e0b');
    createLabel('Equator (0°N)', new THREE.Vector3(0, 6, 85), '#94a3b8');
    createLabel('Northern Limit (25°N)', new THREE.Vector3(0, 6, -85), '#94a3b8');
    createLabel('Abyss: 2000m Bathymetry', new THREE.Vector3(0, -42, 0), '#64748b');
  }

  setExaggeration(factor) {
    // factor ranges from 1 to 80 (default 25)
    const scaleY = factor / 25.0;
    this.oceanGroup.scale.set(1.0, scaleY, 1.0);
  }

  setCoastlineVisible(visible) {
    this.coastlineGroup.visible = visible;
  }

  setEezVisible(visible) {
    this.eezGroup.visible = visible;
  }

  setBathymetryVisible(visible) {
    this.bathymetryGroup.visible = visible;
  }

  flyTo(pos, target, duration = 1.5) {
    this.targetCamPos = new THREE.Vector3(...pos);
    this.targetLookAt = new THREE.Vector3(...target);
  }

  setupResizeListener() {
    const handleResize = () => {
      if (!this.container) return;
      this.width = this.container.clientWidth;
      this.height = this.container.clientHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    };

    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(handleResize);
    ro.observe(this.container);
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Smooth camera transition if flyTo is active
    if (this.targetCamPos && this.targetLookAt) {
      this.camera.position.lerp(this.targetCamPos, 0.04);
      this.controls.target.lerp(this.targetLookAt, 0.04);

      if (this.camera.position.distanceTo(this.targetCamPos) < 1.0) {
        this.targetCamPos = null;
        this.targetLookAt = null;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
