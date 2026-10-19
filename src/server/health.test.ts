import { describe, expect, test } from 'vitest';
import { getHealth } from './health';

describe('getHealth', () => {
  test('reports ok with the libvips version when Sharp loads', () => {
    const health = getHealth();
    expect(health.status).toBe('ok');
    if (health.status === 'ok') expect(health.vips).toMatch(/^\d+\.\d+/);
  });
});
