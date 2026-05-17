/**
 * Дописывает один маркированный пункт в конец раздела ## [Unreleased] (перед первым ## [semver]).
 * Пример: npm run changelog:append -- "Исправлено отображение таймера при зуме"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const file = path.join(root, "CHANGELOG.md");

const bullet = process.argv.slice(2).join(" ").trim();
if (!bullet) {
  console.error('Usage: npm run changelog:append -- "Текст пункта (без ведущего дефиса)"');
  process.exit(1);
}

let text = fs.readFileSync(file, "utf8");
const unreleased = "## [Unreleased]";
const i0 = text.indexOf(unreleased);
if (i0 === -1) {
  console.error("CHANGELOG.md: не найден заголовок ## [Unreleased]");
  process.exit(1);
}

const after = text.slice(i0 + unreleased.length);
const m = after.match(/\n## \[\d+\.\d+\.\d+\]\s*—/);
if (!m || m.index === undefined) {
  console.error("CHANGELOG.md: не найден следующий релиз ## [x.y.z] — для вставки пункта");
  process.exit(1);
}

const cut = i0 + unreleased.length + m.index;
const head = text.slice(0, cut);
const tail = text.slice(cut);
const line = `- ${bullet}\n`;
if (head.includes(line.trim())) {
  console.log("Пункт уже есть — пропуск.");
  process.exit(0);
}

const spacer = head.endsWith("\n\n") ? "" : head.endsWith("\n") ? "\n" : "\n\n";
text = head + spacer + line + tail;
fs.writeFileSync(file, text, "utf8");
console.log("Добавлено в [Unreleased]:", bullet);
