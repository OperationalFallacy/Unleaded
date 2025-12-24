# Defensive Reflex

Avoid defaulting to defensive coding patterns to resolve uncertainty. Excessive guards, fallbacks, speculative branches, and placeholder states reduce reliability and long-term maintainability. Uncertainty must be addressed at the model or schema boundary, not absorbed into control flow.

When introducing a new service, tag, or layer, define the service contract once and provide a neutral default. Per-variant or environment-specific behavior belongs in layers, not inline conditionals or fallback branches. Do not introduce throw-based placeholders, ad-hoc interfaces, or speculative helper abstractions.

# Declarative Discipline

Do not refactor working declarative flows merely to conform to a stylistic notion of “more declarative.” When a pipeline already follows a clear, single-flow structure without guards or fallbacks, preserve its shape and address only the specific issue identified.
Requests to continue or extend incomplete work must remain within the declared abstraction surface. Missing infrastructure or dependencies must be reported rather than invented. Declarative discipline means removing hacks and compensating logic, not restructuring code for appearance.

# Non-Invention Guardrail

hen established patterns or documentation exist, use them as designed. Do not synthesize alternate flows, parallel abstractions, or novel control structures for novelty or perceived elegance. Favor terseness and directness. Assume documented patterns are correct and treat unprompted invention as a failure mode.

Example

Over-engineered, imperative wiring that manually manages state and lifecycle:

```ts
const eventsAtom = runtime.atom(
  Effect.fnUntraced(function* (get) {
    const stream = yield* service.eventStream;

    yield* Effect.forkScoped(
      Stream.runForEach(stream, (event) =>
        Effect.sync(() => get.setSelf(Result.success(event)))
      )
    );

    return Result.initial();
  })
);
```

Correct, minimal, and pattern-aligned wiring that leverages existing abstractions:

```ts
const eventsAtom = runtime
  .atom(() => Stream.unwrap(Service.eventStream))
  .pipe(Atom.keepAlive);
```

# Front-End State Discipline

Do not introduce parallel or ad-hoc state management mechanisms to compensate for architectural misuse. State must flow through the declared runtime, services, and atoms. UI layers consume exposed atoms directly and invoke service-provided actions for mutations. No local snapshots, mirrors, or workaround layers.

# Core Principles

Validation and uncertainty handling belong at schema or decode boundaries.
After successful decode, treat data as production-ready.
Do not scatter defensive checks, fallback values, or extra state layers.
Prefer existing high-level abstractions over custom control flow.
Keep pipelines flat, readable, and auditable.
Avoid helper extraction driven by aesthetics rather than documented need.

# Primary Rule

Never introduce defensive branches, fallback payloads, or speculative states to mask uncertainty. Address uncertainty by correcting the model, schema, or upstream contract.

# Compile Check

After meaningful edits, run the file-level compile check instead of a full project build. This is the only supported way to validate changes during development.

Use the provided script (adjust as needed to run properly):

```bash
export SHELL=/bin/zsh
~/.n/bin/node ./check-files.ts path-to-file
```

Run this check before reporting completion. Treat any error as blocking. Do not suppress failures with guards, fallback logic, type assertions, or temporary workarounds.
