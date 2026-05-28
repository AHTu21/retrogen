import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchAuthMe, fetchRoom, logoutAccount, type AuthUserDto } from "../api";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { MessengerNavIconButton } from "../components/MessengerNavIconButton";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { useAppCorners, useAppTheme } from "../theme";

type TeamRow = { id: string; label: string };

function teamStorageKey(slug: string) {
  return `retrogen_room_team_draft_v1:${slug}`;
}

function readTeam(slug: string): TeamRow[] {
  try {
    const raw = localStorage.getItem(teamStorageKey(slug));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const o = x as { id?: string; label?: string };
        const id = typeof o.id === "string" ? o.id : "";
        const label = typeof o.label === "string" ? o.label : "";
        if (!id || !label) return null;
        return { id, label };
      })
      .filter((x): x is TeamRow => x != null);
  } catch {
    return [];
  }
}

export function RoomTeamPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const [aboutOpen, setAboutOpen] = useState(false);
  const [authMe, setAuthMe] = useState<AuthUserDto | null>(null);
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [draftLabel, setDraftLabel] = useState("");
  const [teamAccess, setTeamAccess] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    void fetchAuthMe().then(setAuthMe);
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetchRoom(slug);
        if (cancelled) return;
        if (r.hasOwner && r.acl?.facilitate !== true) {
          navigate(`/r/${slug}`, { replace: true });
          return;
        }
        setTeamAccess("ok");
      } catch {
        if (!cancelled) navigate(`/r/${slug}`, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  useEffect(() => {
    if (!slug || teamAccess !== "ok") return;
    setRows(readTeam(slug));
  }, [slug, teamAccess]);

  const persist = useCallback(
    (next: TeamRow[]) => {
      if (!slug) return;
      try {
        localStorage.setItem(teamStorageKey(slug), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setRows(next);
    },
    [slug],
  );

  const helpBody = useMemo(
    () => (
      <>
        <p className="opacity-90">
          Здесь будет <strong>состав комнаты</strong> для фасилитатора: список людей, откуда подтянем данные для <strong>звёздочки спринта</strong>, разминки
          и других блоков. Сейчас список хранится <strong>только в этом браузере</strong> как черновик.
        </p>
        <p className="mt-3 opacity-90">
          После появления серверной модели участников эта страница будет синхронизироваться с комнатой и правами фасилитатора.
        </p>
      </>
    ),
    [],
  );

  if (!slug) {
    navigate("/home", { replace: true });
    return null;
  }

  if (teamAccess !== "ok") {
    return (
      <div className={`flex min-h-screen items-center justify-center px-4 ${isLight ? "bg-zinc-50 text-zinc-700" : "bg-zinc-950 text-zinc-300"}`}>
        <p className="text-sm">Проверка доступа к странице команды…</p>
      </div>
    );
  }

  function addRow() {
    const label = draftLabel.trim();
    if (!label) return;
    const id = `local-${Date.now()}`;
    persist([...rows, { id, label }]);
    setDraftLabel("");
  }

  function removeRow(id: string) {
    persist(rows.filter((r) => r.id !== id));
  }

  return (
    <RetrogenDockableHelpRoot
      isLight={isLight}
      title="Справка: команда комнаты"
      onHelpOpenCloseAbout={() => setAboutOpen(false)}
      body={helpBody}
    >
      <div className={`min-h-screen px-4 py-8 ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <div className="mx-auto w-full max-w-5xl">
          <div
            className={`sticky top-0 z-30 mb-6 flex flex-wrap items-center justify-end gap-2 border-b pb-3 pt-1 backdrop-blur ${
              isLight ? "border-zinc-200/90 bg-zinc-50/90" : "border-zinc-700/90 bg-zinc-950/90"
            }`}
          >
            <ThemeCornersIconButtons
              isLight={isLight}
              isRounded={isRounded}
              toggleTheme={toggleTheme}
              toggleCorners={toggleCorners}
            />
            <MessengerNavIconButton isLight={isLight} />
            <RetrogenDockableHelpToggle isLight={isLight} />
            <RetrogenOverflowMenu
              isLight={isLight}
              onAbout={() => setAboutOpen(true)}
              authVariant={authMe ? "user" : "guest"}
              showLobbyLink={false}
              teamRoomSlug={slug}
              onLogout={
                authMe
                  ? () => {
                      logoutAccount();
                      setAuthMe(null);
                      navigate("/", { replace: true });
                    }
                  : undefined
              }
            />
          </div>

          <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link className="font-medium text-sky-600 underline-offset-2 hover:underline" to={`/r/${slug}`}>
                ← К комнате
              </Link>
              <Link className="text-zinc-500 underline-offset-2 hover:underline" to="/home">
                На главную
              </Link>
            </div>

            <header>
              <p className={`text-xs font-semibold uppercase tracking-wide ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                Комната <span className="font-mono">{slug}</span>
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Команда</h1>
              <p className={`mt-2 text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                Черновик списка для будущей интеграции со звёздочкой спринта и остальными сценариями. Данные не уходят на сервер.
              </p>
            </header>

            <section
              className={`rounded-xl border p-4 ${isLight ? "border-zinc-200 bg-white" : "border-zinc-700 bg-zinc-900/60"} ${isRounded ? "rounded-xl" : "rounded-none"}`}
            >
              <h2 className="text-sm font-semibold">Добавить человека</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  placeholder="Имя или ник"
                  className={`min-w-[12rem] flex-1 rounded border px-3 py-2 text-sm ${
                    isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-950"
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRow();
                    }
                  }}
                />
                <button
                  type="button"
                  className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                  onClick={addRow}
                >
                  Добавить
                </button>
              </div>
            </section>

            <section
              className={`rounded-xl border p-4 ${isLight ? "border-zinc-200 bg-white" : "border-zinc-700 bg-zinc-900/60"} ${isRounded ? "rounded-xl" : "rounded-none"}`}
            >
              <h2 className="text-sm font-semibold">Список ({rows.length})</h2>
              {rows.length === 0 ? (
                <p className={`mt-3 text-sm ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>Пока пусто — добавьте участников вручную.</p>
              ) : (
                <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-600">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>{r.label}</span>
                      <button
                        type="button"
                        className="text-xs text-rose-600 underline"
                        onClick={() => removeRow(r.id)}
                      >
                        Убрать
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
    </RetrogenDockableHelpRoot>
  );
}
