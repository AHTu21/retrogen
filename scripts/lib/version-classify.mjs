/**
 * Классификация merge в main: patch (3-я цифра) или minor (2-я).
 * См. docs/VERSIONING.md
 */

const COUNTED_PREFIXES = ["client/src/", "server/src/", "server/prisma/"];
const COUNTED_EXACT = new Set(["client/vite.config.ts", "client/tsconfig.json", "server/tsconfig.json"]);

const THRESHOLD_LINES = 250;
const THRESHOLD_FILES = 8;
const THRESHOLD_SINGLE_FILE_LINES = 400;

export function isCountedPath(file) {
  if (!file || file === "package-lock.json") return false;
  if (file.endsWith(".md") && !file.startsWith("server/prisma/")) return false;
  if (file.startsWith("docs/") || file.startsWith(".cursor/") || file.startsWith("scripts/")) return false;
  if (file.includes("node_modules") || file.startsWith("client/dist/")) return false;
  if (COUNTED_EXACT.has(file)) return true;
  return COUNTED_PREFIXES.some((p) => file.startsWith(p));
}

/**
 * @param {{ path: string, added: number, deleted: number }[]} files
 * @param {{ forcePatch?: boolean, forceMinor?: boolean, forceSkip?: boolean }} overrides
 */
export function classifyVersionBump(files, overrides = {}) {
  if (overrides.forceSkip) return { kind: "skip", reasons: ["label or flag version:skip"] };
  if (overrides.forceMinor) return { kind: "minor", reasons: ["label version:minor or [minor] in title"] };
  if (overrides.forcePatch) return { kind: "patch", reasons: ["label version:patch or [patch] in title"] };

  const counted = files.filter((f) => isCountedPath(f.path));
  if (counted.length === 0) {
    return { kind: "skip", reasons: ["нет изменений в учитываемых путях (только docs/lock/changelog)"] };
  }

  const reasons = [];
  let totalLines = 0;
  let clientFiles = 0;
  let serverFiles = 0;
  let hasMigration = false;
  let hasSchema = false;

  for (const f of counted) {
    const lines = f.added + f.deleted;
    totalLines += lines;
    if (f.path.startsWith("client/src/")) clientFiles++;
    if (f.path.startsWith("server/src/")) serverFiles++;
    if (
      f.path.startsWith("server/prisma/migrations/") &&
      f.path !== "server/prisma/migrations/migration_lock.toml"
    ) {
      hasMigration = true;
    }
    if (f.path === "server/prisma/schema.prisma") hasSchema = true;
    if (lines > THRESHOLD_SINGLE_FILE_LINES) {
      reasons.push(`крупное изменение в одном файле: ${f.path} (${lines} строк)`);
    }
  }

  if (hasMigration) reasons.push("новая или изменённая миграция Prisma");
  if (hasSchema) reasons.push("изменение server/prisma/schema.prisma");

  if (totalLines > THRESHOLD_LINES) reasons.push(`суммарно ${totalLines} строк (> ${THRESHOLD_LINES})`);
  if (counted.length > THRESHOLD_FILES) reasons.push(`${counted.length} файлов (> ${THRESHOLD_FILES})`);
  if (clientFiles >= 2 && serverFiles >= 2) {
    reasons.push(`сквозное изменение client (${clientFiles}) и server (${serverFiles})`);
  }

  if (reasons.length > 0) {
    return { kind: "minor", reasons };
  }

  return {
    kind: "patch",
    reasons: [
      `${counted.length} файл(ов), ${totalLines} строк — в пределах порога для patch`,
    ],
  };
}

/** @param {string} semver */
export function bumpSemver(semver, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(semver.trim());
  if (!m) throw new Error(`Invalid semver: ${semver}`);
  let major = Number(m[1]);
  let minor = Number(m[2]);
  let patch = Number(m[3]);
  if (kind === "patch") {
    patch += 1;
  } else if (kind === "minor") {
    minor += 1;
    patch = 0;
  } else if (kind === "prod") {
    major += 1;
    minor = 0;
    patch = 0;
  } else {
    throw new Error(`Unknown bump kind: ${kind}`);
  }
  return `${major}.${minor}.${patch}`;
}
