import * as THREE from 'three';

export class VectorFieldFlow {
  constructor(sceneGroup, particleCount = 3000) {
    this.sceneGroup = sceneGroup;
    this.particleCount = particleCount;
    this.visible = true;

    this.positions = new Float32Array(particleCount * 3);
    this.colors = new Float32Array(particleCount * 3);
    this.velocities = new Float32Array(particleCount * 3);
    this.ages = new Float32Array(particleCount);
    this.maxAges = new Float32Array(particleCount);

    this.initParticles();
    this.createMesh();
  }

  initParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i);
      this.ages[i] = Math.random() * this.maxAges[i];
    }
  }

  resetParticle(i) {
    // Position inside ocean box: X in [-98, 98], Y in [-38, 0], Z in [-73, 73]
    const x = (Math.random() - 0.5) * 196;
    const y = -Math.random() * 38;
    const z = (Math.random() - 0.5) * 146;

    this.positions[i * 3 + 0] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;

    this.ages[i] = 0;
    this.maxAges[i] = 120 + Math.random() * 100;

    // Velocity proportional to monsoon gyre dynamics
    // Depth decay factor (surface currents are fast ~1 m/s, abyss is slow ~0.05 m/s)
    const depthFrac = Math.exp(y / 15.0); // y is negative (-38 to 0)

    // Arabian sea clockwise gyre (left) + Bay of Bengal gyre (right)
    const vx = Math.cos(z * 0.05) * 0.6 * depthFrac + 0.15;
    const vz = -Math.sin(x * 0.04) * 0.5 * depthFrac;
    const vy = 0.005 * Math.sin(x * 0.05 + z * 0.05);

    this.velocities[i * 3 + 0] = vx;
    this.velocities[i * 3 + 1] = vy;
    this.velocities[i * 3 + 2] = vz;

    // Color based on speed magnitude
    const speed = Math.sqrt(vx * vx + vz * vz);
    if (speed > 0.4) {
      // Fast current: Gold / Amber
      this.colors[i * 3 + 0] = 0.96;
      this.colors[i * 3 + 1] = 0.72;
      this.colors[i * 3 + 2] = 0.15;
    } else if (speed > 0.2) {
      // Medium current: Cyan / Aqua
      this.colors[i * 3 + 0] = 0.06;
      this.colors[i * 3 + 1] = 0.82;
      this.colors[i * 3 + 2] = 0.95;
    } else {
      // Slow deep drift: Deep Blue
      this.colors[i * 3 + 0] = 0.12;
      this.colors[i * 3 + 1] = 0.35;
      this.colors[i * 3 + 2] = 0.75;
    }
  }

  createMesh() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Particle sprite or smooth points
    const mat = new THREE.PointsMaterial({
      size: 3.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geo, mat);
    this.sceneGroup.add(this.points);
  }

  update() {
    if (!this.visible || !this.points) return;

    const posAttr = this.points.geometry.attributes.position;
    const colAttr = this.points.geometry.attributes.color;

    for (let i = 0; i < this.particleCount; i++) {
      this.ages[i]++;
      if (this.ages[i] > this.maxAges[i]) {
        this.resetParticle(i);
      }

      // Advect position
      this.positions[i * 3 + 0] += this.velocities[i * 3 + 0];
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1];
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2];

      // Fade alpha/intensity near end of life
      const lifeFrac = this.ages[i] / this.maxAges[i];
      const alphaFactor = lifeFrac < 0.2 ? lifeFrac / 0.2 : lifeFrac > 0.8 ? (1.0 - lifeFrac) / 0.2 : 1.0;

      // Wrap-around bounds
      if (this.positions[i * 3 + 0] > 98) this.positions[i * 3 + 0] = -98;
      if (this.positions[i * 3 + 0] < -98) this.positions[i * 3 + 0] = 98;
      if (this.positions[i * 3 + 2] > 73) this.positions[i * 3 + 2] = -73;
      if (this.positions[i * 3 + 2] < -73) this.positions[i * 3 + 2] = 73;
      if (this.positions[i * 3 + 1] < -39) this.positions[i * 3 + 1] = 0;
      if (this.positions[i * 3 + 1] > 0) this.positions[i * 3 + 1] = -39;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  setVisible(visible) {
    this.visible = visible;
    if (this.points) this.points.visible = visible;
  }
}
