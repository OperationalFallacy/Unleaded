#!/usr/bin/env node

import { Effect, Layer, pipe } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { ListingsService } from "./src/services/ListingsService.js";
import { renderApp } from "./src/ui/App.js";

const program = pipe(
  Effect.sync(() => process.argv[2]),
  Effect.filterOrFail(
    (z): z is string => Boolean(z),
    () => new Error("Usage: npx tsx main.tsx <zip>")
  ),
  Effect.flatMap((zip) =>
    pipe(
      ListingsService,
      Effect.flatMap((service) => service.fetch(zip))
    )
  ),
  Effect.tap((listings) => Effect.sync(() => renderApp(listings)))
);

const MainLayer = Layer.mergeAll(ListingsService.Default);

NodeRuntime.runMain(
  pipe(
    program,
    Effect.provide(MainLayer),
    Effect.catchAll((e) =>
      Effect.sync(() => {
        console.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      })
    )
  )
);
