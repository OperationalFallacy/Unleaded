import {
  RegistryContext,
  Registry,
  useAtomSet,
  useAtomValue,
} from '@effect-atom/atom-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Match } from 'effect';
import { Box, Text, useApp, useInput, render, type Instance } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import React from 'react';
import type { SortDir, SortKey } from '../domain/sorting.js';
import type { AutoDevListing } from '../schema.js';
import {
  appendSearchCharAction,
  applyModelFilterAction,
  applyYearFilterAction,
  cancelSearchAction,
  clearModelFilterAction,
  clearSearchAction,
  clearYearFilterAction,
  closeModelSelectAction,
  closeYearSelectAction,
  commitSearchAction,
  deleteSearchCharAction,
  headerAtom,
  modelItemsAtom,
  yearItemsAtom,
  nextPageAction,
  openModelSelectAction,
  openYearSelectAction,
  prevPageAction,
  setSortKeyAction,
  startSearchAction,
  toggleCpoAction,
  toggleSortDirAction,
  visibleAtom,
  loadingAtom,
  loadedCountAtom,
  loadingStatusAtom,
  viewStateAtom,
} from './atoms.js';

const link = (url: string, text: string) =>
  process.stdout.isTTY
    ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`
    : text;

const googleVinLink = (vin: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(vin)}`;

const cpoFilterLabels = ['off', 'on'] as const;
const cpoValueLabels = ['No', 'Yes'] as const;

const truncate = (value: string, width: number): string => {
  if (width <= 0) {
    return '';
  }
  if (value.length <= width) {
    return value;
  }
  const limit = Math.max(0, width - 3);
  return `${value.slice(0, limit)}...`;
};

const Header: React.FC<{
  sortKey: SortKey;
  sortDir: SortDir;
  search: string;
  page: number;
  total: number;
  pageSize: number;
  cpoOnly: boolean;
  modelFilter: string | null;
  yearFilter: number | null;
}> = ({ sortKey, sortDir, search, page, total, pageSize, cpoOnly, modelFilter, yearFilter }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cpoStatus = cpoFilterLabels[Number(cpoOnly)];
  const modelLabel = modelFilter ?? 'all';
  const yearLabel = yearFilter ?? 'all';
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">
        EV Search | Sort: {sortKey} ({sortDir}) | CPO: {cpoStatus} | Page{' '}
        {page + 1}/{totalPages} | {total} results
      </Text>
      <Text dimColor>
        [p]rice [m]iles [y]ear [l]isted | [/]search [c]lear | [o]CPO | [f]model [F]year | [x]clear | [n]ext [b]ack | [r]everse | [q]uit
      </Text>
      {search.length > 0 && <Text color="yellow">Filter: {search}</Text>}
      <Text color="magenta">Model: {modelLabel} | Year: {yearLabel}</Text>
    </Box>
  );
};

const ListingRow: React.FC<{ listing: AutoDevListing }> = ({ listing }) => {
  const created = new Date(listing.createdAt);
  const cpoLabel = cpoValueLabels[Number(listing.retailListing.cpo)];
  const locationText = `${listing.retailListing.city}, ${listing.retailListing.state}`;
  const vin = listing.vin;
  return (
    <Box>
      <Box width={6}>
        <Text>{listing.vehicle.year}</Text>
      </Box>
      <Box width={10}>
        <Text>{truncate(listing.vehicle.make, 10)}</Text>
      </Box>
      <Box width={12}>
        <Text>{truncate(String(listing.vehicle.model), 12)}</Text>
      </Box>
      <Box width={14}>
        <Text>{truncate(String(listing.vehicle.trim ?? ''), 14)}</Text>
      </Box>
      <Box width={8}>
        <Text>{truncate(listing.vehicle.exteriorColor ?? '', 8)}</Text>
      </Box>
      <Box width={8}>
        <Text>{listing.retailListing.miles ?? '?'}</Text>
      </Box>
      <Box width={4}>
        <Text>{listing.history?.accidentCount ?? '?'}</Text>
      </Box>
      <Box width={4}>
        <Text>{listing.history?.ownerCount ?? '?'}</Text>
      </Box>
      <Box width={6}>
        <Text>{cpoLabel}</Text>
      </Box>
      <Box width={10}>
        <Text color="green">${listing.retailListing.price}</Text>
      </Box>
      <Box width={20}>
        <Text>{truncate(locationText, 20)}</Text>
      </Box>
      <Box width={24}>
        <Text>{truncate(listing.retailListing.dealer, 24)}</Text>
      </Box>
      <Box width={14}>
        <Text dimColor>
          {formatDistanceToNowStrict(created, { addSuffix: true })}
        </Text>
      </Box>
      <Box width={22}>
        <Text>{truncate(vin, 22)}</Text>
      </Box>
      <Box width={24}>
        <Text>
          {link(listing.retailListing.carfaxUrl, 'carfax')}{' '}
          {link(listing.retailListing.primaryImage, 'image')}{' '}
          {link(googleVinLink(vin), 'vin')}
        </Text>
      </Box>
    </Box>
  );
};

