import type {
  Issue,
  IssueCode,
  ItemListJsonLd,
  OfferJsonLd,
  PlaceJsonLd,
  ProviderJsonLd,
  TouristTripJsonLd,
  TripInput,
  TripJsonLd,
} from './types.js';

/*
 * Pipeline: normalize -> validate -> build.
 *
 * Normalization trims strings and drops rows that are completely empty (an
 * editor typically has a blank "add stop" row). Issue paths always point at
 * the ORIGINAL input index, so a UI can highlight the right row even after
 * blank rows were dropped.
 *
 * Input is treated as untrusted: it may come from plain JavaScript, a CMS or
 * block attributes, so every field is type-checked at runtime.
 */

interface NStop {
  index: number;
  name?: string;
  description?: string;
  time?: string;
  type?: string;
  url?: string;
  image?: string;
  address?: string;
  geo?: { latitude: unknown; longitude: unknown };
}

interface NDay {
  index: number;
  name?: string;
  description?: string;
  stops: NStop[];
}

interface NOffer {
  index: number;
  price?: unknown;
  priceCurrency?: string;
  name?: string;
  url?: string;
}

interface NTrip {
  name?: string;
  description?: string;
  url?: string;
  images: string[];
  identifier?: string;
  touristTypes: string[];
  provider?: { type?: string; name?: string; url?: string };
  offers: NOffer[];
  /** True when `offers` was given as an array (keeps output shape stable). */
  offersIsList: boolean;
  days: NDay[];
}

/* ---------------------------------------------------------------- helpers */

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function textList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const item of list) {
    const t = text(item);
    if (t !== undefined) out.push(t);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/** Absolute http(s) URL, no whitespace, no userinfo. */
const URL_RE = /^https?:\/\/[^\s/?#@]+(?::\d{1,5})?(?:[/?#]\S*)?$/i;

const LOCAL_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/;
const DATE_TIME_RE =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/;

const DECIMAL_RE = /^\d+(?:\.\d+)?$/;
const SIGNED_DECIMAL_RE = /^-?\d+(?:\.\d+)?$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

const PROVIDER_TYPES = ['Organization', 'Person'] as const;
const STOP_TYPES = ['TouristAttraction', 'Place'] as const;

/** "09:30" -> "09:30:00"; date-times and times with seconds pass through. */
function canonicalTime(time: string): string {
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}

function toNumber(value: unknown, pattern: RegExp): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && pattern.test(value.trim())) return Number(value.trim());
  return undefined;
}

/* ------------------------------------------------------------- normalize */

function normalizeStop(raw: unknown, index: number): NStop | undefined {
  if (!isRecord(raw)) return undefined;
  const stop: NStop = { index };
  const name = text(raw.name);
  const description = text(raw.description);
  const time = text(raw.time);
  const type = text(raw.type);
  const url = text(raw.url);
  const image = text(raw.image);
  const address = text(raw.address);
  if (name !== undefined) stop.name = name;
  if (description !== undefined) stop.description = description;
  if (time !== undefined) stop.time = time;
  if (type !== undefined) stop.type = type;
  if (url !== undefined) stop.url = url;
  if (image !== undefined) stop.image = image;
  if (address !== undefined) stop.address = address;
  if (isRecord(raw.geo) && !(isBlank(raw.geo.latitude) && isBlank(raw.geo.longitude))) {
    stop.geo = { latitude: raw.geo.latitude, longitude: raw.geo.longitude };
  }
  // A row with nothing filled in is an unused editor row, not an error.
  return Object.keys(stop).length > 1 ? stop : undefined;
}

function normalizeDay(raw: unknown, index: number): NDay | undefined {
  if (!isRecord(raw)) return undefined;
  const stops: NStop[] = [];
  if (Array.isArray(raw.stops)) {
    raw.stops.forEach((s, i) => {
      const stop = normalizeStop(s, i);
      if (stop) stops.push(stop);
    });
  }
  const day: NDay = { index, stops };
  const name = text(raw.name);
  const description = text(raw.description);
  if (name !== undefined) day.name = name;
  if (description !== undefined) day.description = description;
  return day.name || day.description || stops.length > 0 ? day : undefined;
}

function normalizeOffer(raw: unknown, index: number): NOffer | undefined {
  if (!isRecord(raw)) return undefined;
  const offer: NOffer = { index };
  if (!isBlank(raw.price)) offer.price = raw.price;
  const currency = text(raw.priceCurrency);
  const name = text(raw.name);
  const url = text(raw.url);
  if (currency !== undefined) offer.priceCurrency = currency.toUpperCase();
  if (name !== undefined) offer.name = name;
  if (url !== undefined) offer.url = url;
  return Object.keys(offer).length > 1 ? offer : undefined;
}

