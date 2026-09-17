import * as THREE from 'three';

const vertShader = `
  varying vec3 vOrigin;
  varying vec3 vDirection;
  varying vec3 vLocalPos;
  
  void main() {
    // Model space vertex [-100..100, -20..20, -75..75] mapped to [0..1, 0..1, 0..1]
    vec3 unitPos = (position + vec3(100.0, 20.0, 75.0)) / vec3(200.0, 40.0, 150.0);
    vLocalPos = unitPos;
    
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 camInModel = inverse(modelMatrix) * vec4(cameraPosition, 1.0);
    vOrigin = (camInModel.xyz + vec3(100.0, 20.0, 75.0)) / vec3(200.0, 40.0, 150.0);
    vDirection = vLocalPos - vOrigin;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragShader = `
  precision highp float;
  precision highp sampler3D;
  
  varying vec3 vOrigin;
  varying vec3 vDirection;
  varying vec3 vLocalPos;
  
  uniform sampler3D uVolumeTex;
  uniform sampler2D uLutTex;
  uniform float uOpacity;
  uniform float uSteps;
  uniform bool uIsosurface;
  uniform float uIsovalue;
  uniform float uClipDepth; // 0..1 (top down)
  
  // AABB Ray-Box intersection in [0..1] texture space
  vec2 hitBox(vec3 orig, vec3 dir) {
    vec3 box_min = vec3(0.0, 1.0 - uClipDepth, 0.0);
    vec3 box_max = vec3(1.0, 1.0, 1.0);
    vec3 inv_dir = 1.0 / dir;
    vec3 t0 = (box_min - orig) * inv_dir;
    vec3 t1 = (box_max - orig) * inv_dir;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);
    float t_enter = max(max(tmin.x, tmin.y), tmin.z);
    float t_exit = min(min(tmax.x, tmax.y), tmax.z);
    return vec2(t_enter, t_exit);
  }

  // Calculate 3D scalar gradient normal for smooth Phong lighting on isosurfaces
  vec3 computeGradient(vec3 pos, float stepSize) {
    float x1 = texture(uVolumeTex, pos + vec3(stepSize, 0.0, 0.0)).r;
    float x0 = texture(uVolumeTex, pos - vec3(stepSize, 0.0, 0.0)).r;
    float y1 = texture(uVolumeTex, pos + vec3(0.0, stepSize, 0.0)).r;
    float y0 = texture(uVolumeTex, pos - vec3(0.0, stepSize, 0.0)).r;
    float z1 = texture(uVolumeTex, pos + vec3(0.0, 0.0, stepSize)).r;
    float z0 = texture(uVolumeTex, pos - vec3(0.0, 0.0, stepSize)).r;
    return normalize(vec3(x1 - x0, y1 - y0, z1 - z0));
  }
  
  void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 tHit = hitBox(vOrigin, rayDir);
    
    if (tHit.x > tHit.y || tHit.y < 0.0) discard;
    tHit.x = max(tHit.x, 0.0);
    
    float stepSize = 1.732 / uSteps;
    vec3 rayPos = vOrigin + rayDir * tHit.x;
    vec4 accCol = vec4(0.0);
    float numSteps = (tHit.y - tHit.x) / stepSize;
    
    for (float i = 0.0; i < 220.0; i += 1.0) {
      if (i >= numSteps || accCol.a >= 0.95) break;
      
      // Note: in texture space, z is depth (or y is depth depending on indexing)
      // Volume data: [depth, lat, lon] -> mapped to [x=lon, y=depth, z=lat]
      vec3 sampleCoord = vec3(rayPos.x, 1.0 - rayPos.y, rayPos.z);
      float scalarVal = texture(uVolumeTex, sampleCoord).r;
      
      if (uIsosurface) {
        if (abs(scalarVal - uIsovalue) < 0.018) {
          vec3 normal = computeGradient(sampleCoord, stepSize * 1.5);
          vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
          float diff = max(dot(-normal, lightDir), 0.25);
          vec4 isoColor = texture(uLutTex, vec2(scalarVal, 0.5));
          accCol = vec4(isoColor.rgb * (diff + 0.2), 0.92);
          break;
        }
      } else {
        // Direct Volume Emission-Absorption
        vec4 col = texture(uLutTex, vec2(scalarVal, 0.5));
        col.a *= (uOpacity * 0.065);
        
        // Front-to-back accumulation
        accCol.rgb += (1.0 - accCol.a) * col.rgb * col.a;
        accCol.a += (1.0 - accCol.a) * col.a;
      }
      
      rayPos += rayDir * stepSize;
    }
    
    if (accCol.a <= 0.01) discard;
    gl_FragColor = accCol;
  }
