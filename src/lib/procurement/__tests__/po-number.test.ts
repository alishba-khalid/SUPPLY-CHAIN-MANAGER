import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  duplicatePoNumberMessage,
  insertWithNextPoNumber,
  isDuplicateKeyError,
  nextPoNumber,
  type InsertResult,
} from "../po-number";

describe("sequential PO numbers", () => {
  test("continues the workspace's own series (Production's highest today is PO-20489)", () => {
    assert.equal(nextPoNumber(20489), "PO-20490");
    assert.equal(nextPoNumber(5), "PO-6");
  });

  test("a workspace with no numbered POs starts at PO-1001", () => {
    assert.equal(nextPoNumber(null), "PO-1001");
  });

  test("never random: the same highest number always gives the same next number", () => {
    assert.equal(nextPoNumber(9902), nextPoNumber(9902));
  });

  test("garbage input falls back to the first number instead of producing PO-NaN", () => {
    assert.equal(nextPoNumber(Number.NaN), "PO-1001");
    assert.equal(nextPoNumber(-3), "PO-1001");
  });
});

describe("duplicate PO numbers are detected, never overwritten", () => {
  test("Prisma unique violation (P2002) is a duplicate; other errors are not", () => {
    assert.equal(isDuplicateKeyError({ code: "P2002" }), true);
    assert.equal(isDuplicateKeyError({ code: "P2025" }), false);
    assert.equal(isDuplicateKeyError(new Error("boom")), false);
    assert.equal(isDuplicateKeyError(null), false);
  });

  test("the manual-form error names the number and says nothing was overwritten", () => {
    const msg = duplicatePoNumberMessage("PO-9901");
    assert.match(msg, /PO-9901 already exists/);
    assert.match(msg, /never overwritten/);
  });
});

describe("quick order: insert with the next number, retry on a race", () => {
  /** Fake store: rejects numbers already taken, like the (org, PO number) unique rule. */
  function fakeStore(taken: number[]) {
    const numbers = new Set(taken);
    const inserted: string[] = [];
    return {
      inserted,
      highestExisting: async () => (numbers.size ? Math.max(...numbers) : null),
      insert: async (poNumber: string): Promise<InsertResult<string>> => {
        const n = Number(poNumber.slice(3));
        if (numbers.has(n)) return { ok: false, duplicate: true };
        numbers.add(n);
        inserted.push(poNumber);
        return { ok: true, value: poNumber };
      },
    };
  }

  test("normal case: one insert with the next number", async () => {
    const store = fakeStore([9901, 9902, 20489]);
    const result = await insertWithNextPoNumber(store);
    assert.deepEqual(result, { ok: true, value: "PO-20490", poNumber: "PO-20490" });
    assert.deepEqual(store.inserted, ["PO-20490"]);
  });

  test("race: another order grabs PO-20490 first -> rejected, retried as PO-20491, nothing overwritten", async () => {
    const store = fakeStore([20489]);
    let raced = false;
    const result = await insertWithNextPoNumber({
      // First read happens before the competing order lands; the retry sees it.
      highestExisting: async () => {
        const h = await store.highestExisting();
        if (!raced) {
          raced = true;
          await store.insert("PO-20490");
        }
        return h;
      },
      insert: store.insert,
    });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.poNumber, "PO-20491");
    assert.deepEqual(store.inserted, ["PO-20490", "PO-20491"], "the competing PO-20490 is untouched");
  });

  test("a non-duplicate failure stops immediately with its error (no retry)", async () => {
    let calls = 0;
    const result = await insertWithNextPoNumber({
      highestExisting: async () => 100,
      insert: async () => {
        calls++;
        return { ok: false, duplicate: false, error: "Supplier missing" };
      },
    });
    assert.deepEqual(result, { ok: false, error: "Supplier missing" });
    assert.equal(calls, 1);
  });

  test("gives up with a clear error after repeated collisions instead of looping forever", async () => {
    let calls = 0;
    const result = await insertWithNextPoNumber({
      highestExisting: async () => 100,
      insert: async () => {
        calls++;
        return { ok: false, duplicate: true };
      },
    });
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.error : "", /try again/);
    assert.equal(calls, 3);
  });
});
