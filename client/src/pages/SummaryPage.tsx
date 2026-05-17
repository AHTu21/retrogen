import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createActionItem,
  deleteActionItem,
  fetchRoom,
  updateActionItem,
} from "../api";
import { RoomPasswordGate } from "../components/RoomPasswordGate";
import type { RoomDto } from "../types";
import { recordRoomVisit } from "../lib/roomLobbyPrefs";
import { useAppTheme } from "../theme";

function stripHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
}

function buildMarkdownSummary(room: RoomDto): string {
  const lines: string[] = [];
  lines.push(`# Отчёт по ретро`);
  lines.push("");
  lines.push(`Комната: \`${room.slug}\``);
  lines.push(`Тема: ${room.themeSanitized}`);
  if (room.endedAt) lines.push(`Завершено: ${room.endedAt}`);
  lines.push("");

  const ratings = room.retroRatings;
  if (ratings.length > 0) {
    const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
    lines.push(`## Оценка ретро (среднее ${avg.toFixed(2)} / 5)`);
    ratings.forEach((r) => lines.push(`- ${r.score}`));
    lines.push("");
  }

  if (room.retroOneThings.length > 0) {
    lines.push("## Одна вещь улучшить");
    room.retroOneThings.forEach((o) => lines.push(`- ${o.text.replace(/\n/g, " ")}`));
    lines.push("");
  }

  const pack = room.themePack;
  lines.push("## Стикеры по блокам");
  for (const block of [...room.blocks].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const title = pack.blocks[block.kind]?.title ?? block.kind;
    const cards = room.cards.filter((c) => c.blockId === block.id);
    lines.push(`### ${title} (${cards.length})`);
    for (const c of cards) {
      const author = c.anonymous ? "анонимно" : c.authorDisplayName || "—";
      lines.push(`- ${stripHtml(c.text) || "(пусто)"} — _${author}_`);
    }
    lines.push("");
  }

  if (room.sprintStarEntries.length > 0) {
    lines.push("## Звездочка спринта");
    [...room.sprintStarEntries]
      .sort((a, b) => b.starCount - a.starCount)
      .forEach((e) => lines.push(`- **${e.name}** — ${e.starCount} ★`));
    lines.push("");
  }

  if (room.warmupVotes.length > 0) {
    lines.push("## Разминка");
    const opts = pack.blocks.warmup?.warmupOptions ?? [];
    const label = (id: string) => opts.find((o) => o.id === id)?.label ?? id;
    const tally: Record<string, number> = {};
    room.warmupVotes.forEach((v) => {
      tally[v.optionId] = (tally[v.optionId] ?? 0) + 1;
    });
    Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .forEach(([id, n]) => lines.push(`- ${label(id)}: ${n}`));
    lines.push("");
  }

  if (room.actionItems.length > 0) {
    lines.push("## Action items");
    [...room.actionItems]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((a) => lines.push(`- [ ] ${a.text}`));
    lines.push("");
  }

  return lines.join("\n");
}

