/**
 * The product's own argument (README): a customer drove across town on a
 * confirmed pickup order that was not on the shelf. /api/order enforced the
 * Minnesota caps but never asked whether the product was in stock — five
 * products in data/menu.json have zero stock at every store and could be
 * ordered. offShelf() is what the route now checks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { offShelf } from "@/lib/stock";
import { MENU, productById } from "@/lib/rank";

test("a product with no stock anywhere is off the shelf", () => {
  const p = productById("giggle-gas-flower")!;
  assert.ok(p && !Object.values(p.stock).some((n) => n > 0), "fixture: zero stock everywhere");
  assert.deepEqual(offShelf([{ product: p, qty: 1 }], "rise-st-paul").map((x) => x.id), [p.id]);
});

test("a stocked product passes, at a store we count and at one we do not", () => {
  const p = MENU.find((x) => Object.values(x.stock).some((n) => n > 0))!;
  const storeWithCounts = Object.keys(p.stock)[0];
  assert.deepEqual(offShelf([{ product: p, qty: 1 }], storeWithCounts), []);
  assert.deepEqual(offShelf([{ product: p, qty: 1 }], "some-prospect-store"), []);
});
