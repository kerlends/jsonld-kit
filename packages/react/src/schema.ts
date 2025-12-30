import type {
  SchemaContext,
  SchemaTypeMap,
  SchemaTypeName,
} from "@jsonld-kit/schema-types";

export type SchemaFor<T extends SchemaTypeName> = SchemaTypeMap[T];

/**
 * Create a typed JSON-LD node with a literal @type.
 *
 * Why this exists:
 * - In deeply nested JSON-LD (especially with unions + arrays), TS often loses contextual typing.
 * - This helper forces the object literal to be checked as the exact schema type, restoring autocomplete
 *   for nested fields like `item["@type"]`.
 *
 * Notes:
 * - `@context` is intentionally optional here. Usually only top-level nodes include it.
 * - Use `opts.context` if you really want `@context` on the node.
 */
export function schema<T extends SchemaTypeName>(
  type: T,
  data: Omit<SchemaTypeMap[T], "@type" | "@context"> & {
    "@type"?: never;
    "@context"?: never;
  },
  opts?: { context?: SchemaContext }
): SchemaTypeMap[T] {
  return {
    ...(opts?.context ? { "@context": opts.context } : null),
    "@type": type,
    ...data,
  } as SchemaTypeMap[T];
}
