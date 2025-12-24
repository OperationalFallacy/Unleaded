import { KeyValueStore } from '@effect/platform';
import { NodeKeyValueStore } from '@effect/platform-node';
import { Effect, Schema as S, Config, Option, pipe } from 'effect';
import { AutoDevListing, ApiResponse, CachedListings } from '../schema.js';

const BASE_URL = 'https://api.auto.dev/listings';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const buildUrl = (zip: string) =>
  `${BASE_URL}?${new URLSearchParams({
    'vehicle.make': 'Hyundai',
    'vehicle.model': 'Ioniq 5',
    'retailListing.miles': '0-25100',
    zip,
    'limit': '1000',
    'distance': '170',
  }).toString()}`;

const isCacheValid = (cached: CachedListings) =>
  Date.now() - cached.timestamp < CACHE_TTL_MS;

export class ListingsService extends Effect.Service<ListingsService>()(
  'ListingsService',
  {
    effect: Effect.gen(function* () {
      const apiKey = yield* Config.string('AUTO_DEV_API_KEY');
      const kv = yield* KeyValueStore.KeyValueStore;

      const fetchFromApi = (zip: string) =>
        pipe(
          Effect.tryPromise(() =>
            fetch(buildUrl(zip), {
              headers: { Authorization: `Bearer ${apiKey}` },
            }),
          ),
          Effect.filterOrFail(
            (r) => r.ok,
            (r) => new Error(`HTTP ${r.status}`),
          ),
          Effect.flatMap((res) => Effect.tryPromise(() => res.json())),
          Effect.flatMap(S.decodeUnknown(ApiResponse)),
          Effect.map((r) => r.data),
        );

      const getCacheKey = (zip: string) => `listings_${zip}`;

      const getFromCache = (zip: string) =>
        pipe(
          kv.get(getCacheKey(zip)),
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new Error('cache miss')),
              onSome: (data) =>
                S.decodeUnknown(CachedListings)(JSON.parse(data)),
            }),
          ),
        );

      const saveToCache = (zip: string, listings: readonly AutoDevListing[]) =>
        kv.set(
          getCacheKey(zip),
          JSON.stringify({
            timestamp: Date.now(),
            listings: [...listings],
          }),
        );

      const fetchAndCache = (zip: string) =>
        pipe(
          fetchFromApi(zip),
          Effect.tap((listings) => saveToCache(zip, listings)),
        );

      const fetch_ = (
        zip: string,
      ): Effect.Effect<readonly AutoDevListing[], Error> =>
        pipe(
          Effect.option(getFromCache(zip)),
          Effect.flatMap(
            Option.match({
              onNone: () => fetchAndCache(zip),
              onSome: (cached) =>
                Effect.if(isCacheValid(cached), {
                  onTrue: () => Effect.succeed(cached.listings),
                  onFalse: () => fetchAndCache(zip),
                }),
            }),
          ),
        );

      return { fetch: fetch_ };
    }),
    dependencies: [NodeKeyValueStore.layerFileSystem('./cache')],
  },
) {}
