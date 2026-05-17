type Props = {
  isLight: boolean;
  isRounded: boolean;
  toggleTheme: () => void;
  toggleCorners: () => void;
};

export function ThemeCornersIconButtons({ isLight, isRounded, toggleTheme, toggleCorners }: Props) {
  return (
    <>
      <button
        type="button"
        className={`rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
        onClick={toggleTheme}
        title={isLight ? "Включить тёмную тему" : "Включить светлую тему"}
        aria-label={isLight ? "Включить тёмную тему" : "Включить светлую тему"}
      >
        {isLight ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M21.75 15.5A9.75 9.75 0 0 1 8.5 2.25a.75.75 0 0 0-.95.95A8.25 8.25 0 1 0 20.8 16.45a.75.75 0 0 0 .95-.95z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M12 4a1 1 0 0 0 1-1V1a1 1 0 1 0-2 0v2a1 1 0 0 0 1 1zm0 16a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0v-2a1 1 0 0 0-1-1zm8-8a1 1 0 0 0 1-1h2a1 1 0 1 0 0-2h-2a1 1 0 0 0-1 1zM3 12a1 1 0 0 0-1-1H0a1 1 0 1 0 0 2h2a1 1 0 0 0 1-1zm14.95 5.536 1.414 1.414a1 1 0 0 0 1.414-1.414l-1.414-1.414a1 1 0 1 0-1.414 1.414zM4.222 5.636A1 1 0 0 0 5.636 4.222L4.222 2.808A1 1 0 0 0 2.808 4.222l1.414 1.414zm15.142-2.828-1.414 1.414a1 1 0 1 0 1.414 1.414l1.414-1.414a1 1 0 0 0-1.414-1.414zM4.222 18.364l-1.414 1.414a1 1 0 0 0 1.414 1.414l1.414-1.414a1 1 0 0 0-1.414-1.414zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className={`rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
        onClick={toggleCorners}
        title={isRounded ? "Отключить скругление" : "Включить скругление"}
        aria-label={isRounded ? "Отключить скругление" : "Включить скругление"}
      >
        {isRounded ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="0" />
          </svg>
        )}
      </button>
    </>
  );
}
