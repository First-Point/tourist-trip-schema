import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTouristTrip } from '../src/index.js';

/*
 * Every property this library emits must be defined by schema.org for the
 * type it appears on (directly or through a parent type). This allowlist
 * was checked against the official vocabulary file
 * (https://schema.org/version/latest/schemaorg-current-https.jsonld,
 * `schema:domainIncludes` plus `rdfs:subClassOf`) on 2026-10-02.
 *
 * Adding a property to the output means adding it here, which means
 * checking the vocabulary first.
 */
const ALLOWED: Record<string, readonly string[]> = {
  TouristTrip: [
    'name', 'description', 'url', 'image', 'identifier', 'touristType', 'provider',
    'offers', 'departureTime', 'arrivalTime', 'itinerary', 'subTrip',
  ],
  Trip: ['name', 'description', 'departureTime', 'arrivalTime', 'itinerary'],
  Organization: ['name', 'url'],
  Person: ['name', 'url'],
  Offer: ['price', 'priceCurrency', 'name', 'url'],
  ItemList: ['numberOfItems', 'itemListElement'],
  ListItem: ['position', 'item'],
  TouristAttraction: ['name', 'description', 'url', 'image', 'address', 'geo'],
  Place: ['name', 'description', 'url', 'image', 'address', 'geo'],
  GeoCoordinates: ['latitude', 'longitude'],
};

function walk(node: unknown, found: string[]): void {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, found));
  if (typeof node !== 'object' || node === null) return;
  const record = node as Record<string, unknown>;
  const type = record['@type'];
  if (typeof type === 'string') {
    const allowed = ALLOWED[type];
    if (!allowed) found.push(`unknown type ${type}`);
    for (const key of Object.keys(record)) {
      if (key.startsWith('@')) continue;
      if (allowed && !allowed.includes(key)) found.push(`${type}.${key}`);
    }
  }
  Object.values(record).forEach((v) => walk(v, found));
}

describe('schema.org vocabulary', () => {
  const dir = join(import.meta.dirname, '..', 'fixtures', 'valid');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

  it.each(files)('%s emits only defined properties', (file) => {
    const fixture = JSON.parse(readFileSync(join(dir, file), 'utf8')) as { input: unknown };
    const found: string[] = [];
    walk(buildTouristTrip(fixture.input), found);
    expect(found).toEqual([]);
  });
});
