# Roadmap

## Phase 1: JavaScript (this repository)

- [x] Library, types, validation, safe serialization
- [x] Cross-language fixtures (`fixtures/`) and vocabulary allowlist test
- [ ] Publish `tourist-trip-schema` to npm (trusted publishing, see
      `.github/workflows/release.yml`)
- [ ] Consumed by the WordPress block (`First-Point/tour-itinerary`)

## Phase 2: PHP, Python, Ruby

Each port lives in **its own repository**, has the same function names in
the language's idiom, and must pass the fixtures of the JavaScript release
it targets, unchanged. No port invents behaviour: a change starts here, in
the fixtures, and is then carried to the ports.

| Language | Registry | Package name | Repository |
| --- | --- | --- | --- |
| PHP 8.1+ | Packagist | `yournext/tourist-trip-schema` | `First-Point/tourist-trip-schema-php` |
| Python 3.10+ | PyPI | `tourist-trip-schema` (import `tourist_trip_schema`) | `First-Point/tourist-trip-schema-py` |
| Ruby 3.1+ | RubyGems | `tourist_trip_schema` | `First-Point/tourist-trip-schema-rb` |

### API per language

| JavaScript | PHP | Python | Ruby |
| --- | --- | --- | --- |
| `buildTouristTrip` | `TouristTripSchema::build()` | `build_tourist_trip()` | `TouristTripSchema.build` |
| `tryBuildTouristTrip` | `TouristTripSchema::tryBuild()` | `try_build_tourist_trip()` | `TouristTripSchema.try_build` |
| `validateTrip` | `TouristTripSchema::validate()` | `validate_trip()` | `TouristTripSchema.validate` |
| `toJsonLdScript` | `TouristTripSchema::toScript()` | `to_json_ld_script()` | `TouristTripSchema.to_script` |
| `TripValidationError` | `TripValidationException` | `TripValidationError` | `TouristTripSchema::ValidationError` |

### Fixture sharing

- The fixtures are copied into each port by a script that downloads the
  `tourist-trip-schema` npm tarball of a pinned version and extracts
  `fixtures/`. The pinned version is recorded in the port's README
  ("passes fixtures of tourist-trip-schema X.Y.Z").
- No git submodules: they complicate Packagist and gem builds.

### Port-specific pitfalls

- **PHP:** serialize with `JSON_HEX_TAG | JSON_HEX_AMP |
  JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES` and escape U+2028/U+2029
  (`JSON_UNESCAPED_LINE_TERMINATORS` must stay off). An empty PHP array
  encodes as `[]`; make sure an object-typed value is never emitted empty.
  PHP's `trim()` only strips ASCII whitespace: use a Unicode-aware regex.
- **Python:** `json.dumps(..., ensure_ascii=False)` then the same `<`, `>`,
  `&`, U+2028, U+2029 escaping. `bool` is a subclass of `int`: reject it for
  price and coordinates.
- **Ruby:** `JSON.generate` escapes differently; apply the same escaping
  explicitly. Use `String#strip` carefully: it does not strip all Unicode
  whitespace that JavaScript's `trim()` does; normalize with a regex.
- **All:** whitespace trimming must match JavaScript `String.prototype.trim`
  (Unicode White_Space plus line terminators). Add a fixture when a
  difference is found.
