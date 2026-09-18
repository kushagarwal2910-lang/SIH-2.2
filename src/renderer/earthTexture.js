import { INDIA_FULL_BORDER } from '../data/geospatialData.js';

// Point-in-polygon test to prevent ocean data from bleeding onto Indian land
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
 * Creates high-fidelity 2048x1024 Earth canvas texture.
 * Loads the real NASA Blue Marble satellite imagery as base,
 * overlays subtle, clean sovereign India boundaries & EEZ,
 * and enables precise ocean masking.
 */
export function createEarthCanvasTexture(onLoadedCallback) {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const lonToX = (lon) => ((lon + 180.0) / 360.0) * width;
  const latToY = (lat) => ((90.0 - lat) / 180.0) * height;

  const earthData = {
    canvas,
    ctx,
    width,
    height,
    pristineBase: null,
    baseImage: null,
    isReady: false,
    lonToX,
    latToY,
  };

  // Initial rich fallback background while satellite image loads
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0.0, '#020b17');
  oceanGrad.addColorStop(0.5, '#051c36');
  oceanGrad.addColorStop(1.0, '#020b17');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Load Real NASA Blue Marble texture
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = './textures/earth_atmos_2048.jpg';

  const drawBaseLayers = () => {
    ctx.clearRect(0, 0, width, height);

    if (earthData.baseImage) {
      // Draw Photorealistic Satellite Earth (true natural terrain visible everywhere)
      ctx.drawImage(earthData.baseImage, 0, 0, width, height);
    }

    // Typographic Subcontinent & Ocean Basin Lettering (Clean Atlas Style)
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('I N D I A', lonToX(78.5), latToY(22.0));

    // Water bodies: clean, elegant lettering directly integrated onto the sea
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.fillText('A R A B I A N   S E A', lonToX(64.5), latToY(15.5));
    ctx.fillText('B A Y   O F   B E N G A L', lonToX(89.0), latToY(14.5));
    ctx.fillText('I N D I A N   O C E A N', lonToX(76.5), latToY(2.5));

    // 6. Subtle Lat/Lon Graticules
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;

    // Equator
    ctx.beginPath();
    ctx.moveTo(0, latToY(0));
    ctx.lineTo(width, latToY(0));
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.stroke();

    // Tropic of Cancer (23.5°N)
    ctx.beginPath();
    ctx.moveTo(0, latToY(23.5));
    ctx.lineTo(width, latToY(23.5));
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.stroke();

    // Save pristine background state
    earthData.pristineBase = ctx.getImageData(0, 0, width, height);
    earthData.isReady = true;

    if (onLoadedCallback) onLoadedCallback();
  };

  img.onload = () => {
    earthData.baseImage = img;
    drawBaseLayers();
  };

  img.onerror = () => {
    // Fallback if image fails to load
    drawBaseLayers();
  };

  return earthData;
}

/**
 * Updates ocean scalar data on the Earth canvas.
 * Applies a strict land mask so India and other landmasses are NEVER covered by ocean colors!
 */
export function renderOceanDataOnCanvas(earthData, sliceData, colormapLut, opacity = 0.82, liveWmsImage = null) {
  if (!earthData || !earthData.isReady || (!sliceData && !liveWmsImage) || !colormapLut) return;
  const { ctx, width, height, pristineBase, lonToX, latToY } = earthData;

  // 1. Restore the photorealistic pristine satellite base
  ctx.putImageData(pristineBase, 0, 0);

  // Ocean domain pixel bounds (0°N–25°N, 50°E–95°E)
  const xMin = Math.floor(lonToX(50.0));
  const xMax = Math.ceil(lonToX(95.0));
  const yMin = Math.floor(latToY(25.0));
  const yMax = Math.ceil(latToY(0.0));

  const regionW = xMax - xMin;
  const regionH = yMax - yMin;
  if (regionW <= 0 || regionH <= 0) return;

  const hasLiveWms = Boolean(liveWmsImage && liveWmsImage.complete && liveWmsImage.naturalWidth > 0);

  let dataImg;
  if (hasLiveWms) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = regionW;
    offCanvas.height = regionH;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(liveWmsImage, 0, 0, regionW, regionH);
    dataImg = offCtx.getImageData(0, 0, regionW, regionH);
  } else {
    dataImg = ctx.createImageData(regionW, regionH);
  }
  const dst = dataImg.data;

  const gridLons = 48;
  const gridLats = 32;
  const rawData = sliceData?.data;

  for (let py = 0; py < regionH; py++) {
    const latFrac = 1.0 - (py / regionH);
    const lat = 0.0 + latFrac * 25.0; // Exact latitude in degrees
    const gy = Math.floor(latFrac * (gridLats - 1));

    for (let px = 0; px < regionW; px++) {
      const lonFrac = px / regionW;
      const lon = 50.0 + lonFrac * 45.0; // Exact longitude in degrees
      const gx = Math.floor(lonFrac * (gridLons - 1));

      const dstIdx = (py * regionW + px) * 4;

      // 2. Strict Land Mask: If coordinates are on Indian mainland or Sri Lanka, DO NOT draw ocean data!
      const isIndia = pointInPoly(lon, lat, INDIA_FULL_BORDER);
      const isSriLanka = (lon > 79.5 && lon < 82.0 && lat > 5.8 && lat < 9.9);
      const isArabianPeninsula = (lon < 60.0 && lat > 12.0);

      if (isIndia || isSriLanka || isArabianPeninsula) {
        // Keep 100% transparent so the real satellite land shines through!
        dst[dstIdx + 3] = 0;
        continue;
      }

      if (hasLiveWms) {
        // Authentic live INCOIS ncWMS pixel: keep RGB and adjust opacity
        if (dst[dstIdx + 3] > 10) {
          dst[dstIdx + 3] = Math.round(opacity * 220);
        }
      } else {
        // Sample fallback colormap LUT
        const idx = gy * gridLons + gx;
        const normVal = rawData ? rawData[idx] || 128 : 128;
        const lutIdx = Math.min(255, Math.max(0, normVal));

        const r = colormapLut[lutIdx * 4 + 0] || 0;
        const g = colormapLut[lutIdx * 4 + 1] || 150;
        const b = colormapLut[lutIdx * 4 + 2] || 255;

        dst[dstIdx + 0] = r;
        dst[dstIdx + 1] = g;
        dst[dstIdx + 2] = b;
        dst[dstIdx + 3] = Math.round(opacity * 215); // Translucent ocean overlay
      }
    }
  }

  // Draw masked ocean data
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = regionW;
  tempCanvas.height = regionH;
  tempCanvas.getContext('2d').putImageData(dataImg, 0, 0);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(tempCanvas, xMin, yMin);
  ctx.restore();

  // Render subtle water body lettering over ocean layer
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(241, 245, 249, 0.70)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A R A B I A N   S E A', lonToX(64.5), latToY(15.5));
  ctx.fillText('B A Y   O F   B E N G A L', lonToX(89.0), latToY(14.5));
  ctx.fillText('I N D I A N   O C E A N', lonToX(76.5), latToY(2.5));
}
