import { useState } from "react";
import { Link } from "react-router-dom";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { useAppCorners, useAppTheme } from "../theme";

export function WorkshopPage() {
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const [aboutOpen, setAboutOpen] = useState(false);

  const workshopHelpBody = (
    <>
      <p className="opacity-90">
        Раздел задуман как каталог шаблонов, косметики интерфейса и обмена материалами между командами. Сейчас на странице — заготовка и описание
        направлений из плана продукта.
      </p>
      <p className="mt-3 opacity-90">
        Тема, справка и меню — в липкой шапке над контентом (как на главной). В меню: лобби, профиль, настройки, мастерская, о программе, вход. Ссылка
        «← На главную» ведёт в лобби со списком комнат.
      </p>
    </>
  );

  return (
    <RetrogenDockableHelpRoot
      isLight={isLight}
      title="Справка: мастерская"
      onHelpOpenCloseAbout={() => setAboutOpen(false)}
      body={workshopHelpBody}
    >
      <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
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
            <RetrogenDockableHelpToggle isLight={isLight} />
            <RetrogenOverflowMenu isLight={isLight} onAbout={() => setAboutOpen(true)} authVariant="guest" />
          </div>
          <div className="mx-auto flex max-w-3xl flex-col gap-8">
            <div className="flex flex-wrap gap-3 text-sm">
              <Link className="font-medium text-sky-600 underline-offset-2 hover:underline" to="/home">
                ← На главную
              </Link>
            </div>
            <header>
              <h1 className="text-3xl font-semibold tracking-tight">Мастерская</h1>
              <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
                Здесь позже появится общий каталог: шаблоны досок, косметика интерфейса, сценарии ретро и обмен материалами. Сейчас страница‑заготовка под
                биржу услуг и внутреннюю валюту из плана продукта.
              </p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
                <h2 className="text-lg font-semibold">Биржа и обмен</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Услуги фасилитации, консультации, готовые форматы ретро, «поделки» и товары — с рейтингом и отзывами (после учётных записей и модерации).
                </p>
              </section>
              <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
                <h2 className="text-lg font-semibold">Валюта и награды</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Внутренние баллы за активность, завершённые ретро и полезные публикации; обмен на косметику и шаблоны (без реальных денег на первом этапе).
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
    </RetrogenDockableHelpRoot>
  );
}
