import { Schema as S, String as Str } from "effect";
import { NormalizedModelName } from "./domain/modelNormalizer.js";

const normalizeText = (value: string): string =>
  Str.capitalize(Str.toLowerCase(value));

const NormalizedText = S.transform(S.String, S.String, {
  strict: true,
  decode: (value) => normalizeText(value),
  encode: (value) => value,
});

export const Location = S.Tuple(S.Number, S.Number);

export const Vehicle = S.Struct({
  baseInvoice: S.optional(S.Number),
  baseMsrp: S.optional(S.Number),
  bodyStyle: S.optional(S.String),
  confidence: S.Number,
  doors: S.optional(S.Number),
  drivetrain: S.optional(S.String),
  engine: S.optional(S.String),
  exteriorColor: S.optional(S.String),
  interiorColor: S.optional(S.String),
  fuel: NormalizedText,
  make: NormalizedText,
  model: NormalizedModelName,
  seats: S.optional(S.Number),
  series: S.optional(S.String),
  squishVin: S.String,
  style: S.optional(S.String),
  transmission: S.optional(S.String),
  trim: S.optional(S.Union(S.String, S.Number)),
  type: S.optional(S.String),
  vin: S.optional(S.String),
  year: S.Number,
});

export const RetailListing = S.Struct({
  carfaxUrl: S.String,
  city: S.String,
  cpo: S.optional(S.Boolean),
  dealer: S.String,
  photoCount: S.Number,
  price: S.optional(S.Number),
  primaryImage: S.String,
  state: S.String,
  used: S.optional(S.Boolean),
  vdp: S.String,
  zip: S.optional(S.String),
  miles: S.optional(S.Number),
});

export const History = S.Struct({
  accidentCount: S.optional(S.Number),
  accidents: S.optional(S.Boolean),
  oneOwner: S.optional(S.Boolean),
  ownerCount: S.optional(S.Number),
  personalUse: S.optional(S.Boolean),
  usageType: S.optional(S.String),
});

export const AutoDevListing = S.Struct({
  "@id": S.String,
  vin: S.String,
  createdAt: S.String,
  location: Location,
  online: S.Boolean,
  vehicle: Vehicle,
  wholesaleListing: S.Null,
  retailListing: RetailListing,
  history: S.NullOr(History),
});

export type AutoDevListing = S.Schema.Type<typeof AutoDevListing>;

export const ApiResponse = S.Struct({
  data: S.Array(AutoDevListing),
});

export const CachedListings = S.Struct({
  timestamp: S.Number,
  listings: S.Array(AutoDevListing),
});

export type CachedListings = S.Schema.Type<typeof CachedListings>;
