import { Order, Array as A, pipe } from 'effect';
import { AutoDevListing } from '../schema.js';

export type SortKey = 'price' | 'miles' | 'year' | 'listed';
export type SortDir = 'asc' | 'desc';

const orderByPrice: Order.Order<AutoDevListing> = Order.mapInput(
  Order.number,
  (l: AutoDevListing) => l.retailListing.price,
);

const orderByMiles: Order.Order<AutoDevListing> = Order.mapInput(
  Order.number,
  (l: AutoDevListing) => l.retailListing.miles ?? 0,
);

const orderByYear: Order.Order<AutoDevListing> = Order.mapInput(
  Order.number,
  (l: AutoDevListing) => l.vehicle.year,
);

const orderByListed: Order.Order<AutoDevListing> = Order.mapInput(
  Order.number,
  (l: AutoDevListing) => new Date(l.createdAt).getTime(),
);

const orderMap: Record<SortKey, Order.Order<AutoDevListing>> = {
  price: orderByPrice,
  miles: orderByMiles,
  year: orderByYear,
  listed: orderByListed,
};

export const getOrder = (key: SortKey): Order.Order<AutoDevListing> =>
  orderMap[key];

const matchesSearch =
  (search: string) => {
    const needle = search.toLowerCase();
    return (l: AutoDevListing): boolean =>
      [
        l.vehicle.trim,
        String(l.vehicle.model ?? ""),
        l.vehicle.exteriorColor,
        l.retailListing.city,
        l.retailListing.dealer,
      ].some((field) => field?.toLowerCase().includes(needle));
  };

const matchesCpo =
  (cpoOnly: boolean) =>
    (l: AutoDevListing): boolean =>
      !cpoOnly || l.retailListing.cpo;

export const filterListings = (
  listings: readonly AutoDevListing[],
  search: string,
  cpoOnly: boolean,
  modelFilter: string | null,
): readonly AutoDevListing[] =>
  pipe(
    listings,
    A.filter((l) => search.length === 0 || matchesSearch(search)(l)),
    A.filter(matchesCpo(cpoOnly)),
    A.filter((l) => !modelFilter || String(l.vehicle.model) === modelFilter),
  );

const applyDirection = (
  sorted: AutoDevListing[],
  dir: SortDir,
): AutoDevListing[] =>
  pipe(
    dir === 'desc',
    (shouldReverse) => (shouldReverse ? A.reverse(sorted) : sorted),
  );

export const sortListings = (
  listings: readonly AutoDevListing[],
  key: SortKey,
  dir: SortDir,
): AutoDevListing[] =>
  pipe(listings, A.sort(getOrder(key)), (sorted) =>
    applyDirection(sorted, dir),
  );
