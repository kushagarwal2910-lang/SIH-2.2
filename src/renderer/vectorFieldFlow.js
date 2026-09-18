import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { INDIA_FULL_BORDER } from '../data/geospatialData.js';

// Precise point-in-polygon land masking
function pointInPoly(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Creates a literal 3D vector arrow consisting of a slender shaft and a distinct flared arrowhead.
 */
function createLiteralArrowGeometry() {
  // 1. Hydrodynamic, slender arrow shaft (along Z)
  const shaftRadius = 0.055;
  const shaftLength = 1.30;
  const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 8);
  shaftGeo.rotateX(Math.PI / 2); // Align with Z
  shaftGeo.translate(0, 0, -0.15);

  // 2. Distinct, sleek tapered conical arrowhead pointing along +Z
  const headRadius = 0.22;
  const headLength = 0.60;
  const headGeo = new THREE.ConeGeometry(headRadius, headLength, 8);
  headGeo.rotateX(Math.PI / 2); // Point along +Z
  headGeo.translate(0, 0, 0.80);

  const merged = BufferGeometryUtils.mergeGeometries([shaftGeo, headGeo]);
  return merged;
}

// Distance clearance to prevent arrows from cluttering the coastline
function isNearCoast(lon, lat, minDeg = 1.1) {
  const minSq = minDeg * minDeg;
  for (let i = 0; i < INDIA_FULL_BORDER.length; i++) {
    const [bx, by] = INDIA_FULL_BORDER[i];
    const dx = lon - bx;
    const dy = lat - by;
    if (dx * dx + dy * dy < minSq) return true;
  }
  return false;
}

/**
 * Spherical Vector Field Flow: Renders directional, kinetic literal current flow arrows
 * draped over the 3D Earth Globe across the North Indian Ocean basin.
 */
export class VectorFieldFlow {
  constructor(sceneGroup, globeRadius = 100.0) {
    this.sceneGroup = sceneGroup;
    this.globeRadius = globeRadius;
    this.visible = true;
    this.time = 0;

    this.group = new THREE.Group();
    this.sceneGroup.add(this.group);

    this.initVectorGrid();
  }

  // Convert (lat, lon, altitude) to 3D Cartesian on the sphere
  projectSpherical(lat, lon, r = this.globeRadius + 0.6) {
    const phi = (lat * Math.PI) / 180.0;
    const theta = ((lon + 180.0) * Math.PI) / 180.0;
    const x = -r * Math.cos(phi) * Math.cos(theta);
    const y = r * Math.sin(phi);
    const z = r * Math.cos(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  }

  initVectorGrid() {
    // Spatial grid across North Indian Ocean with spacious, uncluttered breathing room
    const lats = [];
    for (let lat = 2.0; lat <= 22.0; lat += 3.4) lats.push(lat);
    const lons = [];
    for (let lon = 53.0; lon <= 93.0; lon += 3.8) lons.push(lon);

    const validPoints = [];

    lats.forEach((lat) => {
      lons.forEach((lon) => {
        // Strict ocean masking & coastal clearance margin
        const isIndiaLand = pointInPoly(lon, lat, INDIA_FULL_BORDER);
        const isSriLanka = (lon > 78.8 && lon < 82.5 && lat > 5.2 && lat < 10.2);
        const isArabianPeninsula = (lon < 60.5 && lat > 12.0);
        const isSomalia = (lon < 52.0 && lat < 12.5);
        const isMyanmar = (lon > 92.5 && lat > 14.5);
        const nearCoast = isNearCoast(lon, lat, 1.15);

        if (!isIndiaLand && !isSriLanka && !isArabianPeninsula && !isSomalia && !isMyanmar && !nearCoast) {
          validPoints.push({ lat, lon });
        }
      });
    });

    this.count = validPoints.length;
    this.arrowData = validPoints;

    // Build literal 3D arrow geometry (Shaft + Arrowhead)
    const arrowGeo = createLiteralArrowGeometry();

    // InstancedMesh for high-performance zero-overhead WebGL rendering
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
    });

