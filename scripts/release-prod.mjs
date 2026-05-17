/**
 * Ручной bump 1-й цифры (прод-срез). См. docs/ADMIN.md
 * npm run release:prod -- [--dry-run]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bumpSemver } from "./lib/version-classify.mjs";
import { readPackageVersion, syncPackageVersion } from "./lib/sync-package-version.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const cur = readPackageVersion(root);
const next = bumpSemver(cur, "prod");

console.log(`Прод-релиз: ${cur} → ${next}`);
if (dryRun) {
  console.log("(dry-run)");
  process.exit(0);
}

syncPackageVersion(root, next);

console.log("Дальше вручную: перенесите [Unreleased] в CHANGELOG, git tag, push. См. docs/ADMIN.md");
