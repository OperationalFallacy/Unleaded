# Add CPO filter, image link, dealer column

## Task Interpretation

Extend the CLI listings view with a CPO-only filter, expose the listing image link alongside Carfax, and surface the dealer name so shoppers can see who is offering each car.

## Approach

- Add a CPO toggle to the filtering pipeline and input map without introducing fallback guards.
- Rename the Carfax column to Links and render both Carfax and primary image targets via the existing hyperlink helper.
- Introduce a dealer column while preserving the current sort/search flow and pagination.

## Implementation

- `cpoOnly` flag toggled with `[o]` feeds the filter pipeline; search now includes dealer names.
- Table header renamed to Links with `carfax` and `image` hyperlinks; dealer and CPO columns added to the row layout.
- Pagination uses a minimum page count of 1 to keep navigation stable when filters yield no rows.
- Location and dealer columns widened to avoid wrapping and better use terminal width.
- Dealer column expanded by ~50% with truncation to keep long names from overflowing.