const TableHeader: React.FC = () => (
  <Box marginBottom={1}>
    <Box width={6}>
      <Text bold>Year</Text>
    </Box>
    <Box width={10}>
      <Text bold>Make</Text>
    </Box>
    <Box width={12}>
      <Text bold>Model</Text>
    </Box>
    <Box width={14}>
      <Text bold>Trim</Text>
    </Box>
    <Box width={8}>
      <Text bold>Color</Text>
    </Box>
    <Box width={8}>
      <Text bold>Miles</Text>
    </Box>
    <Box width={4}>
      <Text bold>Acc</Text>
    </Box>
    <Box width={4}>
      <Text bold>Own</Text>
    </Box>
    <Box width={6}>
      <Text bold>CPO</Text>
    </Box>
    <Box width={10}>
      <Text bold>Price</Text>
    </Box>
    <Box width={20}>
      <Text bold>Location</Text>
    </Box>
    <Box width={24}>
      <Text bold>Dealer</Text>
    </Box>
    <Box width={14}>
      <Text bold>Listed</Text>
    </Box>
    <Box width={18}>
      <Text bold>VIN</Text>
    </Box>
    <Box width={24}>
      <Text bold>Links</Text>
    </Box>
  </Box>
);

export const App: React.FC = () => {
  const { exit } = useApp();
  const header = useAtomValue(headerAtom);
  const visible = useAtomValue(visibleAtom);
  const modelItems = useAtomValue(modelItemsAtom);
  const yearItems = useAtomValue(yearItemsAtom);
  const view = useAtomValue(viewStateAtom);
  const searchMode = view.searchMode;
  const searchInput = view.searchInput;
  const modelSelectMode = view.modelSelectMode;
  const yearSelectMode = view.yearSelectMode;
  const loading = useAtomValue(loadingAtom);
  const loadedCount = useAtomValue(loadedCountAtom);
  const loadingStatus = useAtomValue(loadingStatusAtom);

  const setSortKey = useAtomSet(setSortKeyAction);
  const toggleSortDir = useAtomSet(toggleSortDirAction);
  const nextPage = useAtomSet(nextPageAction);
  const prevPage = useAtomSet(prevPageAction);
  const toggleCpo = useAtomSet(toggleCpoAction);
  const clearSearch = useAtomSet(clearSearchAction);
  const startSearch = useAtomSet(startSearchAction);
  const cancelSearch = useAtomSet(cancelSearchAction);
  const commitSearch = useAtomSet(commitSearchAction);
  const appendSearchChar = useAtomSet(appendSearchCharAction);
  const deleteSearchChar = useAtomSet(deleteSearchCharAction);
  const openModelSelect = useAtomSet(openModelSelectAction);
  const closeModelSelect = useAtomSet(closeModelSelectAction);
  const applyModelFilter = useAtomSet(applyModelFilterAction);
  const clearModelFilter = useAtomSet(clearModelFilterAction);
  const openYearSelect = useAtomSet(openYearSelectAction);
  const closeYearSelect = useAtomSet(closeYearSelectAction);
  const applyYearFilter = useAtomSet(applyYearFilterAction);
  const clearYearFilter = useAtomSet(clearYearFilterAction);

  const handleSearchInput = (
    input: string,
    key: { return?: boolean; escape?: boolean; backspace?: boolean; delete?: boolean; ctrl?: boolean; meta?: boolean },
  ) => {
    if (key.return) {
      commitSearch(undefined);
      return;
    }
    if (key.escape) {
      cancelSearch(undefined);
      return;
    }
    if (key.backspace || key.delete) {
      deleteSearchChar(undefined);
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      appendSearchChar(input);
    }
  };

  const keymap: Record<string, () => void> = {
    'q': exit,
    'f': () => openModelSelect(undefined),
    'F': () => openYearSelect(undefined),
    'x': () => { clearModelFilter(undefined); clearYearFilter(undefined); },
    '/': () => startSearch(undefined),
    'c': () => clearSearch(undefined),
    'o': () => toggleCpo(undefined),
    'r': () => toggleSortDir(undefined),
    'n': () => nextPage(undefined),
    'b': () => prevPage(undefined),
    'p': () => setSortKey('price'),
    'm': () => setSortKey('miles'),
    'y': () => setSortKey('year'),
    'l': () => setSortKey('listed'),
  };

  useInput((input, key) =>
    Match.value({ modelSelectMode, yearSelectMode, searchMode, input, escape: key.escape }).pipe(
      Match.when({ modelSelectMode: true, escape: true }, () => closeModelSelect(undefined)),
      Match.when({ modelSelectMode: true }, () => {}),
      Match.when({ yearSelectMode: true, escape: true }, () => closeYearSelect(undefined)),
      Match.when({ yearSelectMode: true }, () => {}),
      Match.when({ searchMode: true }, () => handleSearchInput(input, key)),
      Match.orElse(() => keymap[input]?.()),
    ),
  );

  return (
    <Box flexDirection="column">
      {loading && (
        <Box marginBottom={1}>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          <Box width={40}>
            <Text color="yellow"> {loadingStatus}</Text>
          </Box>
          <Box width={15}>
            <Text color="cyan">{String(loadedCount).padStart(5)} loaded</Text>
          </Box>
        </Box>
      )}
      <Header
        sortKey={header.sortKey}
        sortDir={header.sortDir}
        search={header.search}
        page={header.page}
        total={header.total}
        pageSize={header.pageSize}
        cpoOnly={header.cpoOnly}
        modelFilter={header.modelFilter}
        yearFilter={view.yearFilter}
      />
      {modelSelectMode && (
        <Box marginBottom={1} flexDirection="column">
          <Text color="yellow">Select model (Enter to apply, Esc to cancel)</Text>
          <SelectInput
            items={modelItems}
            onSelect={(item: { label: string; value: string | null }) => applyModelFilter(item.value)}
          />
        </Box>
      )}
      {yearSelectMode && (
        <Box marginBottom={1} flexDirection="column">
          <Text color="yellow">Select year (Enter to apply, Esc to cancel)</Text>
          <SelectInput
            items={yearItems}
            onSelect={(item: { label: string; value: number | null }) => applyYearFilter(item.value)}
          />
        </Box>
      )}
      {searchMode && (
        <Box marginBottom={1}>
          <Text color="yellow">Search: {searchInput}█</Text>
        </Box>
      )}
      <TableHeader />
      {visible.map((listing, idx) => (
        <ListingRow key={`${idx}-${listing.vin}`} listing={listing} />
      ))}
      {visible.length === 0 && <Text dimColor>No results</Text>}
    </Box>
  );
};

export const renderApp = (registry: Registry.Registry): Instance =>
  render(
    <RegistryContext.Provider value={registry}>
      <App />
    </RegistryContext.Provider>,
    { exitOnCtrlC: true },
  );
