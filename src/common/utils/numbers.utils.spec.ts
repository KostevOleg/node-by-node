import { describe, expect, it } from '@jest/globals';
import { clampNumber, toPositiveInteger } from './numbers.utils';

describe('number utils', () => {
  it('converts positive integer values', () => {
    expect(toPositiveInteger(10)).toBe(10);
    expect(toPositiveInteger('42')).toBe(42);
  });

  it('returns undefined for invalid positive integers', () => {
    expect(toPositiveInteger(0)).toBeUndefined();
    expect(toPositiveInteger(-1)).toBeUndefined();
    expect(toPositiveInteger(1.5)).toBeUndefined();
    expect(toPositiveInteger('abc')).toBeUndefined();
  });

  it('keeps number inside min and max range', () => {
    expect(clampNumber(5, 1, 10)).toBe(5);
  });

  it('limits number to min and max range', () => {
    expect(clampNumber(0, 1, 10)).toBe(1);
    expect(clampNumber(100, 1, 10)).toBe(10);
  });
});
