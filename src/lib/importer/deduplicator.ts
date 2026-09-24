import type { FuzzyMergeGroup } from "./types";
import { cleanString } from "./cleaner";

const LEGAL_SUFFIXES_REGEX =
  /\b(pvt\.?\s*ltd\.?|private\s*limited|ltd\.?|limited|llc\.?|corp\.?|corporation|inc\.?|incorporated|co\.?|company|& sons|and sons|enterprises|industries|trading|gmbh|llp)\b/gi;

/**
 * Normalizes an entity name for matching (stripping legal suffixes, punctuation, unifying whitespace and case).
 * The original string is ALWAYS retained for presentation.
 */
export function normalizeEntityForMatching(name: string): string {
  if (!name) return "";
  let clean = cleanString(name).toLowerCase();

  // Strip legal suffixes
  clean = clean.replace(LEGAL_SUFFIXES_REGEX, " ");

  // Strip punctuation and special characters
  clean = clean.replace(/[^a-z0-9\s]/g, " ");

  // Collapse multiple spaces
  clean = clean.replace(/\s+/g, " ").trim();
  return clean;
}

/**
 * Computes Levenshtein edit distance between two normalized strings.
 */
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = new Array<number[]>(an + 1);
  for (let i = 0; i <= an; ++i) {
    const row = (matrix[i] = new Array<number>(bn + 1));
    row[0] = i;
  }
  for (let i = 1; i <= bn; ++i) {
    matrix[0][i] = i;
  }
  for (let i = 1; i <= an; ++i) {
    for (let j = 1; j <= bn; ++j) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[an][bn];
}

/**
 * Calculates Token-Prefix Score (I1):
 * E.g., "delta comp" vs "delta components" -> every token in shorter string
 * is a prefix of the corresponding token in longer string.
 */
export function calculateTokenPrefixScore(normA: string, normB: string): number {
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const tokensA = normA.split(" ").filter(Boolean);
  const tokensB = normB.split(" ").filter(Boolean);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Select shorter token sequence; if equal token count, select shorter character length
  const [shorter, longer] =
    tokensA.length < tokensB.length
      ? [tokensA, tokensB]
      : tokensB.length < tokensA.length
      ? [tokensB, tokensA]
      : normA.length <= normB.length
      ? [tokensA, tokensB]
      : [tokensB, tokensA];

  // Check in-order prefix matching (e.g. "delta comp" -> "delta components")
  let allMatchPrefix = true;
  for (let i = 0; i < shorter.length; i++) {
    const sTok = shorter[i];
    const lTok = longer[i];
    if (!lTok.startsWith(sTok) && !sTok.startsWith(lTok)) {
      allMatchPrefix = false;
      break;
    }
  }

  if (allMatchPrefix) {
    // High confidence match for in-order token abbreviation
    return shorter.length === longer.length ? 0.92 : 0.88;
  }

  // Check out-of-order prefix matching
  let matchCount = 0;
  for (const sTok of shorter) {
    if (longer.some((lTok) => lTok.startsWith(sTok) || sTok.startsWith(lTok))) {
      matchCount++;
    }
  }

  // Multi-token out-of-order match (requires at least 2 matching tokens to prevent single-word false merges)
  if (shorter.length >= 2 && matchCount === shorter.length) {
    return 0.86;
  }

  return matchCount / Math.max(tokensA.length, tokensB.length);
}

/**
 * Combined Multi-Signal Similarity Score (I1 & A2):
 * Combines Levenshtein ratio, token-prefix matching, and constrained substring scoring.
 */