`;

export class VolumeRaymarcher {
  constructor(sceneGroup) {
    this.sceneGroup = sceneGroup;
    this.mesh = null;
    this.tex3D = null;
    this.lutTex = null;
    this.opacity = 0.85;
    this.isIsosurface = false;
    this.isovalue = 0.5;
    this.clipDepth = 1.0;
  }

  updateVolume(volumeObj, lutUint8) {
    const [depths, lats, lons] = volumeObj.shape;

    // Create 3D Texture (WebGL2)
    if (this.tex3D) this.tex3D.dispose();
    this.tex3D = new THREE.Data3DTexture(volumeObj.data, lons, depths, lats);
    this.tex3D.format = THREE.RedFormat;
    this.tex3D.type = THREE.UnsignedByteType;
    this.tex3D.minFilter = THREE.LinearFilter;
    this.tex3D.magFilter = THREE.LinearFilter;
    this.tex3D.unpackAlignment = 1;
    this.tex3D.needsUpdate = true;

    // Create LUT Texture
    if (this.lutTex) this.lutTex.dispose();
    this.lutTex = new THREE.DataTexture(lutUint8, 256, 1, THREE.RGBAFormat);
    this.lutTex.minFilter = THREE.LinearFilter;
    this.lutTex.magFilter = THREE.LinearFilter;
    this.lutTex.needsUpdate = true;

    if (!this.mesh) {
      const geo = new THREE.BoxGeometry(200, 40, 150);
      const mat = new THREE.ShaderMaterial({
        vertexShader: vertShader,
        fragmentShader: fragShader,
        uniforms: {
          uVolumeTex: { value: this.tex3D },
          uLutTex: { value: this.lutTex },
          uOpacity: { value: this.opacity },
          uSteps: { value: 140.0 },
          uIsosurface: { value: this.isIsosurface },
          uIsovalue: { value: this.isovalue },
          uClipDepth: { value: this.clipDepth },
        },
        transparent: true,
        side: THREE.BackSide,
      });

      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.position.set(0, -20, 0);
      this.sceneGroup.add(this.mesh);
    } else {
      this.mesh.material.uniforms.uVolumeTex.value = this.tex3D;
      this.mesh.material.uniforms.uLutTex.value = this.lutTex;
      this.mesh.material.uniforms.uVolumeTex.value.needsUpdate = true;
      this.mesh.material.uniforms.uLutTex.value.needsUpdate = true;
    }
  }

  setParams({ opacity, isIsosurface, isovalue, clipDepth }) {
    if (opacity !== undefined) this.opacity = opacity;
    if (isIsosurface !== undefined) this.isIsosurface = isIsosurface;
    if (isovalue !== undefined) this.isovalue = isovalue;
    if (clipDepth !== undefined) this.clipDepth = clipDepth;

    if (this.mesh && this.mesh.material) {
      const u = this.mesh.material.uniforms;
      u.uOpacity.value = this.opacity;
      u.uIsosurface.value = this.isIsosurface;
      u.uIsovalue.value = this.isovalue;
      u.uClipDepth.value = this.clipDepth;
    }
  }
}
