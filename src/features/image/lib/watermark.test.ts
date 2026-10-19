import { describe, expect, test } from 'vitest';
import { markSize, shadowFor } from './watermark';

describe('markSize', () => {
  test('is a percentage of the image width, at any resolution', () => {
    expect(markSize(1000, 30, 3)).toEqual({ width: 300, height: 100 });
    expect(markSize(4000, 30, 3)).toEqual({ width: 1200, height: 400 });
  });

  test('keeps the mark’s aspect ratio', () => {
    const { width, height } = markSize(2000, 20, 0.5);
    expect(width / height).toBeCloseTo(0.5);
  });

  test('never collapses to nothing', () => {
    expect(markSize(1000, 0, 2).width).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(markSize(1000, 10, 0).height)).toBe(true);
  });
});

describe('shadowFor', () => {
  test('uses a dark shadow behind light text and a light one behind dark text', () => {
    expect(shadowFor('#ffffff')).toContain('0, 0, 0');
    expect(shadowFor('#ffe9a0')).toContain('0, 0, 0');
    expect(shadowFor('#000000')).toContain('255, 255, 255');
    expect(shadowFor('#1a237e')).toContain('255, 255, 255');
  });

  test('falls back to a dark shadow for malformed colours', () => {
    expect(shadowFor('red')).toContain('0, 0, 0');
    expect(shadowFor('')).toContain('0, 0, 0');
  });

  test('accepts colours without the leading #', () => {
    expect(shadowFor('000000')).toContain('255, 255, 255');
  });
});
