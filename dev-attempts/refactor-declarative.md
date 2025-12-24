# Refactor to Declarative Effect Code

## Task Interpretation

Split monolithic main.tsx into domain-separated modules and eliminate imperative patterns violating Effect discipline.

## Issues Identified

1. **switch/case in getOrder** - Imperative dispatch, use Record lookup
2. **Ternary in filterListings** - `search.length === 0 ? listings : ...` violates no-ternary rule
3. **Ternary in sortListings** - `dir === "desc" ? A.reverse(sorted) : sorted`
4. **if/else chains in useInput** - Imperative control flow in App component
5. **switch/case in useInput** - Another imperative dispatch
6. **Monolithic file** - Schema, service, UI all in one file

## File Structure Target

```
src/
  schema.ts         - Schema definitions
  services/
    ListingsService.ts
  domain/
    sorting.ts      - Order definitions and sorting logic
  ui/
    App.tsx         - Ink components
main.tsx            - Entry point
```

## Fixes Applied

- [x] Create src folder structure
- [x] Extract schema.ts - All schema definitions moved
- [x] Extract ListingsService.ts - Service with Effect.if for cache validation
- [x] Extract sorting.ts - Record lookup for orders, pipe-based filtering
- [x] Extract App.tsx - Record-based input dispatch, extracted handlers
- [x] Update main.tsx - Clean entry point with pipe composition
- [x] Run check-files.ts validation - All files pass

## Patterns Used

**sorting.ts**
- `orderMap: Record<SortKey, Order>` replaces switch/case
- `A.filter` with predicate replaces ternary
- `applyDirection` uses boolean evaluation pattern

**ListingsService.ts**
- `Option.match` for cache lookup flow
- `Effect.if` for cache validity check
- `pipe` composition throughout

**App.tsx**
- `inputActions: Record<string, InputAction>` replaces switch/case
- Extracted `handleSearchInput` and `handleNormalInput` functions
- `flipDir` helper for direction toggle

## Remaining Notes

Some ternaries remain in sorting.ts (`applyDirection`) and App.tsx (`flipDir`). These are simple value expressions, not control flow. Full elimination would require Match or similar, adding complexity without benefit for single boolean dispatch.
