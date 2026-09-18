import * as THREE from 'three';
import { KEY_STATIONS } from '../data/geospatialData.js';

export class InstrumentMarkers {
  constructor(sceneGroup, camera, domElement, onSelectInstrument) {
    this.sceneGroup = sceneGroup;
    this.camera = camera;
    this.domElement = domElement;
    this.onSelectInstrument = onSelectInstrument;

    this.group = new THREE.Group();
    this.sceneGroup.add(this.group);

    // Subgroups for selective layer toggling
    this.argoGroup = new THREE.Group();
    this.gliderGroup = new THREE.Group();
    this.mooringGroup = new THREE.Group();
    this.ctdGroup = new THREE.Group();
    this.stationsGroup = new THREE.Group();
    this.labelsGroup = new THREE.Group();

    this.group.add(this.argoGroup);
    this.group.add(this.gliderGroup);
    this.group.add(this.mooringGroup);
    this.group.add(this.ctdGroup);
    this.group.add(this.stationsGroup);
    this.group.add(this.labelsGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clickableObjects = [];
    this.pulseRings = [];
    this.pulsePhase = 0;

    // Interactive Dynamic Hover Tooltip Badge (appears ONLY on mouseover)
    this.initHoverTooltip();

    this.setupEvents();
  }

  // Geographic projection: Spherical conversion matching 3D Earth Globe
  projectCoord(lat, lon, depth = 0, surfaceElevation = 0) {
    const phi = (lat * Math.PI) / 180.0;
    const theta = ((lon + 180.0) * Math.PI) / 180.0;
    const r = 100.0 - (depth / 2000.0) * 8.0 + surfaceElevation;
    const x = -r * Math.cos(phi) * Math.cos(theta);
    const y = r * Math.sin(phi);
    const z = r * Math.cos(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  }

  initHoverTooltip() {
    this.tooltipCanvas = document.createElement('canvas');
    this.tooltipCanvas.width = 380;
    this.tooltipCanvas.height = 80;
    this.tooltipCtx = this.tooltipCanvas.getContext('2d');
    this.tooltipTexture = new THREE.CanvasTexture(this.tooltipCanvas);

    const badgeMat = new THREE.SpriteMaterial({
      map: this.tooltipTexture,
      transparent: true,
      depthTest: false,
    });
    this.hoverBadge = new THREE.Sprite(badgeMat);
    this.hoverBadge.scale.set(12, 2.5, 1);
    this.hoverBadge.visible = false;
    this.labelsGroup.add(this.hoverBadge);
  }

  showHoverTooltip(data, type, worldPos) {
    let icon = '🛰️';
    let title = 'ARGO FLOAT';
    let subtitle = '';
    let color = '#f59e0b';

    if (type === 'ARGO') {
      icon = '🛰️';
      title = `ARGO #${data.wmo_id || data.id || 'FLOAT'}`;
      subtitle = `${data.latitude.toFixed(2)}°N, ${data.longitude.toFixed(2)}°E • CTD Profile`;
      color = '#f59e0b';
    } else if (type === 'GLIDER') {
      icon = '🦈';
      title = `GLIDER ${data.mission_id || data.id || 'MISSION'}`;
      subtitle = `${data.mission_name || 'Deep Autonomous Transect'}`;
      color = '#06b6d4';
    } else if (type === 'MOORING') {
      icon = '⚓';
      title = `BUOY ${data.name || data.wmo_id || 'OMNI'}`;
      subtitle = `${data.basin || 'Deep-Sea Mooring'}`;
      color = '#ef4444';
    } else if (type === 'CTD') {
      icon = '🚢';
      title = `CTD: ${data.vessel || data.name || 'CRUISE'}`;
      subtitle = `${data.basin || 'Hydrographic Stn'}`;
      color = '#a855f7';
    } else if (type === 'STATION') {
      icon = data.isHQ ? '🏛️' : '⚓';
      title = `${data.name.toUpperCase()}`;
      subtitle = `${data.city} • ${data.role}`;
      color = data.isHQ ? '#f59e0b' : '#38bdf8';
    }

    const ctx = this.tooltipCtx;
    ctx.clearRect(0, 0, 380, 80);

    // Pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.beginPath();
    ctx.roundRect(4, 6, 372, 68, 16);
    ctx.fill();

    // Glowing border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Title
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`${icon} ${title}`, 20, 34);

    // Subtitle
    ctx.font = '13px monospace';
    ctx.fillStyle = color;
    ctx.fillText(subtitle, 20, 56);

    this.tooltipTexture.needsUpdate = true;
    this.hoverBadge.position.copy(worldPos).add(new THREE.Vector3(0, 3.2, 0));
    this.hoverBadge.visible = true;
  }

  hideHoverTooltip() {
    if (this.hoverBadge) {
      this.hoverBadge.visible = false;
    }
  }

  // Creates a flat surface pulse ring oriented tangential to the globe sphere
  createSurfacePulseRing(lat, lon, color = 0xf59e0b) {
    const ringGeo = new THREE.RingGeometry(1.0, 1.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthTest: true,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);

    const pos = this.projectCoord(lat, lon, 0, 0.35);
    ringMesh.position.copy(pos);
    ringMesh.lookAt(pos.clone().multiplyScalar(2.0));

    this.pulseRings.push(ringMesh);
    return ringMesh;
  }

  loadInstruments({ argoList = [], gliderList = [], mooringList = [], ctdList = [] }) {
    const clearGroup = (g) => {
      while (g.children.length > 0) g.remove(g.children[0]);
    };
    clearGroup(this.argoGroup);
    clearGroup(this.gliderGroup);
    clearGroup(this.mooringGroup);
    clearGroup(this.ctdGroup);
    clearGroup(this.stationsGroup);
    this.clickableObjects = [];
    this.pulseRings = [];

    // Invisible hit box geometry for smooth clicking & hovering
    const hitGeo = new THREE.SphereGeometry(3.2, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    // 1. ARGO PROFILING FLOATS
    argoList.forEach((argo) => {
      const argoGroup = new THREE.Group();
      const surfacePos = this.projectCoord(argo.latitude, argo.longitude, 0, 0.9);

      // Yellow buoyant cylinder hull
      const hullGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 12);
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.8,
        roughness: 0.25,
      });
      const hullMesh = new THREE.Mesh(hullGeo, hullMat);
      hullMesh.position.copy(surfacePos);
      hullMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfacePos.clone().normalize());
      argoGroup.add(hullMesh);

      // Antenna Mast + Beacon Light
      const antennaPos = this.projectCoord(argo.latitude, argo.longitude, 0, 2.0);
      const beaconGeo = new THREE.SphereGeometry(0.45, 10, 10);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.copy(antennaPos);
      argoGroup.add(beaconMesh);

      // Surface Sonar Pulse Ring
      const pulseRing = this.createSurfacePulseRing(argo.latitude, argo.longitude, 0xf59e0b);
      argoGroup.add(pulseRing);

      // Hit Box for effortless hovering & clicking
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(surfacePos);
      hitMesh.userData = { type: 'ARGO', data: argo };
      argoGroup.add(hitMesh);
      this.clickableObjects.push(hitMesh);

      // Plumbline down to 2000m depth
      const linePoints = [
        surfacePos,
        this.projectCoord(argo.latitude, argo.longitude, 2000, 0),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0xf59e0b,
        opacity: 0.65,
        transparent: true,
        dashSize: 1.5,
        gapSize: 0.8,
      });
      const plumbline = new THREE.Line(lineGeo, lineMat);
      plumbline.computeLineDistances();
      argoGroup.add(plumbline);