    this.instancedMesh = new THREE.InstancedMesh(arrowGeo, arrowMat, this.count);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.baseTransforms = [];
    this.speeds = new Float32Array(this.count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    validPoints.forEach((pt, idx) => {
      const pos = this.projectSpherical(pt.lat, pt.lon);

      // Realistic Southwest Monsoon ocean circulation physics:
      let u = 0.3;
      let v = 0.1;

      // 1. Somali coastal jet (intense northward/northeast current in western Arabian Sea)
      if (pt.lon < 62.0 && pt.lat < 15.0) {
        u = 0.7 + Math.sin(pt.lat * 0.2) * 0.4;
        v = 0.9 + Math.cos(pt.lon * 0.2) * 0.35;
      }
      // 2. Southern Equatorial Current & Southwest Monsoon drift (flowing strongly eastward south of India)
      else if (pt.lat < 7.5) {
        u = 0.85 + Math.sin(pt.lon * 0.1) * 0.25;
        v = 0.12;
      }
      // 3. Bay of Bengal clockwise gyre
      else if (pt.lon > 82.0) {
        u = -Math.sin((pt.lat - 14.0) * 0.28) * 0.65;
        v = Math.cos((pt.lon - 88.0) * 0.28) * 0.55;
      }
      // 4. Central Arabian Sea circulation
      else {
        u = 0.50 + Math.cos(pt.lat * 0.15) * 0.25;
        v = 0.30 - (pt.lat / 30.0) * 0.2;
      }

      const speed = Math.sqrt(u * u + v * v);
      this.speeds[idx] = speed;

      // Exact mathematical unit vectors tangent to the sphere surface
      const phi = (pt.lat * Math.PI) / 180.0;
      const lam = (pt.lon * Math.PI) / 180.0;

      // Exact East unit vector (+lon)
      const eastUnit = new THREE.Vector3(-Math.sin(lam), 0, -Math.cos(lam)).normalize();

      // Exact North unit vector (+lat)
      const northUnit = new THREE.Vector3(
        -Math.sin(phi) * Math.cos(lam),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(lam)
      ).normalize();

      // Surface normal pointing outwards
      const normal = pos.clone().normalize();

      // True current flow direction tangent to the globe surface:
      const flowDir = new THREE.Vector3()
        .addScaledVector(eastUnit, u)
        .addScaledVector(northUnit, v)
        .normalize();

      // Lateral vector perpendicular to flow and normal
      const lateralRight = new THREE.Vector3().crossVectors(normal, flowDir).normalize();

      // Basis matrix: X = lateralRight, Y = normal (up), Z = flowDir (along arrow)
      const rotMat = new THREE.Matrix4();
      rotMat.makeBasis(lateralRight, normal, flowDir);

      dummy.position.copy(pos);
      dummy.rotation.setFromRotationMatrix(rotMat);

      // Scale arrow by speed
      const scaleVal = Math.max(0.65, Math.min(1.05, speed * 0.95));
      dummy.scale.set(scaleVal, scaleVal, scaleVal);
      dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(idx, dummy.matrix);
      this.baseTransforms.push({
        position: pos.clone(),
        rotMatrix: rotMat.clone(),
        scale: scaleVal,
        phase: Math.random() * Math.PI * 2,
      });

      // Flow speed color coding: Luminous Cyan -> Seafoam Teal -> Warm Amber Coral
      if (speed > 0.85) {
        color.setRGB(0.98, 0.58, 0.24); // Somali Jet (Amber Coral)
      } else if (speed > 0.55) {
        color.setRGB(0.18, 0.83, 0.75); // Active Drift (Seafoam Teal)
      } else {
        color.setRGB(0.22, 0.74, 0.97); // Baseline Circulation (Luminous Cyan)
      }
      this.instancedMesh.setColorAt(idx, color);
    });

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this.group.add(this.instancedMesh);
  }

  setVisible(visible) {
    this.visible = visible;
    this.group.visible = visible;
  }

  update() {
    if (!this.visible || !this.instancedMesh) return;
    this.time += 0.032;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.count; i++) {
      const base = this.baseTransforms[i];
      const speed = this.speeds[i];

      // Kinetic forward pulse along streamline
      const pulse = 1.0 + Math.sin(this.time * 2.6 * speed + base.phase) * 0.22;

      dummy.position.copy(base.position);
      dummy.rotation.setFromRotationMatrix(base.rotMatrix);
      dummy.scale.set(base.scale * pulse, base.scale * pulse, base.scale * pulse);
      dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
}
