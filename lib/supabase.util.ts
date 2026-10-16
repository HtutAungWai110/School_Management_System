/**
 * Flattens a PostgREST embed to a single value.
 *
 * The untyped client models to-one relations as arrays even though they arrive
 * as objects, so every embedded `modules` / `levels` / `batches` has to be
 * read through this rather than cast past with `as unknown as`. Casting would
 * compile but break silently at runtime if the shape were ever the other one.
 */
export function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}