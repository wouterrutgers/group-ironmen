/**
 * A distinct/unique type, with the exact same representation as the generic
 * parameter T but an additional field to avoid accidental misuse and no runtime
 * overhead.
 *
 * The tradeoff is that the easiest way to create a distinct type from the
 * underlying (which occurs at program boundaries), is by laundering it with
 * "as", e.g. writing `5 as Distinct<number, "SomeDistinctType">`. However, this
 * indicates a clear understanding of what the raw data is.
 */
export type Distinct<T, DistinctName> = T & { __TYPE__: DistinctName };
export type DistinctPair<T, A, B> = T & { __DISTINCT_A__: A; __DISTINCT_B__: B };
