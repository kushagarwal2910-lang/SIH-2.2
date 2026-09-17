import * as THREE from 'three';

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
    this.radarGroup = new THREE.Group();

    this.group.add(this.argoGroup);
    this.group.add(this.gliderGroup);
    this.group.add(this.mooringGroup);
    this.group.add(this.ctdGroup);
    this.group.add(this.radarGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clickableObjects = [];

    this.setupEvents();
  }

  // Geographic projection: [Lat 0..25 -> Z 75..-75, Lon 50..95 -> X -100..100, Depth 0..2000 -> Y 0..-40]
  projectCoord(lat, lon, depth = 0) {
    const x = ((lon - 50.0) / 45.0 - 0.5) * 200.0;
    const z = -((lat - 0.0) / 25.0 - 0.5) * 150.0;
    const y = -(depth / 2000.0) * 40.0;
    return new THREE.Vector3(x, y, z);
  }

  loadInstruments({ argoList = [], gliderList = [], mooringList = [], ctdList = [] }) {
    // Clear existing children
    const clearGroup = (g) => {
      while (g.children.length > 0) g.remove(g.children[0]);
    };
    clearGroup(this.argoGroup);
    clearGroup(this.gliderGroup);
    clearGroup(this.mooringGroup);
    clearGroup(this.ctdGroup);
    clearGroup(this.radarGroup);
    this.clickableObjects = [];

    // 1. ARGO PROFILING FLOATS
    const argoSphereGeo = new THREE.SphereGeometry(2.8, 16, 16);
    const argoBeaconGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.5, 8);

    argoList.forEach((argo) => {
      const surfacePos = this.projectCoord(argo.latitude, argo.longitude, 0);
      const floatGroup = new THREE.Group();
      floatGroup.position.copy(surfacePos);

      // Yellow/Amber buoyant hull
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const hullMesh = new THREE.Mesh(argoSphereGeo, hullMat);
      hullMesh.userData = { type: 'ARGO', data: argo };
      floatGroup.add(hullMesh);
      this.clickableObjects.push(hullMesh);

      // Antenna beacon
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const beaconMesh = new THREE.Mesh(argoBeaconGeo, beaconMat);
      beaconMesh.position.set(0, 2.2, 0);
      floatGroup.add(beaconMesh);

      // Plumbline down to 2000m
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -40, 0),
      ]);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0xf59e0b,
        opacity: 0.5,
        transparent: true,
        dashSize: 2,
        gapSize: 1,
      });
      const plumbline = new THREE.Line(lineGeo, lineMat);
      plumbline.computeLineDistances();
      floatGroup.add(plumbline);

      // Discrete profile depth beads
      if (argo.profile) {
        argo.profile.forEach((pt) => {
          const yOffset = -(pt.depth / 2000.0) * 40.0;
          const ptGeo = new THREE.SphereGeometry(0.7, 8, 8);
          const ptMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
          const ptMesh = new THREE.Mesh(ptGeo, ptMat);
          ptMesh.position.set(0, yOffset, 0);
          floatGroup.add(ptMesh);
        });
      }

      this.argoGroup.add(floatGroup);
    });

    // 2. UNDERWATER GLIDER MISSIONS (Sawtooth Dives)
    gliderList.forEach((glider) => {
      const gliderGroup = new THREE.Group();
      const points = glider.waypoints.map((w) => this.projectCoord(w.latitude, w.longitude, w.depth));

      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.7, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4, // Cyan
          emissive: 0x0891b2,
          emissiveIntensity: 0.6,
          roughness: 0.3,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.userData = { type: 'GLIDER', data: glider };
        gliderGroup.add(tubeMesh);
        this.clickableObjects.push(tubeMesh);

        // Surfacing waypoint spheres
        glider.waypoints.forEach((wp) => {
          const wpPos = this.projectCoord(wp.latitude, wp.longitude, wp.depth);
          const wpGeo = new THREE.SphereGeometry(1.4, 8, 8);
          const wpMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
          const wpMesh = new THREE.Mesh(wpGeo, wpMat);
          wpMesh.position.copy(wpPos);
          wpMesh.userData = { type: 'GLIDER', data: glider };
          gliderGroup.add(wpMesh);
          this.clickableObjects.push(wpMesh);
        });
      }

      this.gliderGroup.add(gliderGroup);
    });

    // 3. INCOIS OMNI & RAMA DEEP-SEA MOORED BUOYS
    const buoyToroidGeo = new THREE.TorusGeometry(3.2, 1.1, 12, 24);
    const buoyMastGeo = new THREE.ConeGeometry(1.6, 5, 4);

    mooringList.forEach((buoy) => {
      const surfacePos = this.projectCoord(buoy.latitude, buoy.longitude, 0);
      const buoyGroup = new THREE.Group();
      buoyGroup.position.copy(surfacePos);

      // Vivid red/coral toroid buoy hull
      const buoyMat = new THREE.MeshStandardMaterial({
        color: 0xef4444, // Red
        emissive: 0xdc2626,
        emissiveIntensity: 0.8,
        roughness: 0.3,
      });
      const toroidMesh = new THREE.Mesh(buoyToroidGeo, buoyMat);
      toroidMesh.rotation.x = Math.PI / 2;
      toroidMesh.userData = { type: 'MOORING', data: buoy };
      buoyGroup.add(toroidMesh);
      this.clickableObjects.push(toroidMesh);

      // Meteorological Mast & Radar Reflector
      const mastMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
      const mastMesh = new THREE.Mesh(buoyMastGeo, mastMat);
      mastMesh.position.set(0, 3.2, 0);
      buoyGroup.add(mastMesh);

      // Subsurface Mooring Anchor Cable down to Seafloor (-40 units)
      const cableGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -40, 0),
      ]);
      const cableMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
      const cable = new THREE.Line(cableGeo, cableMat);
      buoyGroup.add(cable);

      // CTD string sensors at fixed depths
      if (buoy.profile) {
        buoy.profile.forEach((node) => {
          const yOffset = -(node.depth / 2000.0) * 40.0;
          const nodeGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
          const nodeMat = new THREE.MeshBasicMaterial({ color: 0xfca5a5 });
          const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
          nodeMesh.position.set(0, yOffset, 0);
          buoyGroup.add(nodeMesh);
        });
      }

      this.mooringGroup.add(buoyGroup);
    });

    // 4. RESEARCH VESSEL CTD HYDROGRAPHIC STATIONS (Sagar Kanya)
    const shipHullGeo = new THREE.ConeGeometry(2.5, 7, 3);
    shipHullGeo.rotateZ(Math.PI / 2);

    ctdList.forEach((ctd) => {
      const surfacePos = this.projectCoord(ctd.latitude, ctd.longitude, 0);
      const ctdGroup = new THREE.Group();
      ctdGroup.position.copy(surfacePos);

      // Purple Research Vessel Hull
      const shipMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7, // Purple
        emissive: 0x7e22ce,
        emissiveIntensity: 0.7,
      });
      const shipMesh = new THREE.Mesh(shipHullGeo, shipMat);
      shipMesh.position.set(0, 0.8, 0);
      shipMesh.userData = { type: 'CTD', data: ctd };
      ctdGroup.add(shipMesh);
      this.clickableObjects.push(shipMesh);

      // Deep CTD Rosette wire
      const maxDepth = ctd.profile?.[ctd.profile.length - 1]?.depth || 1800;
      const wireY = -(maxDepth / 2000.0) * 40.0;
      const wireGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, wireY, 0),
      ]);
      const wireMat = new THREE.LineBasicMaterial({ color: 0xc084fc, linewidth: 2 });
      const wireLine = new THREE.Line(wireGeo, wireMat);
      ctdGroup.add(wireLine);

      // Niskin Rosette Basket at depth
      const rosetteGeo = new THREE.CylinderGeometry(1.8, 1.8, 2.4, 12);
      const rosetteMat = new THREE.MeshBasicMaterial({ color: 0xe9d5ff });
      const rosetteMesh = new THREE.Mesh(rosetteGeo, rosetteMat);
      rosetteMesh.position.set(0, wireY, 0);
      ctdGroup.add(rosetteMesh);

      this.ctdGroup.add(ctdGroup);
    });
  }

  setVisible(layers = {}) {
    if (layers.argo !== undefined) this.argoGroup.visible = layers.argo;
    if (layers.gliders !== undefined) this.gliderGroup.visible = layers.gliders;
    if (layers.moorings !== undefined) this.mooringGroup.visible = layers.moorings;
    if (layers.ctd !== undefined) this.ctdGroup.visible = layers.ctd;
    if (layers.radar !== undefined) this.radarGroup.visible = layers.radar;
  }

  setupEvents() {
    this.domElement.addEventListener('click', (e) => {
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

      if (intersects.length > 0) {
        let current = intersects[0].object;
        while (current && !current.userData?.data) {
          current = current.parent;
        }

        if (current && current.userData?.data) {
          const item = current.userData.data;
          const type = current.userData.type || item.instrument_type || 'ARGO';
          if (this.onSelectInstrument) {
            this.onSelectInstrument(item, type);
          }
        }
      }
    });
  }
}
