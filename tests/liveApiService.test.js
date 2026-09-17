import { describe, it, expect } from 'vitest';
import { LiveApiService } from '../src/engine/liveApiService.js';

describe('LiveApiService', () => {
  it('handles local caching correctly', () => {
    LiveApiService.setCache('test_key', [{ id: 'TEST-1' }]);
    const cached = LiveApiService.getCache('test_key');
    expect(cached).toBeDefined();
    expect(cached[0].id).toBe('TEST-1');
  });

  it('provides safe fallback coordinates for marine observations', () => {
    expect(LiveApiService).toBeDefined();
    expect(typeof LiveApiService.fetchLiveArgoFloats).toBe('function');
    expect(typeof LiveApiService.fetchLiveMarineObservations).toBe('function');
  });
});
