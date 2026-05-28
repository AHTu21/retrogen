import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerAccount } from "../api";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { MessengerNavIconButton } from "../components/MessengerNavIconButton";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { useAppCorners, useAppTheme } from "../theme";

export function RegisterPage() {
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const [aboutOpen, setAboutOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Пароль не короче 8 символов.");
      return;
    }
    setLoading(true);
    try {
      await registerAccount({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  const registerHelpBody = (
    <>
      <p className="opacity-90">
        Укажите уникальный email и пароль не короче 8 символов. Отображаемое имя необязательно — его можно сменить позже в профиле.
      </p>
      <p className="mt-3 opacity-90">
        После создания аккаунта вы сразу попадёте в лобби. Тема, справка и меню — в липкой шапке над формой (как на главной).
      </p>
    </>
  );

  return (
    <RetrogenDockableHelpRoot
      isLight={isLight}
      title="Справка: регистрация"
      onHelpOpenCloseAbout={() => setAboutOpen(false)}
      body={registerHelpBody}
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
            <h1 className="text-2xl font-semibold">Регистрация</h1>
            <p className={`mt-2 text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              Локальный аккаунт на этом сервере Retrogen. Email должен быть уникальным.
            </p>
          </header>
          <form onSubmit={onSubmit} className={`flex flex-col gap-4 rounded-xl border p-5 ${isLight ? "border-zinc-200 bg-white" : "border-zinc-700 bg-zinc-900/60"}`}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Отображаемое имя (необязательно)</span>
              <input
                type="text"
                maxLength={120}
                className={`rounded border px-3 py-2 text-sm ${isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-950"}`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
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
              <span className="text-sm font-medium">Пароль (мин. 8 символов)</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
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
              {loading ? "Создаём…" : "Создать аккаунт"}
            </button>
          </form>
          <p className="text-sm">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="font-medium text-sky-600 underline-offset-2 hover:underline">
              Вход
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
