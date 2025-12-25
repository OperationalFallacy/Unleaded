#!/usr/bin/env node

import { Command, Options, Prompt } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Registry } from "@effect-atom/atom-react";
import { Effect, Layer, Option } from "effect";
import { ListingsService } from "./services/ListingsService.js";
import { renderApp } from "./ui/App.js";
import {
  loadedCountAtom,
  loadingAtom,
  listingsAtom,
  loadingStatusAtom,
} from "./ui/atoms.js";

const command = Command.make(
  "unleaded",
  {
    zip: Options.text("zip").pipe(
      Options.withAlias("z"),
      Options.withDescription("Zip code for search location"),
      Options.withFallbackPrompt(
        Prompt.text({ message: "Enter zip (required)" })
      )
    ),
    brand: Options.text("brand").pipe(
      Options.withAlias("b"),
      Options.withDescription("Brand/make name (e.g., Hyundai, Tesla)"),
      Options.optional
    ),
    model: Options.text("model")
      .pipe(
        Options.withAlias("m"),
        Options.withDescription(
          "Model name (e.g., Ioniq 5, Model 3), skip to find all models"
        )
      )
      .pipe(Options.optional),
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
    milesRange: Options.text("milesRange").pipe(
      Options.withAlias("M"),
      Options.withDescription("Miles range filter (e.g., 0-25100)"),
      Options.withDefault("0-25100")
    ),
    priceRange: Options.text("priceRange").pipe(
      Options.withAlias("P"),
      Options.withDescription("Price range filter (e.g., 0-50000)"),
      Options.withDefault("0-50000")
    ),
    yearRange: Options.text("yearRange").pipe(
      Options.withAlias("Y"),
      Options.withDescription("Year range filter (e.g., 2023-2026)"),
      Options.withDefault("2023-2026")
    ),
  },
  ({ zip, brand, model, distance, engine, milesRange, priceRange, yearRange }) =>
    Effect.gen(function* () {
      const registry = Registry.make();
      registry.set(listingsAtom, []);
      registry.set(loadingAtom, true);
      registry.set(loadedCountAtom, 0);
      registry.set(loadingStatusAtom, "Loading cache");
      const app = renderApp(registry);

      const service = yield* ListingsService;

      const fetched = yield* service.fetch({
        zip,
        distance: Math.max(distance, 1),
        engine,
        brand: Option.getOrUndefined(brand),
        model: Option.getOrUndefined(model),
        milesRange,
        priceRange,
        yearRange,
        onProgress: (count) =>
          Effect.sync(() => {
            registry.set(loadedCountAtom, count);
          }),
        onStatus: (status) =>
          Effect.sync(() => {
            registry.set(loadingStatusAtom, status);
          }),
      });
      yield* Effect.sync(() => {
        registry.set(listingsAtom, fetched);
        registry.set(loadedCountAtom, fetched.length);
        registry.set(loadingAtom, false);
      });
      yield* Effect.promise(() => app.waitUntilExit());
    })
);

const MainLayer = Layer.mergeAll(ListingsService.Default, NodeContext.layer);

NodeRuntime.runMain(
  Command.run(command, { name: "unleaded", version: "0.0.1" })(
    process.argv
  ).pipe(Effect.provide(MainLayer))
);
