import type {
  SchemaContext,
  SchemaTypeMap,
  SchemaTypeName,
} from "@jsonld-kit/schema-types";
import { safeJsonLdStringify } from "./utils.js";

export type JsonLdProps<T extends SchemaTypeName> = {
  type: T;
  data: Omit<SchemaTypeMap[T], "@type" | "@context">;
  context?: SchemaContext;
  id?: string;
  nonce?: string;

  /**
   * Advanced: provide a pre-serialized JSON-LD string to avoid re-stringifying.
   * If present, `type`, `context`, and `data` are ignored for serialization.
   */
  json?: string;
};

export function JsonLd<T extends SchemaTypeName>({
  type,
  data,
  context = "https://schema.org",
  id,
  nonce,
  json,
}: JsonLdProps<T>) {
  const __html =
    json ??
    safeJsonLdStringify({
      "@context": context,
      "@type": type,
      ...data,
    });

  return (
    <script
      id={id}
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html }}
    />
  );
}
