import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  INDIA_FULL_BORDER,
  INDIA_COASTLINE,
  SRI_LANKA_COASTLINE,
  ANDAMAN_ISLANDS,
  NICOBAR_ISLANDS,
  LAKSHADWEEP_ISLANDS,
  INDIA_EEZ_BOUNDARY,
  KEY_STATIONS,
} from '../data/geospatialData.js';
import { createEarthCanvasTexture, renderOceanDataOnCanvas } from './earthTexture.js';

export class ThreeScene {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    this.globeRadius = 100.0;
    this.depthScale = 8.0;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617); // Deep cosmic navy/black

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 3000);
    // Position camera facing Indian Ocean basin by default
    this.camera.position.set(32, 60, -230);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 1200;
    this.controls.minDistance = 105;
    this.controls.target.set(21, 34, -91); // Centered on India basin

    // Lighting (Comprehensive planetary illumination so all continents are clearly visible)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.65);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    sunLight.position.set(250, 300, -250);
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    fillLight.position.set(-250, -100, 200);
    this.scene.add(fillLight);

    // Master Ocean / Globe Group
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

    this.setupStarfield();
    this.setupEarthGlobe();
    this.setupAtmosphereGlow();
    this.setupGeospatialLayers();
    this.setupResizeListener();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  // Geographic Projection: Spherical conversion matching Three.js SphereGeometry UV mapping
  projectCoord(lat, lon, depth = 0, surfaceElevation = 0) {
    const phi = (lat * Math.PI) / 180.0;
    const theta = ((lon + 180.0) * Math.PI) / 180.0;
    const r = this.globeRadius - (depth / 2000.0) * this.depthScale + surfaceElevation;
    const x = -r * Math.cos(phi) * Math.cos(theta);
    const y = r * Math.sin(phi);
    const z = r * Math.cos(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  }

  setupStarfield() {
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCols = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 900 + Math.random() * 800;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      starPos[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = radius * Math.cos(phi);

      const hue = Math.random();
      if (hue > 0.8) {
        starCols[i * 3 + 0] = 0.7;
        starCols[i * 3 + 1] = 0.85;
        starCols[i * 3 + 2] = 1.0;
      } else {
        starCols[i * 3 + 0] = 0.95;
        starCols[i * 3 + 1] = 0.95;
        starCols[i * 3 + 2] = 0.95;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
    this.starfield = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starfield);
  }

  setupEarthGlobe() {
    // Pass onLoadedCallback so texture immediately uploads to GPU when satellite image finishes loading
    this.earthCanvasData = createEarthCanvasTexture(() => {
      if (this.earthTexture) {
        this.earthTexture.needsUpdate = true;
      }
    });
    this.earthTexture = new THREE.CanvasTexture(this.earthCanvasData.canvas);
    this.earthTexture.colorSpace = THREE.SRGBColorSpace;
    this.earthTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.earthTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.earthTexture.generateMipmaps = true;

    // Load satellite specular roughness and normal bump maps
    const texLoader = new THREE.TextureLoader();
    const roughnessMap = texLoader.load('./textures/earth_roughness_2048.jpg');
    const normalMap = texLoader.load('./textures/earth_normal_2048.jpg');
    roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
    roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
    normalMap.wrapS = THREE.ClampToEdgeWrapping;
    normalMap.wrapT = THREE.ClampToEdgeWrapping;

    const globeGeo = new THREE.SphereGeometry(this.globeRadius, 96, 96);
    const globeMat = new THREE.MeshStandardMaterial({
      map: this.earthTexture,
      roughnessMap: roughnessMap,
      roughness: 0.7,
      metalness: 0.1,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
    });

    this.globeMesh = new THREE.Mesh(globeGeo, globeMat);
    this.oceanGroup.add(this.globeMesh);
  }

  setupAtmosphereGlow() {
    // Elegant Fresnel atmospheric limb glow around Earth
    const atmoGeo = new THREE.SphereGeometry(this.globeRadius * 1.02, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vEye;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vEye = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vEye;
        void main() {
          float rim = 1.0 - max(dot(vEye, vNormal), 0.0);
          rim = pow(rim, 3.2);
          vec3 atmoColor = vec3(0.22, 0.74, 0.97); // Luminous cyan atmospheric haze
          gl_FragColor = vec4(atmoColor, rim * 0.75);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });

    this.atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    this.oceanGroup.add(this.atmosphereMesh);
  }

  updateOceanData(sliceData, colormapLut, opacity = 0.85, liveWmsImage = null) {
    if (!this.earthCanvasData) return;
    renderOceanDataOnCanvas(this.earthCanvasData, sliceData, colormapLut, opacity, liveWmsImage);
    if (this.earthTexture) {
      this.earthTexture.needsUpdate = true;
    }
  }

  setupGeospatialLayers() {
    const fullBorderMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
    });

    const createLine = (coords, isLoop = false, mat = fullBorderMat, elev = 0.08) => {
      const points = coords.map(([lon, lat]) => this.projectCoord(lat, lon, 0, elev));
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = isLoop ? new THREE.LineLoop(geo, mat) : new THREE.Line(geo, mat);
      this.coastlineGroup.add(line);
      return line;
    };

    // 1. Full Sovereign Border of India (Crisp, clean vector outline)
    createLine(INDIA_FULL_BORDER, true, fullBorderMat, 0.08);

    // 2. Sri Lanka & Islands
    const islandMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 1.2,
      transparent: true,
      opacity: 0.75,
      depthTest: true,
      depthWrite: false,
    });
    createLine(SRI_LANKA_COASTLINE, true, islandMat, 0.08);
    createLine(ANDAMAN_ISLANDS, true, islandMat, 0.08);
    createLine(NICOBAR_ISLANDS, true, islandMat, 0.08);
    createLine(LAKSHADWEEP_ISLANDS, true, islandMat, 0.08);

    // 3. Indian Exclusive Economic Zone (EEZ) Boundary (Delicate Amber Gold)
    const eezPoints = INDIA_EEZ_BOUNDARY.map(([lon, lat]) => this.projectCoord(lat, lon, 0, 0.09));
    const eezGeo = new THREE.BufferGeometry().setFromPoints(eezPoints);
    const eezMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.80,
      depthTest: true,
      depthWrite: false,
    });
    const eezLine = new THREE.Line(eezGeo, eezMat);
    this.eezGroup.add(eezLine);
  }

  setExaggeration(factor) {
    this.depthScale = (factor / 25.0) * 8.0;
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

  // Camera Presets
  goToPreset(presetName) {
    switch (presetName) {
      case 'globe':
        this.flyTo([0, 90, -290], [0, 0, 0]);
        break;
      case 'basin':
        this.flyTo([32, 60, -230], [21, 34, -91]);
        break;
      case 'arabianSea':
        this.flyTo([75, 65, -190], [38, 28, -88]);
        break;
      case 'bayOfBengal':
        this.flyTo([10, 65, -205], [5, 26, -96]);
        break;
      default:
        this.flyTo([32, 60, -230], [21, 34, -91]);
    }
  }

  flyTo(pos, target) {
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
      this.camera.position.lerp(this.targetCamPos, 0.05);
      this.controls.target.lerp(this.targetLookAt, 0.05);

      if (this.camera.position.distanceTo(this.targetCamPos) < 1.0) {
        this.targetCamPos = null;
        this.targetLookAt = null;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
