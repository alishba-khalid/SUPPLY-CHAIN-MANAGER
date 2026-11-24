import { GLOSSARY_TERMS } from "../src/lib/glossary";
import map from "../docs/seo/glossary-merge-map.json";
const all = new Set(GLOSSARY_TERMS.map((t) => t.slug));
const seen = new Map<string, string>();
const add = (s: string, to: string) => { if (seen.has(s)) console.log("DUP", s); seen.set(s, to); };
for (const [k, v] of Object.entries(map.keep_and_expand)) { add(k, k); v.forEach((s) => add(s, k)); }
for (const [k, v] of Object.entries(map.redirect_to_blog)) add(k, v);
console.log("terms", all.size, "mapped", seen.size, "pages kept", Object.keys(map.keep_and_expand).length);
console.log("unmapped:", [...all].filter((s) => !seen.has(s)));
console.log("unknown:", [...seen.keys()].filter((s) => !all.has(s)));
