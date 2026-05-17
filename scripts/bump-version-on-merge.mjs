/**
 * Анализ последнего коммита в main и bump 2-й или 3-й цифры версии.
 * Использование: node scripts/bump-version-on-merge.mjs [--dry-run]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bumpSemver, classifyVersionBump, isCountedPath } from "./lib/version-classify.mjs";
import { readPackageVersion, syncPackageVersion, VERSION_FILE_PATHS } from "./lib/sync-package-version.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

function sh(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}

function parseNumstat(range) {
  const raw = sh(`git diff --numstat ${range}`);
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [a, d, ...rest] = line.split("\t");
      const filePath = rest.join("\t");
      const added = a === "-" ? 0 : Number(a);
      const deleted = d === "-" ? 0 : Number(d);
      return { path: filePath.replace(/\\/g, "/"), added, deleted };
    });
}

function commitMessage() {
  return sh("git log -1 --pretty=%B");
}

function isVersionOnlyCommit(files) {
  const meaningful = files.filter((f) => isCountedPath(f.path));
  if (meaningful.length > 0) return false;
  const touched = files.map((f) => f.path);
  const onlyVersion =
    touched.length > 0 && touched.every((p) => VERSION_FILE_PATHS.includes(p));
  const msg = commitMessage();
  return onlyVersion || /^chore\(version\):/m.test(msg);
}

function overridesFromEnvAndMessage() {
  const msg = commitMessage();
  const titleLine = msg.split("\n")[0] ?? "";
  return {
    forceSkip:
      process.env.VERSION_SKIP === "1" ||
      /\[version:skip\]/i.test(msg) ||
      /\[skip version\]/i.test(msg),
    forceMinor: /version:minor/i.test(process.env.VERSION_LABELS ?? "") || /\[minor\]/i.test(titleLine),
    forcePatch: /version:patch/i.test(process.env.VERSION_LABELS ?? "") || /\[patch\]/i.test(titleLine),
  };
}

function diffRangeForHead() {
  const parents = sh("git rev-list --parents -1 HEAD").split(/\s+/).filter(Boolean);
  if (parents.length >= 3) {
    return `${parents[1]}..${parents[2]}`;
  }
  return "HEAD~1..HEAD";
}

function main() {
  if (isVersionOnlyCommit(parseNumstat("HEAD~1..HEAD"))) {
    console.log("Skip: коммит только с версией (избегаем цикла CI).");
    return;
  }

  const range = diffRangeForHead();
  const files = parseNumstat(range);
  const overrides = overridesFromEnvAndMessage();
  const { kind, reasons } = classifyVersionBump(files, overrides);

  console.log(`Diff range: ${range}`);
  console.log(`Classification: ${kind}`);
  for (const r of reasons) console.log(`  - ${r}`);

  if (kind === "skip") {
    console.log("Версия не изменена.");
    return;
  }

  const cur = readPackageVersion(root);
  const next = bumpSemver(cur, kind);
  console.log(`${cur} → ${next} (${kind})`);

  if (dryRun) {
    console.log("(dry-run, файлы не записаны)");
    return;
  }

  syncPackageVersion(root, next);
  console.log("Обновлены package.json (root, client, server) и package-lock.json.");
  console.log(`::version::${next}`);
  console.log(`::kind::${kind}`);
}

main();