      // Discrete Profile Depth Sensor Beads
      if (argo.profile && argo.profile.length > 0) {
        const step = Math.max(1, Math.floor(argo.profile.length / 10));
        for (let i = 0; i < argo.profile.length; i += step) {
          const pt = argo.profile[i];
          const beadPos = this.projectCoord(argo.latitude, argo.longitude, pt.depth, 0);
          const ptGeo = new THREE.SphereGeometry(0.4, 8, 8);
          const ptMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
          const ptMesh = new THREE.Mesh(ptGeo, ptMat);
          ptMesh.position.copy(beadPos);
          argoGroup.add(ptMesh);
        }
      }

      this.argoGroup.add(argoGroup);
    });

    // 2. UNDERWATER GLIDER MISSIONS (Sawtooth Dives)
    gliderList.forEach((glider) => {
      const gliderGroup = new THREE.Group();
      const points = glider.waypoints.map((w) => this.projectCoord(w.latitude, w.longitude, w.depth, 0));

      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.5, 6, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x0891b2,
          emissiveIntensity: 0.8,
          roughness: 0.3,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.userData = { type: 'GLIDER', data: glider };
        gliderGroup.add(tubeMesh);
        this.clickableObjects.push(tubeMesh);

        // Surface waypoint icons & pulse rings
        glider.waypoints.forEach((wp, idx) => {
          const wpPos = this.projectCoord(wp.latitude, wp.longitude, wp.depth, wp.depth === 0 ? 0.8 : 0);
          const wpGeo = new THREE.SphereGeometry(idx === 0 ? 1.0 : 0.6, 8, 8);
          const wpMat = new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x0891b2,
            emissiveIntensity: 0.9,
          });
          const wpMesh = new THREE.Mesh(wpGeo, wpMat);
          wpMesh.position.copy(wpPos);
          wpMesh.userData = { type: 'GLIDER', data: glider };
          gliderGroup.add(wpMesh);
          this.clickableObjects.push(wpMesh);

          if (wp.depth <= 10) {
            const ring = this.createSurfacePulseRing(wp.latitude, wp.longitude, 0x06b6d4);
            gliderGroup.add(ring);
          }
        });

        // Hit box at surface origin
        const first = glider.waypoints[0];
        const surfOrigin = this.projectCoord(first.latitude, first.longitude, 0, 0.9);
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.position.copy(surfOrigin);
        hitMesh.userData = { type: 'GLIDER', data: glider };
        gliderGroup.add(hitMesh);
        this.clickableObjects.push(hitMesh);
      }

      this.gliderGroup.add(gliderGroup);
    });

    // 3. INCOIS OMNI & RAMA DEEP-SEA MOORED BUOYS
    mooringList.forEach((buoy) => {
      const buoyGroup = new THREE.Group();
      const surfacePos = this.projectCoord(buoy.latitude, buoy.longitude, 0, 0.9);

      // Red Toroidal Float Body
      const buoyToroidGeo = new THREE.TorusGeometry(1.2, 0.45, 10, 20);
      const buoyMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.85,
        roughness: 0.3,
      });
      const toroidMesh = new THREE.Mesh(buoyToroidGeo, buoyMat);
      toroidMesh.position.copy(surfacePos);
      toroidMesh.lookAt(surfacePos.clone().multiplyScalar(2.0));
      buoyGroup.add(toroidMesh);

      // Superstructure Tower
      const mastPos = this.projectCoord(buoy.latitude, buoy.longitude, 0, 1.9);
      const mastGeo = new THREE.ConeGeometry(0.6, 1.3, 4);
      const mastMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const mastMesh = new THREE.Mesh(mastGeo, mastMat);
      mastMesh.position.copy(mastPos);
      buoyGroup.add(mastMesh);

      // Surface Pulse Ring
      const pulseRing = this.createSurfacePulseRing(buoy.latitude, buoy.longitude, 0xef4444);
      buoyGroup.add(pulseRing);

      // Hit Box
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(surfacePos);
      hitMesh.userData = { type: 'MOORING', data: buoy };
      buoyGroup.add(hitMesh);
      this.clickableObjects.push(hitMesh);

      // Mooring Cable down to 2000m
      const cablePoints = [
        surfacePos,
        this.projectCoord(buoy.latitude, buoy.longitude, 2000, 0),
      ];
      const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePoints);
      const cableMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 1.5 });
      const cable = new THREE.Line(cableGeo, cableMat);
      buoyGroup.add(cable);

      this.mooringGroup.add(buoyGroup);
    });

    // 4. RESEARCH VESSEL CTD HYDROGRAPHIC STATIONS
    ctdList.forEach((ctd) => {
      const ctdGroup = new THREE.Group();
      const surfacePos = this.projectCoord(ctd.latitude, ctd.longitude, 0, 0.9);

      // Research Ship Hull Model
      const shipHullGeo = new THREE.ConeGeometry(1.2, 3.2, 4);
      const shipMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.85,
      });
      const shipMesh = new THREE.Mesh(shipHullGeo, shipMat);
      shipMesh.position.copy(surfacePos);
      shipMesh.lookAt(surfacePos.clone().multiplyScalar(2.0));
      ctdGroup.add(shipMesh);

      // Surface Pulse Ring
      const pulseRing = this.createSurfacePulseRing(ctd.latitude, ctd.longitude, 0xa855f7);
      ctdGroup.add(pulseRing);

      // Hit Box
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(surfacePos);
      hitMesh.userData = { type: 'CTD', data: ctd };
      ctdGroup.add(hitMesh);
      this.clickableObjects.push(hitMesh);

      // CTD Cast wire down to 2000m
      const wirePoints = [
        surfacePos,
        this.projectCoord(ctd.latitude, ctd.longitude, 2000, 0),
      ];
      const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
      const wireMat = new THREE.LineDashedMaterial({
        color: 0xc084fc,
        dashSize: 1.2,
        gapSize: 0.8,
        transparent: true,
        opacity: 0.65,
      });
      const wire = new THREE.Line(wireGeo, wireMat);
      wire.computeLineDistances();
      ctdGroup.add(wire);

      this.ctdGroup.add(ctdGroup);
    });

    // 5. INCOIS HEADQUARTERS & MAJOR OPERATIONAL MARINE HUBS
    KEY_STATIONS.forEach((stn) => {
      const stnGroup = new THREE.Group();
      const pos = this.projectCoord(stn.lat, stn.lon, 0, 0.45);

      // Sleek pinpoint beacon
      const pinGeo = new THREE.SphereGeometry(stn.isHQ ? 0.38 : 0.25, 12, 12);
      const pinMat = new THREE.MeshStandardMaterial({
        color: stn.isHQ ? 0xf59e0b : 0x38bdf8,
        emissive: stn.isHQ ? 0xd97706 : 0x0284c7,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);
      stnGroup.add(pinMesh);

      // Micro ring
      const ringGeo = new THREE.RingGeometry(0.35, 0.55, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: stn.isHQ ? 0xfbbf24 : 0x7dd3fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(pos.clone().multiplyScalar(2.0));
      stnGroup.add(ring);

      // Hit box for hover tooltip
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(pos);
      hitMesh.userData = { type: 'STATION', data: stn };
      stnGroup.add(hitMesh);
      this.clickableObjects.push(hitMesh);

      this.stationsGroup.add(stnGroup);
    });
  }

  // Animates sonar pulse rings on every frame
  update() {
    if (!this.pulseRings || this.pulseRings.length === 0) return;
    this.pulsePhase = (this.pulsePhase + 0.022) % 1.0;

    for (let i = 0; i < this.pulseRings.length; i++) {
      const ring = this.pulseRings[i];
      const phase = (this.pulsePhase + i * 0.15) % 1.0;
      const scale = 1.0 + phase * 2.4;
      ring.scale.set(scale, scale, 1);
      if (ring.material) {
        ring.material.opacity = Math.max(0, (1.0 - phase) * 0.75);
      }
    }
  }

  setVisible(layers) {
    if (layers.argo !== undefined) this.argoGroup.visible = layers.argo;
    if (layers.gliders !== undefined) this.gliderGroup.visible = layers.gliders;
    if (layers.moorings !== undefined) this.mooringGroup.visible = layers.moorings;
    if (layers.ctd !== undefined) this.ctdGroup.visible = layers.ctd;
    if (layers.stations !== undefined) this.stationsGroup.visible = layers.stations;
    if (layers.coastline !== undefined && layers.stations === undefined) {
      this.stationsGroup.visible = layers.coastline;
    }
  }

  setupEvents() {
    this.domElement.addEventListener('pointermove', (event) => {
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

      if (intersects.length > 0) {
        const topHit = intersects[0].object;
        this.domElement.style.cursor = 'pointer';
        if (topHit.userData && topHit.userData.data) {
          this.showHoverTooltip(topHit.userData.data, topHit.userData.type, topHit.position);
        }
      } else {
        this.domElement.style.cursor = 'default';
        this.hideHoverTooltip();
      }
    });

    this.domElement.addEventListener('pointerleave', () => {
      this.hideHoverTooltip();
    });

    this.domElement.addEventListener('click', (event) => {
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

      if (intersects.length > 0) {
        const topHit = intersects[0].object;
        if (topHit.userData && topHit.userData.data && this.onSelectInstrument) {
          this.onSelectInstrument(topHit.userData.data, topHit.userData.type);
        }
      }
    });
  }
}
