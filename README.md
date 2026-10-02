# tourist-trip-schema

Build valid [schema.org `TouristTrip`](https://schema.org/TouristTrip)
JSON-LD for tour itineraries: walking tours, day trips, multi-day
programmes. Zero dependencies, typed, and safe to drop into a `<script>`
tag.

```sh
npm install tourist-trip-schema
```

## Usage

```js
import { toJsonLdScript } from 'tourist-trip-schema';

const html = toJsonLdScript({
  name: 'Sultanahmet Highlights',
  url: 'https://example.com/tours/sultanahmet',
  provider: { name: 'Example Tours', url: 'https://example.com' },
  offers: { price: '45', priceCurrency: 'EUR' },
  days: [
    {
      stops: [
        { name: 'Hagia Sophia', time: '09:00', geo: { latitude: 41.0086, longitude: 28.9802 } },
        { name: 'Basilica Cistern', time: '10:30' },
        { name: 'Lunch', type: 'Place', time: '12:15' },
      ],
    },
  ],
});
// <script type="application/ld+json">{"@context":"https://schema.org","@type":"TouristTrip",...}</script>
```

A single untitled day becomes the trip's `itinerary`. Several days, or a
day with a name, become one `subTrip` per day:

```js
buildTouristTrip({
  name: 'Cappadocia in Two Days',
  days: [
    { name: 'Day 1: Valleys', stops: [{ name: 'Goreme Open-Air Museum', time: '09:30' }] },
    { name: 'Day 2: Underground', stops: [{ name: 'Derinkuyu Underground City' }] },
  ],
});
```

## API

| Function | Returns |
| --- | --- |
| `buildTouristTrip(input)` | The JSON-LD object. Throws `TripValidationError` (with `.issues`) on invalid input. |
| `tryBuildTouristTrip(input)` | `{ ok: true, data }` or `{ ok: false, issues }`. Never throws. |
| `validateTrip(input)` | An array of issues; empty means valid. |
| `toJsonLdScript(input)` | A complete `<script type="application/ld+json">` element. |
| `serializeJsonLd(data)` | JSON that cannot break out of a `<script>` element. |

Each issue is `{ path, code, message }`, for example
`{ path: 'days[0].stops[2].time', code: 'invalid_time', ... }`. Paths point
at the index in **your** input, so an editor can highlight the right row.
Codes: `required`, `invalid_url`, `invalid_time`, `invalid_price`,
`invalid_currency`, `invalid_type`, `out_of_range`.

### Input

| Field | Notes |
| --- | --- |
| `name` | Required. |
| `description`, `identifier` | Text. |
| `url`, `image` | Absolute http(s) URLs. `image` may be a list. |
| `touristType` | Audience, text or list of text. |
| `provider` | `{ name, url?, type?: 'Organization' \| 'Person' }` |
| `offers` | `{ price, priceCurrency, name?, url? }` or a list of them. Price is a number or a decimal string such as `"49.90"`; currency is ISO 4217. |
| `days[]` | `{ name?, description?, stops[] }` |
| `days[].stops[]` | `{ name, description?, time?, type?: 'TouristAttraction' \| 'Place', url?, image?, address?, geo?: { latitude, longitude } }` |

Strings are trimmed and empty rows are dropped, so you can pass editor
state as it is.

## What it deliberately does not do

- **No ratings or reviews.** `aggregateRating` and `review` are never
  emitted. Self-declared ratings are a common reason for structured data
  penalties; if you have real third-party reviews, add them yourself.
- **No per-stop times.** schema.org has no time property on a `Place`.
  Stop times set the day's `departureTime` (first timed stop) and
  `arrivalTime` (last timed stop).
- **No properties outside the vocabulary.** Every emitted property is
  defined by schema.org for its type; a test enforces this.

Note that Google does not currently show a rich result for `TouristTrip`.
The markup helps search engines and AI assistants understand the page;
it does not by itself change how a result looks.

## Other languages

The `fixtures/` directory is the specification. It ships with the package,
and PHP, Python and Ruby ports are planned against it
([roadmap](docs/ROADMAP.md)).

## License

MIT. Maintained by [Your Next Tours](https://yournext.tours), the
live audio guide system for tour groups.
