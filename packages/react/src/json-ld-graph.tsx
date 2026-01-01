import type { SchemaContext } from "@jsonld-kit/schema-types";
import { graph, type AnySchemaNode } from "./graph.js";
import { safeJsonLdStringify } from "./utils.js";

export type JsonLdGraphProps = {
  nodes: readonly AnySchemaNode[];
  context?: SchemaContext;
  id?: string;
  nonce?: string;

  /**
   * Advanced: provide a pre-serialized JSON-LD string to avoid re-stringifying.
   * If present, `nodes` + `context` are ignored for serialization.
   */
  json?: string;
};

/**
 * Renders a single JSON-LD <script> tag with an @graph payload.
 * SSR-safe. RSC-safe. No hooks.
 */
export function JsonLdGraph({
  nodes,
  context = "https://schema.org",
  id,
  nonce,
  json,
}: JsonLdGraphProps) {
  const __html = json ?? safeJsonLdStringify(graph(nodes, { context }));

  return (
    <script
      id={id}
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html }}
    />
  );
}

export default JsonLdGraph;
