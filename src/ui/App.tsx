import React, { useState } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { formatDistanceToNowStrict } from "date-fns";
import type { AutoDevListing } from "../schema.js";
import type { SortKey, SortDir } from "../domain/sorting.js";
import { filterListings, sortListings } from "../domain/sorting.js";

interface AppState {
  listings: readonly AutoDevListing[];
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
  page: number;
  pageSize: number;
  cpoOnly: boolean;
}

const initialState: AppState = {
  listings: [],
  search: "",
  sortKey: "price",
  sortDir: "asc",
  page: 0,
  pageSize: 15,
  cpoOnly: false,
};

const link = (url: string, text: string) =>
  process.stdout.isTTY
    ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`
    : text;

const flipDir = (dir: SortDir): SortDir => (dir === "asc" ? "desc" : "asc");

const cpoFilterLabels = ["off", "on"] as const;
const cpoValueLabels = ["No", "Yes"] as const;

const truncate = (value: string, width: number): string => {
  if (width <= 0) {
    return "";
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
}> = ({ sortKey, sortDir, search, page, total, pageSize, cpoOnly }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cpoStatus = cpoFilterLabels[Number(cpoOnly)];
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">
        Ioniq 5 Search | Sort: {sortKey} ({sortDir}) | CPO: {cpoStatus} | Page{" "}
        {page + 1}/{totalPages} | {total} results
      </Text>
      <Text dimColor>
        [p]rice [m]iles [y]ear [l]isted | [/]search [c]lear | [o]CPO | [n]ext [b]ack | [r]everse |
        [q]uit
      </Text>
      {search.length > 0 && <Text color="yellow">Filter: {search}</Text>}
    </Box>
  );
};

const ListingRow: React.FC<{ listing: AutoDevListing }> = ({ listing }) => {
  const created = new Date(listing.createdAt);
  const cpoLabel = cpoValueLabels[Number(listing.retailListing.cpo)];
  const locationText = `${listing.retailListing.city}, ${listing.retailListing.state}`;
  return (
    <Box>
      <Box width={6}>
        <Text>{listing.vehicle.year}</Text>
      </Box>
    <Box width={14}>
      <Text>{listing.vehicle.trim ?? ""}</Text>
    </Box>
    <Box width={14}>
      <Text>{listing.vehicle.exteriorColor}</Text>
    </Box>
      <Box width={8}>
        <Text>{listing.retailListing.miles ?? "?"}</Text>
      </Box>
      <Box width={4}>
        <Text>{listing.history?.accidentCount ?? "?"}</Text>
      </Box>
      <Box width={4}>
        <Text>{listing.history?.ownerCount ?? "?"}</Text>
      </Box>
    <Box width={6}>
      <Text>{cpoLabel}</Text>
    </Box>
    <Box width={10}>
      <Text color="green">${listing.retailListing.price}</Text>
    </Box>
    <Box width={24}>
      <Text>{truncate(locationText, 24)}</Text>
    </Box>
    <Box width={33}>
      <Text>{truncate(listing.retailListing.dealer, 33)}</Text>
    </Box>
    <Box width={14}>
      <Text dimColor>
        {formatDistanceToNowStrict(created, { addSuffix: true })}
      </Text>
    </Box>
    <Box width={18}>
      <Text>
        {link(listing.retailListing.carfaxUrl, "carfax")}{" "}
        {link(listing.retailListing.primaryImage, "image")}
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
    <Box width={14}>
      <Text bold>Trim</Text>
    </Box>
    <Box width={14}>
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
    <Box width={24}>
      <Text bold>Location</Text>
    </Box>
    <Box width={33}>
      <Text bold>Dealer</Text>
    </Box>
    <Box width={14}>
      <Text bold>Listed</Text>
    </Box>
    <Box width={18}>
      <Text bold>Links</Text>
    </Box>
  </Box>
);

type InputAction = (s: AppState, totalPages: number) => AppState;

const inputActions: Record<string, InputAction> = {
  p: (s) => ({ ...s, sortKey: "price", page: 0 }),
  m: (s) => ({ ...s, sortKey: "miles", page: 0 }),
  y: (s) => ({ ...s, sortKey: "year", page: 0 }),
  l: (s) => ({ ...s, sortKey: "listed", page: 0 }),
  r: (s) => ({ ...s, sortDir: flipDir(s.sortDir) }),
  n: (s, totalPages) => ({ ...s, page: Math.min(s.page + 1, totalPages - 1) }),
  b: (s) => ({ ...s, page: Math.max(s.page - 1, 0) }),
  c: (s) => ({ ...s, search: "", page: 0 }),
  o: (s) => ({ ...s, cpoOnly: !s.cpoOnly, page: 0 }),
};

export const App: React.FC<{ initialListings: readonly AutoDevListing[] }> = ({
  initialListings,
}) => {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>({
    ...initialState,
    listings: initialListings,
  });
  const [searchMode, setSearchMode] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const filtered = filterListings(state.listings, state.search, state.cpoOnly);
  const sorted = sortListings(filtered, state.sortKey, state.sortDir);
  const pageStart = state.page * state.pageSize;
  const pageEnd = pageStart + state.pageSize;
  const visible = sorted.slice(pageStart, pageEnd);
  const totalPages = Math.max(1, Math.ceil(sorted.length / state.pageSize));

  const handleSearchInput = (input: string, key: { return?: boolean; escape?: boolean; backspace?: boolean; delete?: boolean; ctrl?: boolean; meta?: boolean }) => {
    if (key.return) {
      setState((s) => ({ ...s, search: searchInput, page: 0 }));
      setSearchMode(false);
      return;
    }
    if (key.escape) {
      setSearchMode(false);
      setSearchInput(state.search);
      return;
    }
    if (key.backspace || key.delete) {
      setSearchInput((s) => s.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setSearchInput((s) => s + input);
    }
  };

  const handleNormalInput = (input: string) => {
    if (input === "q") {
      exit();
      return;
    }
    if (input === "/") {
      setSearchMode(true);
      setSearchInput(state.search);
      return;
    }
    const action = inputActions[input];
    if (action) {
      setState((s) => action(s, totalPages));
    }
  };

  useInput((input, key) => {
    if (searchMode) {
      handleSearchInput(input, key);
      return;
    }
    handleNormalInput(input);
  });

  return (
    <Box flexDirection="column">
      <Header
        sortKey={state.sortKey}
        sortDir={state.sortDir}
        search={state.search}
        page={state.page}
        total={sorted.length}
        pageSize={state.pageSize}
        cpoOnly={state.cpoOnly}
      />
      {searchMode && (
        <Box marginBottom={1}>
          <Text color="yellow">Search: {searchInput}█</Text>
        </Box>
      )}
      <TableHeader />
      {visible.map((listing, idx) => (
        <ListingRow key={idx} listing={listing} />
      ))}
      {visible.length === 0 && <Text dimColor>No results</Text>}
    </Box>
  );
};

export const renderApp = (listings: readonly AutoDevListing[]) =>
  render(React.createElement(App, { initialListings: listings }), {
    exitOnCtrlC: true,
  });
