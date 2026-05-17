import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAuthMe } from "../api";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { useAppCorners, useAppTheme } from "../theme";

export function WelcomePage() {
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    void fetchAuthMe().then((u) => {
      if (u) navigate("/home", { replace: true });
    });
  }, [navigate]);

  const welcomeHelpBody = (
    <>
      <p className="opacity-90">
        Стартовая страница для гостей: тема и скругления, справка и меню — в липкой шапке над контентом (как на главной). В меню: лобби (после входа),
        профиль, настройки, мастерская, о программе, вход.
      </p>
      <p className="mt-3 opacity-90">
        Если вы уже залогинены, браузер сразу перенаправит на лобби <span className="font-mono">/home</span>. Для новой команды нажмите «Вход» или
        «Зарегистрироваться» в центре страницы.
      </p>
    </>
  );

  return (
    <RetrogenDockableHelpRoot
      isLight={isLight}
      title="Справка: приветствие"
      onHelpOpenCloseAbout={() => setAboutOpen(false)}
      body={welcomeHelpBody}
    >
      <div className={`flex min-h-screen flex-col ${isLight ? "bg-zinc-50 text-zinc-900" : "bg-zinc-950 text-zinc-100"}`}>
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <div
            className={`sticky top-0 z-30 flex flex-wrap items-center justify-end gap-2 border-b pb-3 pt-1 backdrop-blur ${
              isLight ? "border-zinc-200/90 bg-zinc-50/90" : "border-zinc-700/90 bg-zinc-950/90"
            }`}
          >
            <ThemeCornersIconButtons
              isLight={isLight}
              isRounded={isRounded}
              toggleTheme={toggleTheme}
              toggleCorners={toggleCorners}
            />
            <RetrogenDockableHelpToggle isLight={isLight} />
            <RetrogenOverflowMenu isLight={isLight} onAbout={() => setAboutOpen(true)} authVariant="guest" />
          </div>
        </div>
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className={`mx-auto w-full max-w-lg text-center ${isRounded ? "rounded-2xl" : ""}`}>
            <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${isLight ? "text-sky-700" : "text-sky-400"}`}>
              Retrogen
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Добро пожаловать</h1>
            <p className={`mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              Ретроспективы на общей доске: стикеры, голосования и отчёт. Войдите или создайте аккаунт — дальше откроется лобби и создание комнаты.
            </p>

            <div
              className={`mx-auto mt-10 flex h-40 max-w-md items-center justify-center border-2 border-dashed text-sm ${
                isLight ? "border-zinc-300 bg-zinc-100/80 text-zinc-500" : "border-zinc-600 bg-zinc-900/50 text-zinc-500"
              } ${isRounded ? "rounded-xl" : ""}`}
              aria-hidden
            >
              Здесь позже будет иллюстрация или баннер
            </div>

            <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/login"
                className={`inline-flex min-h-[48px] items-center justify-center rounded-lg px-8 py-3 text-center text-base font-semibold no-underline transition-colors ${
                  isLight ? "border-2 border-zinc-900 bg-white text-zinc-900 hover:bg-zinc-100" : "border-2 border-zinc-100 bg-transparent text-zinc-100 hover:bg-white/10"
                } ${isRounded ? "rounded-lg" : ""}`}
              >
                Вход
              </Link>
              <Link
                to="/register"
                className={`inline-flex min-h-[48px] items-center justify-center rounded-lg px-8 py-3 text-center text-base font-semibold no-underline text-white transition-colors ${
                  isLight ? "bg-sky-600 hover:bg-sky-500" : "bg-sky-500 hover:bg-sky-400"
                } ${isRounded ? "rounded-lg" : ""}`}
              >
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </main>
      </div>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
    </RetrogenDockableHelpRoot>
  );
}