export function calculateEntitySimilarity(nameA: string, nameB: string): number {
  const normA = normalizeEntityForMatching(nameA);
  const normB = normalizeEntityForMatching(nameB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  // Signal 1: Levenshtein distance ratio
  const maxLen = Math.max(normA.length, normB.length);
  const dist = levenshtein(normA, normB);
  const levRatio = 1.0 - dist / maxLen;

  // Signal 2: Token-Prefix matching (catches "delta comp" -> "delta components", "apex ind" -> "apex industrial", "ali traders" -> "ali traders international")
  const prefixScore = calculateTokenPrefixScore(normA, normB);

  // Signal 3: Constrained Substring scoring (A2)
  // Prevents false merges on short/generic names (e.g. "Steel Co" in "Pak Steel Co Ltd")
  let subScore = 0;
  const [shorter, longer] = normA.length <= normB.length ? [normA, normB] : [normB, normA];
  const shorterTokens = shorter.split(" ").filter(Boolean);

  // A2.1: Require the shorter string to have at least 2 tokens before substring scoring is eligible
  if (shorterTokens.length >= 2 && longer.includes(shorter)) {
    // A2.2: Require the shared portion to cover a meaningful share of the LONGER string (>= 70%)
    const coverageRatio = shorter.length / longer.length;
    if (coverageRatio >= 0.70) {
      // A2.3: Weight substring below levenshtein and tokenPrefix (discounted to max 0.80)
      subScore = coverageRatio * 0.80;
    }
  }

  // Return the maximum signal across Levenshtein, token-prefix, and constrained substring
  return Math.max(levRatio, prefixScore, subScore);
}

/**
 * Clusters entity name variations into merge candidate groups.
 * Default auto-suggest threshold = 0.85 on combined similarity score.
 */
export function clusterFuzzyEntities(
  entities: { originalName: string; rowCount: number }[],
  entityType: "supplier" | "warehouse",
  threshold: number = 0.85
): FuzzyMergeGroup[] {
  const groups: FuzzyMergeGroup[] = [];
  const assigned = new Set<string>();

  // Sort by row count descending so the most frequent variant becomes canonical
  const sorted = [...entities].sort((a, b) => b.rowCount - a.rowCount);

  for (let i = 0; i < sorted.length; i++) {
    const primary = sorted[i];
    const normPrimary = normalizeEntityForMatching(primary.originalName);
    if (!normPrimary || assigned.has(primary.originalName)) continue;

    const groupVariants: { originalName: string; normalizedName: string; rowCount: number }[] = [
      {
        originalName: primary.originalName,
        normalizedName: normPrimary,
        rowCount: primary.rowCount,
      },
    ];
    assigned.add(primary.originalName);

    let highestSimilarity = 1.0;

    for (let j = i + 1; j < sorted.length; j++) {
      const candidate = sorted[j];
      if (assigned.has(candidate.originalName)) continue;

      const sim = calculateEntitySimilarity(primary.originalName, candidate.originalName);
      if (sim >= threshold) {
        groupVariants.push({
          originalName: candidate.originalName,
          normalizedName: normalizeEntityForMatching(candidate.originalName),
          rowCount: candidate.rowCount,
        });
        assigned.add(candidate.originalName);
        if (sim < highestSimilarity) {
          highestSimilarity = sim;
        }
      }
    }

    // Only create a merge group if more than 1 variant was found
    if (groupVariants.length > 1) {
      groups.push({
        id: `merge_${entityType}_${i + 1}`,
        entityType,
        canonicalName: primary.originalName, // most frequent display name
        variants: groupVariants,
        confidence: Math.round(highestSimilarity * 100) / 100,
        isConfirmed: true, // Default to suggested merge above threshold
      });
    }
  }

  return groups;
}

export interface MergeCandidate {
  originalName: string;
  rowCount: number;
  /** Supplier ID / warehouse code the name came with, when the file had one. */
  entityId?: string;
}

/**
 * Proposes merges between name variants of the same supplier or warehouse.
 *
 * - Names that normalize identically (differ only in case, punctuation or a
 *   legal suffix such as LLC / Co / Pvt Ltd) are clearly the same: grouped
 *   and pre-confirmed — but still returned, so the review step lists every
 *   merge and the user can split it.
 * - Near matches (typos, abbreviations: "delta comp." vs "Delta Components")
 *   are returned as suggestions with isConfirmed = false. They are never
 *   applied unless the user ticks them.
 * - Two candidates with different entity IDs (e.g. SUP-001 and SUP-002) are
 *   never put in the same group, however similar their names look.
 */
export function buildEntityMergeGroups(
  candidates: MergeCandidate[],
  entityType: "supplier" | "warehouse",
  threshold: number = 0.85
): FuzzyMergeGroup[] {
  const groups: FuzzyMergeGroup[] = [];
  const variant = (c: MergeCandidate) => ({
    originalName: c.originalName,
    normalizedName: normalizeEntityForMatching(c.originalName),
    rowCount: c.rowCount,
    ...(c.entityId ? { entityId: c.entityId } : {}),
  });
  const pickCanonical = (list: MergeCandidate[]) =>
    [...list].sort((a, b) => Number(Boolean(b.entityId)) - Number(Boolean(a.entityId)) || b.rowCount - a.rowCount)[0];

  // Identical text isn't a merge: an ID-less name spelled exactly like an
  // ID-bearing one simply refers to it (the extractor links those directly),
  // so collapse exact duplicates before grouping and keep the ID-bearing one.
  const byExactName = new Map<string, MergeCandidate>();
  for (const c of candidates) {
    const seen = byExactName.get(c.originalName);
    if (!seen) byExactName.set(c.originalName, c);
    else if (!seen.entityId && c.entityId) byExactName.set(c.originalName, { ...c, rowCount: c.rowCount + seen.rowCount });
    else if (seen.entityId && c.entityId && seen.entityId !== c.entityId) byExactName.set(`${c.originalName}\u0000${c.entityId}`, c);
    else byExactName.set(c.originalName, { ...seen, rowCount: seen.rowCount + c.rowCount });
  }

  // 1. Same-name buckets (case / punctuation / legal suffix only).
  const buckets = new Map<string, MergeCandidate[]>();
  for (const c of byExactName.values()) {
    const key = normalizeEntityForMatching(c.originalName);
    if (!key) continue;
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(c);
  }

  const representatives: MergeCandidate[] = [];
  let seq = 0;
  for (const bucket of buckets.values()) {
    const ids = new Set(bucket.filter((c) => c.entityId).map((c) => c.entityId));
    if (ids.size > 1) {
      // Same name under different IDs: they stay separate entities, and any
      // ID-less variant is ambiguous, so nothing here is merged.
      representatives.push(...bucket);
      continue;
    }
    const canonical = pickCanonical(bucket);
    representatives.push(canonical);
    if (bucket.length > 1) {
      groups.push({
        id: `merge_${entityType}_same_${++seq}`,
        entityType,
        canonicalName: canonical.originalName,
        variants: [canonical, ...bucket.filter((c) => c !== canonical)].map(variant),
        confidence: 1,
        isConfirmed: true,
        matchKind: "same-name",
      });
    }
  }

  // 2. Similar-name suggestions between buckets. Only an ID-bearing
  //    representative may be a group's target; members are always ID-less,
  //    so two different IDs can never meet in one group.
  const ordered = [...representatives].sort(
    (a, b) => Number(Boolean(b.entityId)) - Number(Boolean(a.entityId)) || b.rowCount - a.rowCount
  );
  const used = new Set<MergeCandidate>();
  for (const primary of ordered) {
    if (used.has(primary)) continue;
    const members: { c: MergeCandidate; sim: number }[] = [];
    for (const other of ordered) {
      if (other === primary || used.has(other) || other.entityId) continue;
      const sim = calculateEntitySimilarity(primary.originalName, other.originalName);
      if (sim >= threshold) members.push({ c: other, sim });
    }
    if (members.length === 0) continue;
    used.add(primary);
    members.forEach((m) => used.add(m.c));
    groups.push({
      id: `merge_${entityType}_similar_${++seq}`,
      entityType,
      canonicalName: primary.originalName,
      variants: [primary, ...members.map((m) => m.c)].map(variant),
      confidence: Math.round(Math.min(...members.map((m) => m.sim)) * 100) / 100,
      isConfirmed: false,
      matchKind: "similar",
    });
  }

  return groups;
}
