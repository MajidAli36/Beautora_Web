import { readFileSync } from "node:fs";

const countries = readFileSync("lib/location/countries.ts", "utf8");
const curr = readFileSync("lib/currency/from-country.ts", "utf8");
const worldList = [...countries.matchAll(/^\s+"([^"]+)",?\s*$/gm)].map((m) => m[1]);
const mapped = [
  ...curr.matchAll(/^\s+(?:"([^"]+)"|([A-Za-z][^:]*)): \{ code:/gm),
].map((m) => (m[1] || m[2]).trim());
const set = new Set(mapped);
const missing = worldList.filter((c) => !set.has(c));
console.log(`world=${worldList.length} mapped=${set.size} missing=${missing.length}`);
if (missing.length) console.log(missing.join("\n"));
