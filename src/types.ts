/**
 * Input and output shapes.
 *
 * Input is deliberately flat and editor-friendly (a trip has days, a day has
 * stops). Output only uses properties that schema.org defines for the type
 * they appear on, so the result passes the Schema.org validator without
 * warnings about unknown properties.
 */

/* ------------------------------------------------------------------ input */

export interface TripInput {
  /** Trip title. Required. */
  name: string;
  description?: string | undefined;
  /** Absolute http(s) URL of the page describing the trip. */
  url?: string | undefined;
  /** One or more absolute http(s) image URLs. */
  image?: string | string[] | undefined;
  identifier?: string | undefined;
  /** Audience, e.g. "Families", "History enthusiasts". */
  touristType?: string | string[] | undefined;
  provider?: ProviderInput | undefined;
  offers?: OfferInput | OfferInput[] | undefined;
  /**
   * The itinerary. A single unnamed day is emitted as the trip's own
   * itinerary; anything else becomes one `subTrip` per day.
   */
  days?: DayInput[] | undefined;
}

export interface ProviderInput {
  /** Defaults to "Organization". */
  type?: 'Organization' | 'Person' | undefined;
  name: string;
  url?: string | undefined;
}

export interface OfferInput {
  /** Non-negative number, or a plain decimal string such as "49.90". */
  price: number | string;
  /** ISO 4217 code, e.g. "EUR". Case-insensitive on input. */
  priceCurrency: string;
  name?: string | undefined;
  url?: string | undefined;
}

export interface DayInput {
  name?: string | undefined;
  description?: string | undefined;
  stops?: StopInput[] | undefined;
}

export interface StopInput {
  name: string;
  description?: string | undefined;
  /**
   * Local time ("09:30", "09:30:00") or an ISO 8601 date-time.
   * Used for the day's departure and arrival time; schema.org has no
   * per-stop time on a Place.
   */
  time?: string | undefined;
  /** Defaults to "TouristAttraction". Use "Place" for meals, meeting points. */
  type?: 'TouristAttraction' | 'Place' | undefined;
  url?: string | undefined;
  image?: string | undefined;
  /** Free-form postal address. */
  address?: string | undefined;
  geo?: GeoInput | undefined;
}

export interface GeoInput {
  latitude: number;
  longitude: number;
}

/* ----------------------------------------------------------------- output */

export interface TouristTripJsonLd {
  '@context': 'https://schema.org';
  '@type': 'TouristTrip';
  name: string;
  description?: string;
  url?: string;
  image?: string | string[];
  identifier?: string;
  touristType?: string | string[];
  provider?: ProviderJsonLd;
  offers?: OfferJsonLd | OfferJsonLd[];
  departureTime?: string;
  arrivalTime?: string;
  itinerary?: ItemListJsonLd;
  subTrip?: TripJsonLd[];
}

export interface TripJsonLd {
  '@type': 'Trip';
  name?: string;
  description?: string;
  departureTime?: string;
  arrivalTime?: string;
  itinerary?: ItemListJsonLd;
}

export interface ProviderJsonLd {
  '@type': 'Organization' | 'Person';
  name: string;
  url?: string;
}

export interface OfferJsonLd {
  '@type': 'Offer';
  price: number;
  priceCurrency: string;
  name?: string;
  url?: string;
}

export interface ItemListJsonLd {
  '@type': 'ItemList';
  numberOfItems: number;
  itemListElement: ListItemJsonLd[];
}

export interface ListItemJsonLd {
  '@type': 'ListItem';
  position: number;
  item: PlaceJsonLd;
}

export interface PlaceJsonLd {
  '@type': 'TouristAttraction' | 'Place';
  name: string;
  description?: string;
  url?: string;
  image?: string;
  address?: string;
  geo?: {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
  };
}

/* ----------------------------------------------------------------- issues */

export type IssueCode =
  | 'required'
  | 'invalid_url'
  | 'invalid_time'
  | 'invalid_price'
  | 'invalid_currency'
  | 'invalid_type'
  | 'out_of_range';

export interface Issue {
  /** Dotted path into the input, e.g. "days[0].stops[2].name". */
  path: string;
  code: IssueCode;
  message: string;
}
