import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { rdfParser } from "rdf-parse";
import { Store, Quad } from "n3";

const SCHEMA_URL =
  "https://schema.org/version/latest/schemaorg-current-https.jsonld";

const OUT_DIR = path.resolve(process.cwd(), "../schema-types/src/generated");
const OUT_FILE = path.join(OUT_DIR, "schema.ts");

const NS = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  schema: "https://schema.org/",
};

const IRI = {
  rdfType: NS.rdf + "type",
  rdfProperty: NS.rdf + "Property",
  rdfsClass: NS.rdfs + "Class",
  rdfsSubClassOf: NS.rdfs + "subClassOf",
  schemaDomainIncludes: NS.schema + "domainIncludes",
  schemaRangeIncludes: NS.schema + "rangeIncludes",
};

type TermValue = string;

type ClassDef = {
  name: string; // schema name, e.g. "TattooParlor", "3DModel"
  iri: string;
  parents: string[]; // schema names
  properties: Set<string>; // schema property names
};

type PropDef = {
  name: string; // schema prop name
  iri: string;
  domains: string[]; // schema class names
  ranges: string[]; // schema class names or schema primitives
};

function iriToLocalName(iri: string): string | null {
  if (iri.startsWith(NS.schema)) return iri.slice(NS.schema.length);
  return null;
}

function isNamedNode(v: any): v is { termType: "NamedNode"; value: string } {
  return v && v.termType === "NamedNode" && typeof v.value === "string";
}

function isLiteral(v: any): v is { termType: "Literal"; value: string } {
  return v && v.termType === "Literal" && typeof v.value === "string";
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return await res.text();
}

async function parseJsonLdToStore(jsonldText: string): Promise<Store> {
  const store = new Store();
  const input = Readable.from([jsonldText]);

  const quadStream = rdfParser.parse(input, {
    contentType: "application/ld+json",
    baseIRI: "https://schema.org/",
  });

  for await (const quad of quadStream as AsyncIterable<Quad>) {
    store.addQuad(quad);
  }

  return store;
}

function getObjects(
  store: Store,
  subject: TermValue,
  predicate: TermValue
): TermValue[] {
  return store
    .getQuads(subject, predicate, null, null)
    .map((q) =>
      isNamedNode(q.object) || isLiteral(q.object) ? q.object.value : ""
    )
    .filter(Boolean);
}

function buildGraph(store: Store) {
  const classes = new Map<string, ClassDef>();
  const props = new Map<string, PropDef>();

  for (const q of store.getQuads(null, IRI.rdfType, IRI.rdfsClass, null)) {
    if (!isNamedNode(q.subject)) continue;
    const local = iriToLocalName(q.subject.value);
    if (!local) continue;

    classes.set(local, {
      name: local,
      iri: q.subject.value,
      parents: [],
      properties: new Set(),
    });
  }

  for (const q of store.getQuads(null, IRI.rdfType, IRI.rdfProperty, null)) {
    if (!isNamedNode(q.subject)) continue;
    const local = iriToLocalName(q.subject.value);
    if (!local) continue;

    props.set(local, {
      name: local,
      iri: q.subject.value,
      domains: [],
      ranges: [],
    });
  }

  for (const cls of classes.values()) {
    const parentsIri = getObjects(store, cls.iri, IRI.rdfsSubClassOf);
    for (const pIri of parentsIri) {
      const pName = iriToLocalName(pIri);
      if (pName && classes.has(pName)) cls.parents.push(pName);
    }
  }

  for (const prop of props.values()) {
    const domainIris = getObjects(store, prop.iri, IRI.schemaDomainIncludes);
    const rangeIris = getObjects(store, prop.iri, IRI.schemaRangeIncludes);

    for (const dIri of domainIris) {
      const dName = iriToLocalName(dIri);
      if (dName) prop.domains.push(dName);
    }

    for (const rIri of rangeIris) {
      const rName = iriToLocalName(rIri);
      if (rName) prop.ranges.push(rName);
    }
  }

  for (const prop of props.values()) {
    for (const d of prop.domains) {
      const cls = classes.get(d);
      if (cls) cls.properties.add(prop.name);
    }
  }

  return { classes, props };
}

function topoSortClasses(classes: Map<string, ClassDef>): string[] {
  const names = Array.from(classes.keys()).sort();
  const indeg = new Map<string, number>();
  const children = new Map<string, Set<string>>();

  for (const n of names) {
    indeg.set(n, 0);
    children.set(n, new Set());
  }

  for (const c of classes.values()) {
    for (const p of c.parents) {
      if (!classes.has(p)) continue;
      children.get(p)!.add(c.name);
      indeg.set(c.name, (indeg.get(c.name) ?? 0) + 1);
    }
  }

  const q: string[] = names.filter((n) => (indeg.get(n) ?? 0) === 0);
  const out: string[] = [];

  while (q.length) {
    const n = q.shift()!;
    out.push(n);
    for (const ch of children.get(n) ?? []) {
      indeg.set(ch, (indeg.get(ch) ?? 0) - 1);
      if ((indeg.get(ch) ?? 0) === 0) q.push(ch);
    }
  }

  for (const n of names) if (!out.includes(n)) out.push(n);
  return out;
}

/* --------------------------- NEW: name sanitizer --------------------------- */

const TS_RESERVED = new Set<string>([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "as",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
  "any",
  "boolean",
  "number",
  "string",
  "symbol",
  "type",
  "unknown",
  "never",
  "object",
  "readonly",
  "keyof",
  "declare",
  "abstract",
  "namespace",
  "module",
  "global",
  "require",
]);

