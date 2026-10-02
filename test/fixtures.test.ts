import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTouristTrip, tryBuildTouristTrip, validateTrip } from '../src/index.js';

/*
 * The fixtures are the cross-language contract (see fixtures/README.md).
 * Every port must produce exactly these outputs and issues.
 */

const root = join(import.meta.dirname, '..', 'fixtures');

function load(dir: string): Array<[string, Record<string, unknown>]> {
  return readdirSync(join(root, dir))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => [f, JSON.parse(readFileSync(join(root, dir, f), 'utf8')) as Record<string, unknown>]);
}

describe('valid fixtures', () => {
  it.each(load('valid'))('%s', (_file, fixture) => {
    expect(validateTrip(fixture.input)).toEqual([]);
    expect(buildTouristTrip(fixture.input)).toEqual(fixture.expected);
  });
});

describe('invalid fixtures', () => {
  it.each(load('invalid'))('%s', (_file, fixture) => {
    const issues = validateTrip(fixture.input).map(({ path, code }) => ({ path, code }));
    expect(issues).toEqual(fixture.issues);
    const result = tryBuildTouristTrip(fixture.input);
    expect(result.ok).toBe(false);
  });
});
