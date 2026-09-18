import { describe, it, expect } from 'vitest';
import { SCIENCE_STORIES } from '../src/engine/storyEngine.js';
import { OceanDataEngine } from '../src/engine/oceanDataEngine.js';
import { LiveApiService } from '../src/engine/liveApiService.js';

describe('Science Stories & Transect Engine', () => {
  const oceanEngine = new OceanDataEngine();

  it('contains valid science stories with required steps and camera targets', () => {
    expect(SCIENCE_STORIES.length).toBeGreaterThanOrEqual(4);

    SCIENCE_STORIES.forEach((story) => {
      expect(story).toHaveProperty('id');
      expect(story).toHaveProperty('title');
      expect(story).toHaveProperty('steps');
      expect(story.steps.length).toBeGreaterThan(0);

      story.steps.forEach((step) => {
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('narration');
        expect(step).toHaveProperty('variable');
        expect(step).toHaveProperty('camera');
        expect(step.camera.pos.length).toBe(3);
        expect(step.camera.target.length).toBe(3);
      });
    });
  });

  it('extracts ocean vertical transect cross-sections accurately', () => {
    const transect = oceanEngine.extractTransect('temp', 0, 18.9, 72.8, 4.2, 73.5, 30);

    expect(transect).toHaveProperty('start');
    expect(transect).toHaveProperty('end');
    expect(transect.points.length).toBe(30);
    expect(transect.depths.length).toBe(oceanEngine.depthCount);
    expect(transect.values.length).toBe(oceanEngine.depthCount);
    expect(transect.values[0].length).toBe(30);
    expect(transect.min_val).toBeLessThan(transect.max_val);
  });

  it('generates proper INCOIS WMS URLs for supported variables', () => {
    const sstUrl = LiveApiService.getIncoisWmsTileUrl('temp');
    expect(sstUrl).toContain('LAYERS=SST');
    expect(sstUrl).toContain('SERVICE=WMS');

    const currentsUrl = LiveApiService.getIncoisWmsTileUrl('current');
    expect(currentsUrl).toContain('LAYERS=U:V-mag');

    const invalidUrl = LiveApiService.getIncoisWmsTileUrl('unknown_variable');
    expect(invalidUrl).toBeNull();
  });
});
