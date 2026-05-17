import fs from "node:fs";
import path from "node:path";

const PKG_REL = ["package.json", "client/package.json", "server/package.json"];

/** Единая версия во всех package.json и в package-lock (workspaces). */
export function syncPackageVersion(root, nextVersion) {
  for (const rel of PKG_REL) {
    const p = path.join(root, rel);
    const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
    pkg.version = nextVersion;
    fs.writeFileSync(p, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  }

  const lockPath = path.join(root, "package-lock.json");
  if (!fs.existsSync(lockPath)) return;
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.version = nextVersion;
  if (lock.packages?.[""]) lock.packages[""].version = nextVersion;
  for (const ws of ["client", "server"]) {
    if (lock.packages?.[ws]) lock.packages[ws].version = nextVersion;
  }
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

export function readPackageVersion(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  return pkg.version;
}

export const VERSION_FILE_PATHS = [
  "package.json",
  "client/package.json",
  "server/package.json",
  "package-lock.json",
];
