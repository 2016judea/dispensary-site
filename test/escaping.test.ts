/**
 * Scraped text reaches two raw-HTML sinks: product and store names go into
 * JSON-LD <script> blocks through ld(), and a prospect's legal name and street
 * go into the agreement page through agreementHtml(). Both are rendered with
 * dangerouslySetInnerHTML, so a "</script>" or a "<img onerror>" in a name a
 * generator copied off a retailer's site becomes script on the page.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ld, productLd } from "@/lib/jsonld";
import { agreementHtml } from "@/lib/agreement";
import { RISE } from "@/lib/brand";
import { MENU } from "@/lib/rank";

test("ld() cannot close its own <script> tag", () => {
  const p = { ...MENU[0], name: 'Bad </script><script>alert(1)</script>', brand: "x & y" };
  const html = ld(productLd(RISE, p, {})).__html;
  assert.ok(!/<\/script/i.test(html), html);
  assert.ok(!html.includes("<"), "every < is escaped");
  assert.deepEqual(JSON.parse(html).name, p.name, "still valid JSON with the same value");
});

test("agreementHtml escapes the prospect's own fields", () => {
  const b = { ...RISE, legalName: 'Evil <img src=x onerror=alert(1)> LLC', stores: [{ ...RISE.stores[0], street: "1 <b>Main</b>" }] };
  const html = agreementHtml(b, "$1 & change");
  assert.ok(!html.includes("<img"), html);
  assert.ok(html.includes("&lt;img"), "the name is shown, escaped");
  assert.ok(html.includes("$1 &amp; change"));
});