export function SummaryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { themeMode } = useAppTheme();
  const isLight = themeMode === "light";
  const [room, setRoom] = useState<RoomDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [unlockTick, setUnlockTick] = useState(0);
  const [actionDraft, setActionDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await fetchRoom(slug);
      setRoom(data);
      recordRoomVisit({
        slug: data.slug,
        themeSanitized: data.themeSanitized,
        status: data.status,
      });
      setError(null);
      setPasswordRequired(false);
    } catch (e) {
      if (e instanceof Error && e.message === "room_password_required") {
        setPasswordRequired(true);
        setError(null);
        return;
      }
      setError("Комната не найдена");
    }
  }, [slug, unlockTick]);

  useEffect(() => {
    void load();
  }, [load]);

  const avgRating = useMemo(() => {
    if (!room || room.retroRatings.length === 0) return null;
    const s = room.retroRatings.reduce((a, r) => a + r.score, 0);
    return s / room.retroRatings.length;
  }, [room]);

  const summaryJson = useMemo(() => {
    if (!room) return "";
    return JSON.stringify(room, null, 2);
  }, [room]);

  const summaryMd = useMemo(() => (room ? buildMarkdownSummary(room) : ""), [room]);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(summaryJson);
    } catch {
      /* ignore */
    }
  }

  async function copyMd() {
    try {
      await navigator.clipboard.writeText(summaryMd);
    } catch {
      /* ignore */
    }
  }

  async function addAction() {
    if (!slug || !actionDraft.trim()) return;
    try {
      await createActionItem(slug, { text: actionDraft.trim() });
      setActionDraft("");
      await load();
    } catch {
      /* ignore */
    }
  }

  async function removeAction(id: string) {
    if (!slug) return;
    try {
      await deleteActionItem(slug, id);
      await load();
    } catch {
      /* ignore */
    }
  }

  async function saveEdit(id: string) {
    if (!slug || !editingText.trim()) return;
    try {
      await updateActionItem(slug, id, { text: editingText.trim() });
      setEditingId(null);
      await load();
    } catch {
      /* ignore */
    }
  }

  if (!slug) {
    return (
      <div className={`min-h-screen p-8 ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <p>Нет комнаты</p>
        <Link className="underline" to="/home">
          На главную
        </Link>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className={`min-h-screen px-6 py-16 ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <div className="mx-auto max-w-lg">
          <RoomPasswordGate
            slug={slug}
            isLight={isLight}
            onUnlocked={() => {
              setPasswordRequired(false);
              setUnlockTick((t) => t + 1);
            }}
          />
          <Link className={`mt-6 inline-block text-sm underline ${isLight ? "text-sky-700" : "text-sky-400"}`} to="/home">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-8 ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <p>{error}</p>
        <Link className="underline" to="/home">
          На главную
        </Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className={`min-h-screen p-8 ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        Загрузка…
      </div>
    );
  }

  if (room.status !== "ended") {
    return (
      <div className={`min-h-screen p-8 ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <p className="mb-4">Ретро ещё не завершено — отчёт будет доступен после нажатия «Завершить ретро» на доске.</p>
        <Link className="rounded-lg bg-violet-600 px-4 py-2 text-white print:hidden" to={`/r/${slug}`}>
          Перейти к доске
        </Link>
      </div>
    );
  }

  const pack = room.themePack;

  return (
    <div
      className={`min-h-screen print:bg-white print:text-black ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}
    >
      <header
        className={`print:hidden sticky top-0 z-10 border-b px-4 py-3 ${
          isLight ? "border-zinc-200 bg-white/95" : "border-zinc-700 bg-zinc-900/95"
        }`}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Отчёт по ретро</h1>
          <div className="flex flex-wrap gap-2">
            <Link className={`rounded-lg px-3 py-1.5 text-sm ${isLight ? "bg-zinc-200" : "bg-zinc-700"}`} to="/home">
              На главную
            </Link>
            <Link className={`rounded-lg px-3 py-1.5 text-sm ${isLight ? "bg-zinc-200" : "bg-zinc-700"}`} to={`/r/${slug}`}>
              К доске
            </Link>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm ${isLight ? "bg-zinc-200" : "bg-zinc-700"}`}
              onClick={() => void copyJson()}
            >
              Копировать JSON
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm ${isLight ? "bg-zinc-200" : "bg-zinc-700"}`}
              onClick={() => void copyMd()}
            >
              Копировать Markdown
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"}`}
              onClick={() => window.print()}
            >
              Печать / PDF
            </button>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8 print:py-4">
        <p className="text-sm opacity-80">Комната {room.slug}</p>
        <p className="mt-2 text-xl font-medium">{room.themeSanitized}</p>
        {room.endedAt && <p className="mt-1 text-sm opacity-75">Завершено: {new Date(room.endedAt).toLocaleString()}</p>}

        <section className="mt-8">
          <h2 className="text-base font-semibold">Оценка ретро</h2>
          {avgRating != null ? (
            <p className="mt-2">
              Средняя оценка: <strong>{avgRating.toFixed(2)}</strong> из 5 ({room.retroRatings.length}{" "}
              {room.retroRatings.length === 1 ? "ответ" : "ответов"})
            </p>
          ) : (
            <p className="mt-2 opacity-75">Оценок пока нет.</p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold">Одна вещь улучшить</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {room.retroOneThings.map((o) => (
              <li key={o.id}>{o.text}</li>
            ))}
          </ul>
          {room.retroOneThings.length === 0 && <p className="mt-2 opacity-75">Нет ответов.</p>}
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold">Стикеры по блокам</h2>
          {[...room.blocks]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((block) => {
              const title = pack.blocks[block.kind]?.title ?? block.kind;
              const cards = room.cards.filter((c) => c.blockId === block.id);
              return (
                <div key={block.id} className="mt-4">
                  <h3 className="text-sm font-medium">
                    {title}{" "}
                    <span className="font-normal opacity-70">({cards.length})</span>
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
                    {cards.map((c) => (
                      <li key={c.id}>
                        {stripHtml(c.text) || <span className="italic opacity-60">пусто</span>}
                        <span className="opacity-70">
                          {" "}
                          — {c.anonymous ? "анонимно" : c.authorDisplayName || "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </section>

        {room.sprintStarEntries.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold">Звездочка спринта</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              {[...room.sprintStarEntries]
                .sort((a, b) => b.starCount - a.starCount)
                .map((e) => (
                  <li key={e.id}>
                    {e.name} — {e.starCount} ★
                  </li>
                ))}
            </ul>
          </section>
        )}

        {room.warmupVotes.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold">Разминка</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              {(() => {
                const opts = pack.blocks.warmup?.warmupOptions ?? [];
                const label = (id: string) => opts.find((o) => o.id === id)?.label ?? id;
                const tally: Record<string, number> = {};
                room.warmupVotes.forEach((v) => {
                  tally[v.optionId] = (tally[v.optionId] ?? 0) + 1;
                });
                return Object.entries(tally)
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, n]) => (
                    <li key={id}>
                      {label(id)} — {n}
                    </li>
                  ));
              })()}
            </ul>
          </section>
        )}

        <section className="mt-8 print:break-inside-avoid">
          <h2 className="text-base font-semibold">Action items</h2>
          <ul className="mt-2 space-y-2">
            {[...room.actionItems]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((a) => (
                <li
                  key={a.id}
                  className={`flex flex-wrap items-start gap-2 rounded-lg border p-2 print:border-zinc-300 ${
                    isLight ? "border-zinc-200" : "border-zinc-600"
                  }`}
                >
                  {editingId === a.id ? (
                    <>
                      <input
                        className={`min-w-0 flex-1 rounded border px-2 py-1 text-sm ${
                          isLight ? "border-zinc-300 bg-white" : "border-zinc-500 bg-zinc-800"
                        }`}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                      />
                      <button
                        type="button"
                        className="print:hidden rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                        onClick={() => void saveEdit(a.id)}
                      >
                        Сохранить
                      </button>
                      <button type="button" className="print:hidden rounded px-2 py-1 text-xs" onClick={() => setEditingId(null)}>
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{a.text}</span>
                      <button
                        type="button"
                        className="print:hidden rounded px-2 py-1 text-xs opacity-70 hover:opacity-100"
                        onClick={() => {
                          setEditingId(a.id);
                          setEditingText(a.text);
                        }}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="print:hidden rounded px-2 py-1 text-xs text-red-500"
                        onClick={() => void removeAction(a.id)}
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </li>
              ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 print:hidden">
            <input
              className={`min-w-[200px] flex-1 rounded border px-3 py-2 text-sm ${
                isLight ? "border-zinc-300 bg-white" : "border-zinc-500 bg-zinc-800"
              }`}
              placeholder="Новая задача…"
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addAction();
              }}
            />
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"}`}
              onClick={() => void addAction()}
            >
              Добавить
            </button>
          </div>
        </section>
      </article>
    </div>
  );
}
