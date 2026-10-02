import { buildTouristTrip } from './core.js';
import type { TripInput } from './types.js';

/**
 * JSON that is safe to place inside an HTML `<script>` element.
 *
 * Plain `JSON.stringify` is not: a trip description containing
 * `</script>` would close the element and let the rest run as HTML.
 * Escaping `<`, `>` and `&` as Unicode escapes keeps the JSON identical
 * for any parser while making it inert for the HTML tokenizer. U+2028 and
 * U+2029 are escaped for older JavaScript engines that treat them as line
 * terminators.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * A complete `<script type="application/ld+json">` element for the trip.
 * Throws `TripValidationError` on invalid input.
 */
export function toJsonLdScript(input: TripInput | unknown): string {
  return `<script type="application/ld+json">${serializeJsonLd(buildTouristTrip(input))}</script>`;
}
