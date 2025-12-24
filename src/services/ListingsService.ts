import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  KeyValueStore,
  UrlParams,
} from "@effect/platform";
import { NodeHttpClient, NodeKeyValueStore } from "@effect/platform-node";
import {
  Effect,
  Schema as S,
  Config,
  Option,
  Array as Arr,
  pipe,
} from "effect";
import { AutoDevListing, ApiResponse, CachedListings } from "../schema.js";

export interface SearchParams {
  zip: string;
  distance: number;
  engine: string;
  brand?: string;
  model?: string;
}

const BASE_URL = "https://api.auto.dev/listings";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const ValidCache = CachedListings.pipe(
  S.filter((c) => Date.now() - c.timestamp < CACHE_TTL_MS)
);

const toCacheKey = ({ zip, distance, engine, brand, model }: SearchParams) =>
  pipe(
    ["listings", zip, String(distance), engine, brand, model],
    Arr.map(Option.fromNullable),
    Arr.map(Option.getOrElse(() => "any")),
    Arr.join("_")
  );

const PAGE_SIZE = 100;

export class ListingsService extends Effect.Service<ListingsService>()(
  "ListingsService",
  {
    effect: Effect.all([
      Config.string("AUTO_DEV_API_KEY"),
      KeyValueStore.KeyValueStore,
      HttpClient.HttpClient,
    ]).pipe(
      Effect.map(([apiKey, kv, http]) => ({
        fetch: (
          params: SearchParams
        ): Effect.Effect<readonly AutoDevListing[], Error> =>
          kv.get(toCacheKey(params)).pipe(
            Effect.flatMap(
              Option.match({
                onSome: (data) => Effect.succeed(data),
                onNone: () => Effect.fail(new Error("cache miss")),
              })
            ),
            Effect.flatMap((data) =>
              S.decodeUnknown(ValidCache)(JSON.parse(data))
            ),
            Effect.map((c) => c.listings),
            Effect.orElse(() =>
              Effect.gen(function* () {
                const fetchPage = (page: number) =>
                  HttpClientRequest.get(BASE_URL).pipe(
                    HttpClientRequest.setUrlParams(
                      UrlParams.fromInput({
                        zip: params.zip,
                        limit: String(PAGE_SIZE),
                        page: String(page),
                        distance: String(params.distance),
                        "retailListing.miles": "0-25100",
                        "vehicle.engine": params.engine,
                        ...(params.brand && { "vehicle.make": params.brand }),
                        ...(params.model && { "vehicle.model": params.model }),
                      })
                    ),
                    HttpClientRequest.bearerToken(apiKey),
                    http.execute,
                    Effect.flatMap(
                      HttpClientResponse.schemaBodyJson(ApiResponse)
                    ),
                    Effect.map((r) => r.data)
                  );

                const fetchAll = (
                  page: number,
                  acc: AutoDevListing[]
                ): Effect.Effect<AutoDevListing[], Error> =>
                  fetchPage(page).pipe(
                    Effect.flatMap((listings) => {
                      const total = acc.length + listings.length;
                      const combined = [...acc, ...listings];
                      const done = listings.length < PAGE_SIZE
                        ? Option.some(combined)
                        : Option.none<AutoDevListing[]>();
                      return pipe(
                        Effect.logInfo(
                          `Fetching page ${page}: got ${listings.length}, total ${total}`
                        ),
                        Effect.zipRight(
                          pipe(
                            Option.match({
                              onSome: Effect.succeed,
                              onNone: () => fetchAll(page + 1, combined),
                            })(done)
                          )
                        )
                      );
                    })
                  );

                const listings = yield* fetchAll(1, []);

                yield* kv.set(
                  toCacheKey(params),
                  JSON.stringify({ timestamp: Date.now(), listings })
                );

                return listings;
              })
            )
          ),
      }))
    ),
    dependencies: [
      NodeKeyValueStore.layerFileSystem("./cache"),
      NodeHttpClient.layer,
    ],
  }
) {}
