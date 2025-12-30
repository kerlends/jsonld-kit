# @jsonld-kit

Typed, SSR-safe JSON-LD for React & Next.js — powered by generated Schema.org types.

This project provides:

- ✅ Type-safe JSON-LD  
- ✅ Zero runtime dependencies  
- ✅ SSR-safe (works with Next.js App Router)  
- ✅ No magic, no heuristics  
- ✅ Fully tree-shakeable  
- ✅ No postinstall scripts  
- ✅ Generated from real Schema.org data  

---

## Packages

| Package | Purpose |
|------|------|
| `@jsonld-kit/schema-types` | Generated Schema.org TypeScript types |
| `@jsonld-kit/react` | React component for rendering JSON-LD |
| `@jsonld-kit/codegen` | Internal generator (not published) |

---

## Installation

```bash
pnpm add @jsonld-kit/react @jsonld-kit/schema-types
```

or

```bash
npm install @jsonld-kit/react @jsonld-kit/schema-types
```

---

## Basic Usage

```tsx
import { JsonLd } from "@jsonld-kit/react";

export default function Page() {
  return (
    <JsonLd
      type="Person"
      data={{
        name: "Ada Lovelace",
        url: "https://example.com",
      }}
    />
  );
}
```

Outputs:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Ada Lovelace",
  "url": "https://example.com"
}
</script>
```

---

## Type Safety

Types are generated directly from Schema.org definitions.

You get:

- Autocomplete  
- Compile-time validation  
- Correct nesting  
- Safe property names  

Example:

```tsx
<JsonLd
  type="TattooParlor"
  data={{
    name: "Epitaph Tattoo",
    address: {
      "@type": "PostalAddress",
      streetAddress: "66 Lyle St",
      addressLocality: "Dartmouth",
      addressRegion: "NS",
      addressCountry: "CA",
    },
  }}
/>
```

---

## Next.js Usage

### App Router

Works in Server Components out of the box:

```tsx
export default function Page() {
  return (
    <>
      <JsonLd type="WebPage" data={{ name: "Home" }} />
      <main>...</main>
    </>
  );
}
```

### Pages Router

Works the same way — JSON-LD is rendered during SSR.

---

## Performance Notes

- JSON is stringified during render  
- On the server, this happens once per request  
- On the client, overhead is negligible  

You can optionally pre-stringify:

```tsx
import { JsonLd, safeJsonLdStringify } from "@jsonld-kit/react";

const json = safeJsonLdStringify({
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Example",
});

<JsonLd type="Product" json={json} />;
```

---

## API

```ts
type JsonLdProps<T extends SchemaTypeName> = {
  type: T;
  data: Omit<SchemaTypeMap[T], "@type" | "@context">;
  context?: string;
  id?: string;
  nonce?: string;
  json?: string;
};
```

---

## What This Package Does NOT Do

- ❌ No runtime validation  
- ❌ No schema inference  
- ❌ No network calls  
- ❌ No postinstall scripts  

---

## Development

```bash
pnpm install
pnpm gen
pnpm build
pnpm publish:dry
```

---

## Philosophy

> The boring, correct way to render JSON-LD in modern React.

No magic.  
No guessing.  
Just types, correctness, and predictable output.

---

## License

MIT
