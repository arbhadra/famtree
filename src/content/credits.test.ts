import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { creditsText } from './credits';

describe('credits', () => {
  it('credits.txt matches the in-app thanks page', () => {
    expect(readFileSync('credits.txt', 'utf8')).toBe(creditsText());
  });
});
