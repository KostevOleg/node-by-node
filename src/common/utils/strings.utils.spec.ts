import { describe, expect, it } from '@jest/globals';
import { normalizeEmail, isNonEmptyString } from './strings.utils';
describe('tests for string utils fns', () => {
  const normalize = normalizeEmail;
  const isNonEmpty = isNonEmptyString;

  it('normalize string', () => {
    const result = normalize(' Email@mail.ru ');
    expect(result).toBe('email@mail.ru');
  });
  it('isNotEmpty', () => {
    const result = isNonEmpty('  ');
    expect(result).toBeFalsy();
  });
});
