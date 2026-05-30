import type { ProfileDesign } from "./profileDesign";

type Props = {
  d: ProfileDesign;
  serverUpdatedAt: string;
  onKeepLocal: () => void;
  onTakeServer: () => void;
  onMerge: () => void;
};

export function ProfileCloudConflictBanner({
  d,
  serverUpdatedAt,
  onKeepLocal,
  onTakeServer,
  onMerge,
}: Props) {
  let when = serverUpdatedAt;
  try {
    when = new Date(serverUpdatedAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    /* keep raw */
  }

  return (
    <div className={`mb-4 ${d.noticeBanner} px-4 py-3 ${d.rSm}`} role="alert">
      <p className="text-[0.875rem] font-semibold">Конфликт синхронизации</p>
      <p className="mt-1 text-[0.8125rem] leading-relaxed opacity-90">
        На сервере более новая версия профиля ({when}), а в этом браузере есть несохранённые или отличающиеся
        изменения. Выберите, что применить.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={d.btnPrimary} onClick={onKeepLocal}>
          Оставить мои
        </button>
        <button type="button" className={d.btnSecondary} onClick={onTakeServer}>
          Взять с сервера
        </button>
        <button type="button" className={d.btnGhost} onClick={onMerge}>
          Объединить
        </button>
      </div>
    </div>
  );
}
