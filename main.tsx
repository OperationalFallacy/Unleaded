#!/usr/bin/env node

import { Command, Options } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer, Option } from "effect";
import { ListingsService } from "./src/services/ListingsService.js";
import { renderApp } from "./src/ui/App.js";

const command = Command.make(
  "unleaded",
  {
    zip: Options.text("zip").pipe(
      Options.withAlias("z"),
      Options.withDescription("Zip code for search location")
    ),
    brand: Options.text("brand").pipe(
      Options.withAlias("b"),
      Options.withDescription("Brand/make name (e.g., Hyundai, Tesla)"),
      Options.optional
    ),
    model: Options.text("model").pipe(
      Options.withAlias("m"),
      Options.withDescription("Model name (e.g., Ioniq 5, Model 3)"),
      Options.optional
    ),
    distance: Options.integer("distance").pipe(
      Options.withAlias("d"),
      Options.withDescription("Search radius in miles"),
      Options.withDefault(50)
    ),
    engine: Options.text("engine").pipe(
      Options.withAlias("e"),
      Options.withDescription("Engine type (default is electric)"),
      Options.withDefault("electric")
    ),
  },
  ({ zip, brand, model, distance, engine }) =>
    Effect.gen(function* () {
      const service = yield* ListingsService;
      const listings = yield* service.fetch({
        zip,
        distance,
        engine,
        brand: Option.getOrUndefined(brand),
        model: Option.getOrUndefined(model),
      });
      yield* Effect.sync(() => renderApp(listings));
    })
);

const MainLayer = Layer.mergeAll(ListingsService.Default, NodeContext.layer);

NodeRuntime.runMain(
  Command.run(command, { name: "unleaded", version: "0.0.1" })(
    process.argv
  ).pipe(Effect.provide(MainLayer))
);