function normalize(input: unknown): NTrip {
  const raw = isRecord(input) ? input : {};
  const trip: NTrip = {
    images: textList(raw.image),
    touristTypes: textList(raw.touristType),
    offers: [],
    offersIsList: Array.isArray(raw.offers),
    days: [],
  };
  const name = text(raw.name);
  const description = text(raw.description);
  const url = text(raw.url);
  const identifier = text(raw.identifier);
  if (name !== undefined) trip.name = name;
  if (description !== undefined) trip.description = description;
  if (url !== undefined) trip.url = url;
  if (identifier !== undefined) trip.identifier = identifier;

  if (isRecord(raw.provider)) {
    const provider: NonNullable<NTrip['provider']> = {};
    const pType = text(raw.provider.type);
    const pName = text(raw.provider.name);
    const pUrl = text(raw.provider.url);
    if (pType !== undefined) provider.type = pType;
    if (pName !== undefined) provider.name = pName;
    if (pUrl !== undefined) provider.url = pUrl;
    if (provider.name !== undefined || provider.url !== undefined) trip.provider = provider;
  }

  const offers = Array.isArray(raw.offers) ? raw.offers : raw.offers === undefined ? [] : [raw.offers];
  offers.forEach((o, i) => {
    const offer = normalizeOffer(o, i);
    if (offer) trip.offers.push(offer);
  });

  if (Array.isArray(raw.days)) {
    raw.days.forEach((d, i) => {
      const day = normalizeDay(d, i);
      if (day) trip.days.push(day);
    });
  }
  return trip;
}

/* -------------------------------------------------------------- validate */

const MESSAGES: Record<IssueCode, string> = {
  required: 'This field is required.',
  invalid_url: 'Must be an absolute http or https URL.',
  invalid_time: 'Must be a time such as "09:30" or an ISO 8601 date-time.',
  invalid_price: 'Must be a non-negative number such as 49 or "49.90".',
  invalid_currency: 'Must be a three-letter ISO 4217 currency code such as "EUR".',
  invalid_type: 'Unsupported type.',
  out_of_range: 'Value is out of range.',
};

function check(trip: NTrip): Issue[] {
  const issues: Issue[] = [];
  const add = (path: string, code: IssueCode) => issues.push({ path, code, message: MESSAGES[code] });
  const url = (path: string, value: string | undefined) => {
    if (value !== undefined && !URL_RE.test(value)) add(path, 'invalid_url');
  };

  if (trip.name === undefined) add('name', 'required');
  url('url', trip.url);
  trip.images.forEach((img, i) => url(trip.images.length > 1 ? `image[${i}]` : 'image', img));

  if (trip.provider) {
    const p = trip.provider;
    if (p.type !== undefined && !(PROVIDER_TYPES as readonly string[]).includes(p.type)) {
      add('provider.type', 'invalid_type');
    }
    if (p.name === undefined) add('provider.name', 'required');
    url('provider.url', p.url);
  }

  for (const offer of trip.offers) {
    const base = trip.offersIsList ? `offers[${offer.index}]` : 'offers';
    if (offer.price === undefined) add(`${base}.price`, 'required');
    else {
      const price = toNumber(offer.price, DECIMAL_RE);
      if (price === undefined || price < 0) add(`${base}.price`, 'invalid_price');
    }
    if (offer.priceCurrency === undefined) add(`${base}.priceCurrency`, 'required');
    else if (!CURRENCY_RE.test(offer.priceCurrency)) add(`${base}.priceCurrency`, 'invalid_currency');
    url(`${base}.url`, offer.url);
  }

  for (const day of trip.days) {
    for (const stop of day.stops) {
      const base = `days[${day.index}].stops[${stop.index}]`;
      if (stop.name === undefined) add(`${base}.name`, 'required');
      if (stop.type !== undefined && !(STOP_TYPES as readonly string[]).includes(stop.type)) {
        add(`${base}.type`, 'invalid_type');
      }
      if (stop.time !== undefined && !LOCAL_TIME_RE.test(stop.time) && !DATE_TIME_RE.test(stop.time)) {
        add(`${base}.time`, 'invalid_time');
      }
      url(`${base}.url`, stop.url);
      url(`${base}.image`, stop.image);
      if (stop.geo) {
        const lat = toNumber(stop.geo.latitude, SIGNED_DECIMAL_RE);
        const lng = toNumber(stop.geo.longitude, SIGNED_DECIMAL_RE);
        if (lat === undefined) add(`${base}.geo.latitude`, 'required');
        else if (lat < -90 || lat > 90) add(`${base}.geo.latitude`, 'out_of_range');
        if (lng === undefined) add(`${base}.geo.longitude`, 'required');
        else if (lng < -180 || lng > 180) add(`${base}.geo.longitude`, 'out_of_range');
      }
    }
  }
  return issues;
}

/* ----------------------------------------------------------------- build */

function one<T>(list: T[]): T | T[] {
  return list.length === 1 ? (list[0] as T) : list;
}

