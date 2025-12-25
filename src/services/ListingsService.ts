import {
  FileSystem,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  KeyValueStore,
  UrlParams,
} from '@effect/platform';
import { NodeFileSystem, NodeHttpClient, NodeKeyValueStore } from '@effect/platform-node';
import {
  Effect,
  Schema as S,
  Config,
  Option,
  Array as Arr,
  Stream,
  pipe,
} from 'effect';
import { AutoDevListing, ApiResponse, CachedListings } from '../schema.js';

export interface SearchParams {
  zip: string;
  distance: number;
  engine: string;
  brand?: string;
  model?: string;
  milesRange?: string;
  priceRange?: string;
  yearRange?: string;
}
export interface FetchParams extends SearchParams {
  onProgress?: (count: number) => Effect.Effect<void>;
  onStatus?: (status: string) => Effect.Effect<void>;
}

const BASE_URL = 'https://api.auto.dev/listings';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const ValidCache = CachedListings.pipe(
  S.filter((c) => Date.now() - c.timestamp < CACHE_TTL_MS),
);

const toCacheKey = ({ zip, distance, engine, brand, model, milesRange, priceRange, yearRange }: SearchParams) =>
  pipe(
    ['listings', zip, String(distance), engine, brand, model, milesRange, priceRange, yearRange],
    Arr.map(Option.fromNullable),
    Arr.map(Option.getOrElse(() => 'any')),
    Arr.join('_'),
  );

const PAGE_SIZE = 100;

export class ListingsService extends Effect.Service<ListingsService>()(
  'ListingsService',
  {
    effect: Effect.all([
      Config.string('AUTO_DEV_API_KEY'),
      KeyValueStore.KeyValueStore,
      HttpClient.HttpClient,
      FileSystem.FileSystem,
    ]).pipe(
      Effect.map(([apiKey, kv, http, fs]) => ({
        fetch: (
          params: FetchParams,
        ): Effect.Effect<readonly AutoDevListing[], Error> => {
          const cacheKey = toCacheKey(params);
          const reportProgress = params.onProgress ?? (() => Effect.sync(() => {}));
          const reportStatus = params.onStatus
            ?? ((msg: string) => Effect.logInfo(msg));
          const cacheAttempt = kv.get(cacheKey).pipe(
            Effect.flatMap(
              Option.match({
                onSome: (data) => Effect.succeed(data),
                onNone: () => Effect.fail(new Error('cache miss')),
              }),
            ),
            Effect.flatMap((data) =>
              S.decodeUnknown(ValidCache)(JSON.parse(data)).pipe(
                Effect.tap((c) => reportProgress(c.listings.length)),
                Effect.tap(() => reportStatus('Loaded from cache')),
              ),
            ),
            Effect.map((c) => c.listings),
            Effect.tapError(() => reportStatus('Cache miss')),
          );

          const fetchPage = (page: number) =>
            HttpClientRequest.get(BASE_URL).pipe(
              HttpClientRequest.setUrlParams(
                UrlParams.fromInput({
                  'zip': params.zip,
                  'limit': String(PAGE_SIZE),
                  'page': String(page),
                  'distance': String(params.distance),
                  'retailListing.miles': params.milesRange ?? '0-25100',
                  'retailListing.price': params.priceRange ?? '0-50000',
                  'vehicle.year': params.yearRange ?? '2023-2026',
                  'vehicle.fuel': params.engine,
                  ...(params.brand && { 'vehicle.make': params.brand }),
                  ...(params.model && { 'vehicle.model': params.model }),
                }),
              ),
              HttpClientRequest.bearerToken(apiKey),
              http.execute,
              Effect.tap((response) => reportStatus(`Page ${page}: HTTP ${response.status}`)),
              Effect.flatMap((response) =>
                response.text.pipe(
                  Effect.tap((body) => fs.writeFileString(`./cache/raw_page_${page}.json`, body)),
                  Effect.map((body) => JSON.parse(body) as { data: unknown[] }),
                ),
              ),
              Effect.tap((json) => reportStatus(`Page ${page}: ${json.data.length} listings`)),
              Effect.flatMap((json) => S.decodeUnknown(ApiResponse)(json)),
              Effect.map((r) => r.data),
            );

          const fetchFromApi = pipe(
            reportStatus('Querying API'),
            Effect.zipRight(
              Stream.paginateEffect(1, (page) =>
                fetchPage(page).pipe(
                  Effect.map((listings) => [
                    listings,
                    listings.length < PAGE_SIZE ? Option.none() : Option.some(page + 1),
                  ] as const),
                ),
              ).pipe(
                Stream.runFoldEffect(
                  [] as AutoDevListing[],
                  (acc, listings) => {
                    const combined = [...acc, ...listings];
                    return pipe(reportProgress(combined.length), Effect.as(combined));
                  },
                ),
              ),
            ),
            Effect.tap((listings) =>
              kv.set(
                toCacheKey(params),
                JSON.stringify({ timestamp: Date.now(), listings }),
              ),
            ),
            Effect.tap(() => reportStatus('Loaded from API')),
          );

          return pipe(
            reportStatus('Loading cache'),
            Effect.zipRight(cacheAttempt),
            Effect.orElse(() =>
              pipe(
                reportStatus('Cache miss, querying API'),
                Effect.zipRight(fetchFromApi),
              ),
            ),
          );
        },
      })),
    ),
    dependencies: [
      NodeKeyValueStore.layerFileSystem('./cache'),
      NodeHttpClient.layer,
      NodeFileSystem.layer,
    ],
  },
) {}
