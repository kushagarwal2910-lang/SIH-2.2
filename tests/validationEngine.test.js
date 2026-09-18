import { describe, it, expect } from 'vitest';
import { OceanDataEngine } from '../src/engine/oceanDataEngine.js';
import { ValidationEngine } from '../src/engine/validationEngine.js';
import argoData from '../src/data/argoProfiles.json';
import gliderData from '../src/data/gliderMissions.json';

describe('ValidationEngine', () => {
  const oceanEngine = new OceanDataEngine();

  it('validates Argo profile against model grid and calculates statistical metrics', () => {
    const argo = argoData[0];
    const report = ValidationEngine.validateArgo(argo, oceanEngine, 'temp', 0);

    expect(report.platform_id).toBe(argo.platform_id);
    expect(report.metrics).toHaveProperty('rmse');
    expect(report.metrics).toHaveProperty('bias');
    expect(report.metrics).toHaveProperty('pearsonR');
    expect(report.metrics.rmse).toBeGreaterThanOrEqual(0.0);
    expect(report.metrics.pearsonR).toBeGreaterThan(0.7); // High correlation with realistic physics
    expect(report.comparison.length).toBe(argo.profile.length);
  });

  it('validates Glider mission tracks and calculates RMSE metrics', () => {
    const glider = gliderData[0];
    const report = ValidationEngine.validateGlider(glider, oceanEngine, 'temp', 0);

    expect(report.mission_id).toBe(glider.mission_id);
    expect(report.metrics).toHaveProperty('rmse');
    expect(report.metrics).toHaveProperty('bias');
    expect(report.metrics).toHaveProperty('pearsonR');
    expect(report.metrics.pearsonR).toBeGreaterThan(0.5);
    expect(report.comparison.length).toBe(glider.waypoints.length);
  });
});

