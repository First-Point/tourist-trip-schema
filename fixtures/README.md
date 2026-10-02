# Fixtures: the cross-language contract

These files define the behaviour of `tourist-trip-schema`. Every
implementation (JavaScript today; PHP, Python and Ruby are planned, see
`docs/ROADMAP.md`) must pass all of them unchanged. They ship inside the npm
package (`tourist-trip-schema/fixtures/*`) so ports can pin them to a release.

## `valid/*.json`

```json
{ "description": "...", "input": { ... }, "expected": { ... } }
```

- Validation of `input` returns no issues.
- Building `input` returns a value that is deep-equal to `expected` once both
  are parsed as JSON. Key order does not matter; array order does.
- Numbers compare by value: `189.5` and `189.50` are equal.

## `invalid/*.json`

```json
{ "input": ..., "issues": [ { "path": "...", "code": "..." } ] }
```

- Validation returns exactly these `{ path, code }` pairs, **in this order**.
  `message` is human-readable and is not part of the contract.
- Building fails (throws, or returns a failure result).

## Rules a port must follow

1. **Normalize before validating.** Trim every string; treat empty strings
   as missing. Non-string values where a string is expected count as
   missing (no coercion), except `price`, `latitude` and `longitude`, which
   also accept plain decimal strings.
2. **Drop blank rows.** A stop with no field filled in, a day with no name,
   no description and no remaining stops, an offer with nothing filled in,
   and a provider with neither name nor URL are silently removed.
3. **Paths use the original index.** A dropped blank row does not shift the
   index reported for the rows after it.
4. **Issue order:** trip `name`, `url`, `image`; provider `type`, `name`,
   `url`; each offer `price`, `priceCurrency`, `url`; then each stop in
   order: `name`, `type`, `time`, `url`, `image`, `geo.latitude`,
   `geo.longitude`.
5. **Output shape:** one image / tourist type is a string, several are an
   array. `offers` given as an object stays an object; given as a list it
   stays a list. A single day with no name and no description becomes the
   trip's own `itinerary`; anything else becomes `subTrip`.
6. **Times:** `HH:MM` becomes `HH:MM:00`; other accepted forms pass through.
   Departure is the first timed stop, arrival the last one when there are
   at least two.
7. **Never emit** properties outside the allowlist in
   `test/vocabulary.test.ts`. In particular no `aggregateRating` or `review`.