function place(stop: NStop): PlaceJsonLd {
  const out: PlaceJsonLd = {
    '@type': (stop.type as PlaceJsonLd['@type'] | undefined) ?? 'TouristAttraction',
    name: stop.name as string,
  };
  if (stop.description !== undefined) out.description = stop.description;
  if (stop.url !== undefined) out.url = stop.url;
  if (stop.image !== undefined) out.image = stop.image;
  if (stop.address !== undefined) out.address = stop.address;
  if (stop.geo) {
    out.geo = {
      '@type': 'GeoCoordinates',
      latitude: toNumber(stop.geo.latitude, SIGNED_DECIMAL_RE) as number,
      longitude: toNumber(stop.geo.longitude, SIGNED_DECIMAL_RE) as number,
    };
  }
  return out;
}

function itinerary(stops: NStop[]): ItemListJsonLd {
  return {
    '@type': 'ItemList',
    numberOfItems: stops.length,
    itemListElement: stops.map((stop, i) => ({ '@type': 'ListItem', position: i + 1, item: place(stop) })),
  };
}

/** Departure = first timed stop; arrival = last timed stop (needs two). */
function times(stops: NStop[]): { departureTime?: string; arrivalTime?: string } {
  const timed = stops.filter((s) => s.time !== undefined).map((s) => canonicalTime(s.time as string));
  const out: { departureTime?: string; arrivalTime?: string } = {};
  if (timed.length > 0) out.departureTime = timed[0] as string;
  if (timed.length > 1) out.arrivalTime = timed[timed.length - 1] as string;
  return out;
}

function assemble(trip: NTrip): TouristTripJsonLd {
  const out: TouristTripJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: trip.name as string,
  };
  if (trip.description !== undefined) out.description = trip.description;
  if (trip.url !== undefined) out.url = trip.url;
  if (trip.images.length > 0) out.image = one(trip.images);
  if (trip.identifier !== undefined) out.identifier = trip.identifier;
  if (trip.touristTypes.length > 0) out.touristType = one(trip.touristTypes);

  if (trip.provider) {
    const provider: ProviderJsonLd = {
      '@type': (trip.provider.type as ProviderJsonLd['@type'] | undefined) ?? 'Organization',
      name: trip.provider.name as string,
    };
    if (trip.provider.url !== undefined) provider.url = trip.provider.url;
    out.provider = provider;
  }

  if (trip.offers.length > 0) {
    const offers = trip.offers.map((o): OfferJsonLd => {
      const offer: OfferJsonLd = {
        '@type': 'Offer',
        price: toNumber(o.price, DECIMAL_RE) as number,
        priceCurrency: o.priceCurrency as string,
      };
      if (o.name !== undefined) offer.name = o.name;
      if (o.url !== undefined) offer.url = o.url;
      return offer;
    });
    out.offers = trip.offersIsList ? offers : (offers[0] as OfferJsonLd);
  }

  const days = trip.days;
  const only = days[0];
  if (days.length === 1 && only && only.name === undefined && only.description === undefined) {
    // A single untitled day is just "the itinerary" of the trip.
    if (only.stops.length > 0) {
      Object.assign(out, times(only.stops));
      out.itinerary = itinerary(only.stops);
    }
  } else if (days.length > 0) {
    out.subTrip = days.map((day): TripJsonLd => {
      const sub: TripJsonLd = { '@type': 'Trip' };
      if (day.name !== undefined) sub.name = day.name;
      if (day.description !== undefined) sub.description = day.description;
      if (day.stops.length > 0) {
        Object.assign(sub, times(day.stops));
        sub.itinerary = itinerary(day.stops);
      }
      return sub;
    });
  }
  return out;
}

/* ---------------------------------------------------------------- public */

export class TripValidationError extends Error {
  readonly issues: Issue[];
  constructor(issues: Issue[]) {
    super(`Invalid trip: ${issues.map((i) => `${i.path} (${i.code})`).join(', ')}`);
    this.name = 'TripValidationError';
    this.issues = issues;
  }
}

export type BuildResult = { ok: true; data: TouristTripJsonLd } | { ok: false; issues: Issue[] };

/** Returns every problem in the input. An empty array means it is buildable. */
export function validateTrip(input: TripInput | unknown): Issue[] {
  return check(normalize(input));
}

/** Builds the JSON-LD object, or returns the issues. Never throws. */
export function tryBuildTouristTrip(input: TripInput | unknown): BuildResult {
  const trip = normalize(input);
  const issues = check(trip);
  return issues.length > 0 ? { ok: false, issues } : { ok: true, data: assemble(trip) };
}

/** Builds the JSON-LD object. Throws `TripValidationError` on invalid input. */
export function buildTouristTrip(input: TripInput | unknown): TouristTripJsonLd {
  const result = tryBuildTouristTrip(input);
  if (!result.ok) throw new TripValidationError(result.issues);
  return result.data;
}

