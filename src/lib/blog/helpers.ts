import type { Block, Inline } from "./posts";

/** Short builders so guide files read as prose, not boilerplate. */
export const P = (...content: Inline[]): Block => ({ type: "p", content });
export const H = (text: string): Block => ({ type: "h2", text });
export const UL = (...items: Inline[][]): Block => ({ type: "ul", items });
export const F = (...lines: string[]): Block => ({ type: "formula", lines });
export const N = (...content: Inline[]): Block => ({ type: "note", content });
export const T = (head: string[], ...rows: string[][]): Block => ({ type: "table", head, rows });

/** Glossary and guide links. */
export const gl = (slug: string, text: string): Inline => ({ href: `/glossary/${slug}`, text });
export const bg = (slug: string, text: string): Inline => ({ href: `/blog/${slug}`, text });
export const ft = (slug: string, text: string): Inline => ({ href: `/features/${slug}`, text });
export const tl = (slug: string, text: string): Inline => ({ href: `/tools/${slug}`, text });

const inlineText = (a: Inline[]) => a.map((i) => (typeof i === "string" ? i : i.text)).join("");

/** Words in a body, for reading time and the 500-word rule. */
export function bodyWords(body: Block[]): number {
  let text = "";
  for (const b of body) {
    if (b.type === "p" || b.type === "note") text += " " + inlineText(b.content);
    else if (b.type === "h2") text += " " + b.text;
    else if (b.type === "ul") text += " " + b.items.map(inlineText).join(" ");
    else if (b.type === "formula") text += " " + b.lines.join(" ");
    else text += " " + b.head.join(" ") + " " + b.rows.flat().join(" ");
  }
  return text.split(/\s+/).filter(Boolean).length;
}

export const readingMinutes = (body: Block[]) => Math.max(3, Math.round(bodyWords(body) / 220));
