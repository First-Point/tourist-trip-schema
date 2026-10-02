import { describe, expect, it } from 'vitest';
import {
  buildTouristTrip,
  serializeJsonLd,
  toJsonLdScript,
  tryBuildTouristTrip,
  TripValidationError,
  validateTrip,
} from '../src/index.js';

describe('buildTouristTrip', () => {
  it('throws TripValidationError with the issues', () => {
    try {
      buildTouristTrip({ name: '' });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TripValidationError);
      expect((err as TripValidationError).issues).toEqual([
        { path: 'name', code: 'required', message: 'This field is required.' },
      ]);
    }
  });

  it('does not mutate its input', () => {
    const input = { name: ' T ', days: [{ stops: [{ name: 'A', time: '09:00' }, { name: '' }] }] };
    const copy = structuredClone(input);
    buildTouristTrip(input);
    expect(input).toEqual(copy);
  });

  it('never emits rating or review properties', () => {
    const input = { name: 'T', aggregateRating: { ratingValue: 5 }, review: [{}] };
    const out = buildTouristTrip(input) as unknown as Record<string, unknown>;
    expect(out).not.toHaveProperty('aggregateRating');
    expect(out).not.toHaveProperty('review');
  });

  it('ignores non-string values instead of coercing them', () => {
    expect(validateTrip({ name: 42 })).toEqual([
      { path: 'name', code: 'required', message: 'This field is required.' },
    ]);
  });

  it('rejects non-finite numeric prices', () => {
    const result = tryBuildTouristTrip({ name: 'T', offers: { price: Number.NaN, priceCurrency: 'EUR' } });
    expect(result.ok).toBe(false);
  });
});

describe('serialization', () => {
  it('cannot break out of a script element', () => {
    const script = toJsonLdScript({ name: 'T', description: '</script><script>alert(1)</script> & more' });
    expect(script.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(script.match(/<\/script>/g)).toHaveLength(1);
    const json = script.slice('<script type="application/ld+json">'.length, -'</script>'.length);
    expect(JSON.parse(json).description).toBe('</script><script>alert(1)</script> & more');
  });

  it('escapes line separators', () => {
    expect(serializeJsonLd({ a: '\u2028\u2029' })).toBe('{"a":"\\u2028\\u2029"}');
  });
});
