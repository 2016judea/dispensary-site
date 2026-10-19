// Bundles test/*.test.ts with esbuild (Next's `@/` alias, JSON imports, .ts
// resolution) and runs them under node:test. Pure lib/ code only: nothing here
// needs the Next runtime, a browser, Aeropay or DocuSign.
//   npm test
import { build } from "esbuild";
import { readdirSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".test-build");
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
const entries = readdirSync(path.join(root, "test")).filter((f) => f.endsWith(".test.ts")).map((f) => path.join(root, "test", f));
await build({
  entryPoints: entries, bundle: true, platform: "node", format: "esm", target: "node22",
  outdir: out, outExtension: { ".js": ".mjs" }, alias: { "@": root }, logLevel: "error",
});
const r = spawnSync(process.execPath, ["--test", ...readdirSync(out).map((f) => path.join(out, f))], { stdio: "inherit", env: { ...process.env, ORDER_COOKIE_SECRET: process.env.ORDER_COOKIE_SECRET || "test-secret" } });
process.exit(r.status ?? 1);
