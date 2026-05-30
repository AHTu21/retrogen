import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { loginAccount } from "../api";
import { safeAuthReturnTo } from "../lib/authErrors";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { MessengerNavIconButton } from "../components/MessengerNavIconButton";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { useAppCorners, useAppTheme } from "../theme";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = safeAuthReturnTo(
    searchParams.get("returnTo") ?? (location.state as { returnTo?: string } | null)?.returnTo,
  );
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const [aboutOpen, setAboutOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginAccount({ email: email.trim(), password });
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  const loginHelpBody = (
    <>
      <p className="opacity-90">
        Введите email и пароль аккаунта на этом сервере Retrogen. После успешного входа токен сохраняется в браузере, откроется лобби с созданием комнат.
      </p>
      <p className="mt-3 opacity-90">
        Тема, справка и меню — в липкой шапке над формой (как на главной). В меню: лобби, профиль, настройки, мастерская, о программе. Нет аккаунта —
        ссылка «Регистрация» внизу формы.
      </p>
    </>
  );

  return (
    <RetrogenDockableHelpRoot
      isLight={isLight}
      title="Справка: вход"
      onHelpOpenCloseAbout={() => setAboutOpen(false)}
      body={loginHelpBody}
    >
      <div className={`min-h-screen px-4 py-10 ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
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
            <RetrogenOverflowMenu isLight={isLight} onAbout={() => setAboutOpen(true)} authVariant="guest" />
          </div>
        <div className="mx-auto flex max-w-md flex-col gap-6">
          <header>
            <h1 className="text-2xl font-semibold">Вход</h1>
            <p className={`mt-2 text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              После входа токен хранится в браузере; созданные комнаты привязываются к аккаунту.
            </p>
          </header>
          <form onSubmit={onSubmit} className={`flex flex-col gap-4 rounded-xl border p-5 ${isLight ? "border-zinc-200 bg-white" : "border-zinc-700 bg-zinc-900/60"}`}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                className={`rounded border px-3 py-2 text-sm ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-950"}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Пароль</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                className={`rounded border px-3 py-2 text-sm ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-950"}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {loading ? "Входим…" : "Войти"}
            </button>
          </form>
          <p className="text-sm">
            Нет аккаунта?{" "}
            <Link to="/register" className="font-medium text-sky-600 underline-offset-2 hover:underline">
              Регистрация
            </Link>
            {" · "}
            <Link to="/" className="text-sky-600 underline-offset-2 hover:underline">
              На главную
            </Link>
          </p>
        </div>
        </div>
      </div>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
    </RetrogenDockableHelpRoot>
  );
}
