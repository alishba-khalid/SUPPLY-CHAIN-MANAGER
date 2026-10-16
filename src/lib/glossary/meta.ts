import type { GlossaryTerm } from "./types";

/** Longest <title> we allow before search results truncate it. */
export const MAX_TITLE_LENGTH = 60;

/** The first candidate that fits: full term first, then the short name. */
export function glossaryMetaTitle(term: GlossaryTerm): string {
  const suffixes = term.formula
    ? ["Definition, Formula & Example", "Formula & Example", "Definition"]
    : ["Definition & Example", "Meaning & Example", "Definition"];
  for (const name of [term.term, term.short]) {
    for (const suffix of suffixes) {
      const title = `${name}: ${suffix}`;
      if (title.length <= MAX_TITLE_LENGTH) return title;
    }
  }
  return term.short;
}
