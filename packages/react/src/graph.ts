import type {
  SchemaContext,
  SchemaTypeMap,
  SchemaTypeName,
} from "@jsonld-kit/schema-types";

export type AnySchemaNode = SchemaTypeMap[SchemaTypeName];

/**
 * Build a JSON-LD graph payload:
 * {
 *   "@context": "...",
 *   "@graph": [ ...nodes ]
 * }
 */
export function graph(
  nodes: readonly AnySchemaNode[],
  opts?: { context?: SchemaContext }
): { "@context": SchemaContext; "@graph": AnySchemaNode[] } {
  return {
    "@context": opts?.context ?? "https://schema.org",
    "@graph": [...nodes],
  };
}
