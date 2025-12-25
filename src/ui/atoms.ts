import { Atom } from '@effect-atom/atom-react';
import { Effect, Layer } from 'effect';
import {
  filterListings,
  sortListings,
  type SortDir,
  type SortKey,
} from '../domain/sorting.js';
import type { AutoDevListing } from '../schema.js';

const runtime = Atom.runtime(Layer.empty);

export type ViewState = {
  search: string;
  searchInput: string;
  searchMode: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  page: number;
  pageSize: number;
  cpoOnly: boolean;
  modelFilter: string | null;
  modelSelectMode: boolean;
  yearFilter: number | null;
  yearSelectMode: boolean;
};

export const initialViewState: ViewState = {
  search: '',
  searchInput: '',
  searchMode: false,
  sortKey: 'price',
  sortDir: 'asc',
  page: 0,
  pageSize: 15,
  cpoOnly: false,
  modelFilter: null,
  modelSelectMode: false,
  yearFilter: null,
  yearSelectMode: false,
};

export const viewStateAtom = Atom.make<ViewState>(initialViewState);

export const listingsAtom = Atom.make<readonly AutoDevListing[]>([]);
export const loadingAtom = Atom.make(true);
export const loadedCountAtom = Atom.make(0);
export const spinnerFrameAtom = Atom.make('|');
export const loadingStatusAtom = Atom.make('Loading records...');

export const modelsAtom = Atom.make((get) => {
  const unique = new Set<string>();
  for (const listing of get(listingsAtom)) {
    const model = listing.vehicle.model;
    if (model && model.length > 0) {
      unique.add(model);
    }
  }
  return Array.from(unique).sort();
});

export const modelItemsAtom = Atom.make((get) => [
  { label: 'All models', value: null as string | null },
  ...get(modelsAtom).map((model) => ({ label: model, value: model })),
]);

export const yearsAtom = Atom.make((get) => {
  const unique = new Set<number>();
  for (const listing of get(listingsAtom)) {
    unique.add(listing.vehicle.year);
  }
  return Array.from(unique).sort((a, b) => b - a);
});

export const yearItemsAtom = Atom.make((get) => [
  { label: 'All years', value: null as number | null },
  ...get(yearsAtom).map((year) => ({ label: String(year), value: year })),
]);

export const filteredAtom = Atom.make((get) =>
  filterListings(
    get(listingsAtom),
    get(viewStateAtom).search,
    get(viewStateAtom).cpoOnly,
    get(viewStateAtom).modelFilter,
    get(viewStateAtom).yearFilter,
  ),
);

export const sortedAtom = Atom.make((get) =>
  sortListings(get(filteredAtom), get(viewStateAtom).sortKey, get(viewStateAtom).sortDir),
);

export const totalPagesAtom = Atom.make((get) => {
  const total = get(sortedAtom).length;
  return Math.max(1, Math.ceil(total / get(viewStateAtom).pageSize));
});

export const visibleAtom = Atom.make((get) => {
  const { page, pageSize } = get(viewStateAtom);
  const sorted = get(sortedAtom);
  const start = page * pageSize;
  return sorted.slice(start, start + pageSize);
});

export const headerAtom = Atom.make((get) => ({
  sortKey: get(viewStateAtom).sortKey,
  sortDir: get(viewStateAtom).sortDir,
  search: get(viewStateAtom).search,
  page: get(viewStateAtom).page,
  total: get(sortedAtom).length,
  pageSize: get(viewStateAtom).pageSize,
  cpoOnly: get(viewStateAtom).cpoOnly,
  modelFilter: get(viewStateAtom).modelFilter,
  totalPages: get(totalPagesAtom),
}));

const updateState = (
  ctx: Atom.FnContext,
  update: (state: ViewState) => ViewState,
) =>
  Effect.sync(() => {
    ctx.set(viewStateAtom, update(ctx(viewStateAtom)));
  });

export const setSortKeyAction = runtime.fn((key: SortKey, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    sortKey: key,
    page: 0,
  })),
);

export const toggleSortDirAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    sortDir: state.sortDir === 'asc' ? 'desc' : 'asc',
  })),
);

export const nextPageAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => {
    const next = Math.min(state.page + 1, ctx(totalPagesAtom) - 1);
    return { ...state, page: next };
  }),
);

export const prevPageAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    page: Math.max(state.page - 1, 0),
  })),
);

export const toggleCpoAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    cpoOnly: !state.cpoOnly,
    page: 0,
  })),
);

export const clearSearchAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    search: '',
    searchInput: '',
    page: 0,
  })),
);

export const startSearchAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    searchMode: true,
    searchInput: state.search,
  })),
);

export const cancelSearchAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    searchMode: false,
    searchInput: state.search,
  })),
);

export const commitSearchAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    search: state.searchInput,
    searchMode: false,
    page: 0,
  })),
);

export const appendSearchCharAction = runtime.fn((char: string, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    searchInput: `${state.searchInput}${char}`,
  })),
);

export const deleteSearchCharAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    searchInput: state.searchInput.slice(0, -1),
  })),
);

export const openModelSelectAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    modelSelectMode: true,
  })),
);

export const closeModelSelectAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    modelSelectMode: false,
  })),
);

export const applyModelFilterAction = runtime.fn((value: string | null, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    modelFilter: value,
    page: 0,
    modelSelectMode: false,
  })),
);

export const clearModelFilterAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    modelFilter: null,
    page: 0,
  })),
);

export const openYearSelectAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    yearSelectMode: true,
  })),
);

export const closeYearSelectAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    yearSelectMode: false,
  })),
);

export const applyYearFilterAction = runtime.fn((value: number | null, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    yearFilter: value,
    page: 0,
    yearSelectMode: false,
  })),
);

export const clearYearFilterAction = runtime.fn((_: void, ctx) =>
  updateState(ctx, (state) => ({
    ...state,
    yearFilter: null,
    page: 0,
  })),
);
