import { useState } from "react";
import { unlockRoom } from "../api";
import { setRoomUnlockToken } from "../lib/roomUnlockStorage";

type Props = {
  slug: string;
  isLight: boolean;
  onUnlocked: () => void;
};

export function RoomPasswordGate({ slug, isLight, onUnlocked }: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { unlockToken } = await unlockRoom(slug, password);
      if (unlockToken) setRoomUnlockToken(slug, unlockToken);
      onUnlocked();
    } catch {
      setError("Неверный пароль или комната недоступна.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`mx-auto max-w-md rounded-xl border px-6 py-8 shadow-lg ${
        isLight ? "border-zinc-200 bg-white text-zinc-900" : "border-zinc-600 bg-zinc-900 text-zinc-100"
      }`}
    >
      <h1 className="text-lg font-semibold">Пароль комнаты</h1>
      <p className={`mt-2 text-sm ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
        Введите пароль, чтобы открыть эту комнату. Участники с аккаунтом, добавленные в команду комнаты, пароль не вводят.
      </p>
      <label className={`mt-4 block text-sm font-medium ${isLight ? "text-zinc-800" : "text-zinc-200"}`}>
        Пароль
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          className={`mt-1 w-full rounded border px-3 py-2 outline-none ring-sky-500/30 focus-visible:ring-2 ${
            isLight ? "border-zinc-300 bg-white text-zinc-900" : "border-zinc-500 bg-zinc-950 text-zinc-100"
          }`}
        />
      </label>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
      <button
        type="button"
        disabled={busy || !password}
        onClick={() => void submit()}
        className="mt-4 w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {busy ? "Проверка…" : "Войти"}
      </button>
    </div>
  );
}
