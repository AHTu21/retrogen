import { Link } from "react-router-dom";
import type { RoomActorProfile } from "../../lib/roomActorProfile";

type Props = {
  actor: RoomActorProfile;
  isLight: boolean;
};

/** Компактная карточка «вы в комнате» — ссылка на настройки identity. */
export function RoomActorIdentityChip({ actor, isLight }: Props) {
  const tooltip = [actor.label, actor.roleLine, actor.signature].filter(Boolean).join(" · ");

  return (
    <Link
      to="/profile#identity"
      title={tooltip || "Настроить профиль"}
      className={`flex max-w-[12.5rem] shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-xs no-underline transition hover:opacity-90 ${
        isLight
          ? "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50"
          : "bg-zinc-800/90 text-zinc-100 ring-1 ring-zinc-600 hover:bg-zinc-800"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.625rem] font-semibold ${
          isLight ? "bg-white text-zinc-600 ring-1 ring-zinc-200" : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-600"
        }`}
      >
        {actor.avatarUrl ? (
          <img src={actor.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          actor.initials
        )}
      </span>
      <span className="min-w-0 truncate font-medium leading-tight">{actor.label}</span>
    </Link>
  );
}