/**
 * Convert schema class names into valid TS identifiers:
 * - Prefix "_" if it starts with a digit (e.g. "3DModel" -> "_3DModel")
 * - Replace invalid identifier chars with "_" (e.g. "Some-Thing" -> "Some_Thing")
 * - Avoid reserved keywords by suffixing "_"
 */
function toTsIdent(schemaName: string): string {
  let out = schemaName.replace(/[^A-Za-z0-9_$]/g, "_");
  if (/^[0-9]/.test(out)) out = `_${out}`;
  if (!/^[A-Za-z_$]/.test(out)) out = `_${out}`;
  if (TS_RESERVED.has(out)) out = `${out}_`;
  return out;
}

/* ---------------------- Type mapping + property typing --------------------- */

function rangeToTs(
  rangeName: string,
  classIdentByName: Map<string, string>
): string {
  switch (rangeName) {
    case "Text":
    case "URL":
      return "string";
    case "Boolean":
      return "boolean";
    case "Number":
    case "Integer":
    case "Float":
      return "number";
    case "Date":
    case "DateTime":
    case "Time":
      return "string";
    default: {
      const ident = classIdentByName.get(rangeName) ?? toTsIdent(rangeName);
      // allow either embedded object or @id string
      return `${ident} | string`;
    }
  }
}

function propToTs(
  prop: PropDef,
  classIdentByName: Map<string, string>
): string {
  const ranges = Array.from(new Set(prop.ranges)).sort();
  if (!ranges.length) return "unknown";

  const union = ranges.map((r) => rangeToTs(r, classIdentByName)).join(" | ");
  return `${union} | Array<${union}>`;
}

function collectAllPropsForClass(
  clsName: string,
  classes: Map<string, ClassDef>
): Set<string> {
  const out = new Set<string>();
  const seen = new Set<string>();

  function walk(name: string) {
    if (seen.has(name)) return;
    seen.add(name);
    const cls = classes.get(name);
    if (!cls) return;

    for (const p of cls.properties) out.add(p);
    for (const parent of cls.parents) walk(parent);
  }

  walk(clsName);
  return out;
}

/* ---------------------------- UPDATED: generator --------------------------- */

function generateTs({ classes, props }: ReturnType<typeof buildGraph>): string {
  const sortedSchemaNames = topoSortClasses(classes);

  // Build a stable mapping: schema name -> TS identifier
  const classIdentByName = new Map<string, string>();
  for (const schemaName of sortedSchemaNames) {
    classIdentByName.set(schemaName, toTsIdent(schemaName));
  }

  const header = `/* eslint-disable */
// AUTO-GENERATED FILE. DO NOT EDIT.

export type SchemaContext = "https://schema.org" | (string & {});
export type WithContext<T> = T & { "@context": SchemaContext };

export type JsonLdCore = {
  "@context"?: SchemaContext;
  "@type"?: string;
  "@id"?: string;
};

`;

  const blocks: string[] = [header];

  // Emit interfaces
  for (const schemaName of sortedSchemaNames) {
    const cls = classes.get(schemaName)!;
    const ident = classIdentByName.get(schemaName)!;

    const parentSchemaNames = cls.parents.filter((p) => classes.has(p));
    const parentIdents = parentSchemaNames
      .map((p) => classIdentByName.get(p)!)
      .filter(Boolean);

    // Multiple inheritance: TS supports interface extends A, B, but you may still want an alias later.
    const extendsClause =
      parentIdents.length > 0
        ? ` extends JsonLdCore, ${parentIdents.join(", ")}`
        : ` extends JsonLdCore`;

    const allProps = Array.from(
      collectAllPropsForClass(schemaName, classes)
    ).sort();

    const lines: string[] = [];
    lines.push(`export interface ${ident}${extendsClause} {`);
    lines.push(`  "@type"?: ${JSON.stringify(schemaName)} | (string & {});`);

    for (const propName of allProps) {
      const prop = props.get(propName);
      if (!prop) continue;
      const tsType = propToTs(prop, classIdentByName);
      // property name as string literal is fine, even for weird names
      lines.push(`  ${JSON.stringify(propName)}?: ${tsType};`);
    }

    lines.push(`}\n`);
    blocks.push(lines.join("\n"));
  }

  // Union of schema *strings* (not idents)
  const typeNamesUnion = sortedSchemaNames
    .map((n) => JSON.stringify(n))
    .join(" | ");
  blocks.push(`export type SchemaTypeName = ${typeNamesUnion};\n`);

  // Map keyed by schema string -> TS ident type
  const mapEntries = sortedSchemaNames
    .map((schemaName) => {
      const ident = classIdentByName.get(schemaName)!;
      return `  ${JSON.stringify(schemaName)}: ${ident};`;
    })
    .join("\n");

  blocks.push(`export type SchemaTypeMap = {\n${mapEntries}\n};\n`);

  // Helpful export: schema name -> ident (debugging / tooling)
  const nameToIdentEntries = sortedSchemaNames
    .map(
      (schemaName) =>
        `  ${JSON.stringify(schemaName)}: ${JSON.stringify(
          classIdentByName.get(schemaName)!
        )},`
    )
    .join("\n");

  blocks.push(
    `export const __SCHEMA_NAME_TO_TS_IDENT__ = {\n${nameToIdentEntries}\n} as const;\n`
  );

  return blocks.join("\n");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Downloading schema JSON-LD from: ${SCHEMA_URL}`);
  const jsonldText = await fetchText(SCHEMA_URL);

  console.log(`Parsing JSON-LD into RDF quads...`);
  const store = await parseJsonLdToStore(jsonldText);

  console.log(`Building class/property graph...`);
  const graph = buildGraph(store);

  console.log(`Generating TypeScript...`);
  const ts = generateTs(graph);

  fs.writeFileSync(OUT_FILE, ts, "utf8");
  console.log(`Wrote: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
