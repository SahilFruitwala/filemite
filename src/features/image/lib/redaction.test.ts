import { describe, expect, test } from 'vitest';
import { STRENGTH_MAX, STRENGTH_MIN, redactionAmount } from './redaction';

describe('redactionAmount', () => {
  test('a black box has no strength setting', () => {
    expect(redactionAmount('blackout', 5, { width: 1000, height: 800 })).toBe(0);
  });

  test('grows with strength', () => {
    const image = { width: 2000, height: 1500 };
    for (const mode of ['pixelate', 'blur'] as const) {
      expect(redactionAmount(mode, 8, image)).toBeGreaterThan(redactionAmount(mode, 2, image));
    }
  });

  test('scales with the longest side of the image', () => {
    const small = redactionAmount('pixelate', 5, { width: 800, height: 600 });
    const large = redactionAmount('pixelate', 5, { width: 4000, height: 3000 });
    expect(large).toBe(small * 5);
  });

  test('uses the longer side for portrait images', () => {
    expect(redactionAmount('blur', 5, { width: 600, height: 2000 })).toBe(
      redactionAmount('blur', 5, { width: 2000, height: 600 }),
    );
  });

  test('never drops below a visible minimum on tiny images', () => {
    expect(redactionAmount('pixelate', STRENGTH_MIN, { width: 50, height: 50 })).toBe(4);
    expect(redactionAmount('blur', STRENGTH_MIN, { width: 50, height: 50 })).toBe(3);
  });

  test('clamps strength to its range', () => {
    const image = { width: 1000, height: 1000 };
    expect(redactionAmount('pixelate', 99, image)).toBe(redactionAmount('pixelate', STRENGTH_MAX, image));
    expect(redactionAmount('pixelate', -4, image)).toBe(redactionAmount('pixelate', STRENGTH_MIN, image));
  });
});
