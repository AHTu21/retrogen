import type { ReactNode } from "react";

const CHANGELOG_USER_MARK = "<!-- changelog:user -->";
const CHANGELOG_DEV_MARK = "<!-- changelog:dev -->";

/** Подразделы только для репозитория — не показывать в «О программе». */
const HIDDEN_SUBSECTIONS = new Set([
  "Разработка",
  "API и сервер",
  "Документация",
  "Сервер и инфраструктура",
  "Известные ограничения / дальнейшая работа",
]);

/** Оставить в UI только пользовательский блок CHANGELOG.md. */
export function changelogForAbout(source: string): string {
  let text = source;
  const userIdx = text.indexOf(CHANGELOG_USER_MARK);
  if (userIdx >= 0) text = text.slice(userIdx + CHANGELOG_USER_MARK.length);
  const devIdx = text.indexOf(CHANGELOG_DEV_MARK);
  if (devIdx >= 0) text = text.slice(0, devIdx);
  return text.trimStart();
}

function stripReferenceLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

function Inline({ text }: { text: string }): ReactNode {
  const s = stripReferenceLinks(text);
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    parts.push(
      <strong key={k++} className="font-semibold">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts.length === 0 ? null : parts.length === 1 ? parts[0] : <>{parts}</>;
}

function isMetaLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t.startsWith("_") && t.endsWith("_")) return true;
  return false;
}

export function ChangelogView({ source }: { source: string }): ReactNode {
  const lines = changelogForAbout(source).split(/\r?\n/).map((l) => l.replace(/\r$/, ""));
  let i = 0;
  const out: ReactNode[] = [];
  let key = 0;

  const pushSpace = () => {
    out.push(<div key={`sp-${key++}`} className="h-2 shrink-0" />);
  };

  if (lines[i]?.startsWith("# ")) i++;

  while (i < lines.length && !lines[i].startsWith("## ")) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith("## ")) {
      i++;
      continue;
    }
    const sectionTitle = line.slice(3).trim();
    i++;

    if (sectionTitle === "[Unreleased]") {
      while (i < lines.length && !lines[i].startsWith("## ")) i++;
      continue;
    }

    out.push(
      <h2 key={`h2-${key++}`} className="text-base font-semibold tracking-tight">
        <Inline text={sectionTitle} />
      </h2>,
    );
    pushSpace();

    const bodyStart = i;
    while (i < lines.length && !lines[i].startsWith("## ")) i++;
    const sectionLines = lines.slice(bodyStart, i);
    const body = renderSectionBody(sectionLines, () => key++);
    out.push(...body.nodes);
    pushSpace();
  }

  return <div className="changelog-view space-y-1">{out}</div>;
}

function renderSectionBody(
  lines: string[],
  nextKey: () => number,
): { nodes: ReactNode[] } {
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || isMetaLine(line)) {
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      const title = line.slice(4).trim();
      if (HIDDEN_SUBSECTIONS.has(title)) {
        i++;
        while (i < lines.length && !lines[i].startsWith("### ") && !lines[i].startsWith("## ")) i++;
        continue;
      }
      nodes.push(
        <h3 key={`h3-${nextKey()}`} className="mt-3 text-sm font-semibold first:mt-0">
          <Inline text={title} />
        </h3>,
      );
      i++;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${nextKey()}`} className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {items.map((raw, j) => (
            <li key={j}>
              <Inline text={raw} />
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    let para = line;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("### ") &&
      !lines[i].startsWith("- ") &&
      !lines[i].startsWith("## ")
    ) {
      para += " " + lines[i];
      i++;
    }
    if (isMetaLine(para)) continue;
    nodes.push(
      <p key={`p-${nextKey()}`} className="text-sm leading-relaxed">
        <Inline text={para} />
      </p>,
    );
  }

  return { nodes };
}
