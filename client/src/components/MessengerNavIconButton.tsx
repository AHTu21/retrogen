import { Link, useLocation } from "react-router-dom";

type Props = {
  isLight: boolean;
};

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MessengerNavIconButton({ isLight }: Props) {
  const { pathname } = useLocation();
  const active = pathname === "/messages" || pathname.startsWith("/messages/");

  return (
    <Link
      to="/messages"
      className={`rounded p-2 text-sm no-underline ${
        active
          ? isLight
            ? "bg-sky-600 text-white ring-2 ring-sky-400/45"
            : "bg-sky-500 text-white ring-2 ring-sky-400/35"
          : isLight
            ? "bg-zinc-900 text-white hover:bg-zinc-800"
            : "bg-zinc-200 text-zinc-900 hover:bg-white"
      }`}
      title="Мессенджер"
      aria-label="Мессенджер"
      aria-current={active ? "page" : undefined}
    >
      <MessengerIcon />
    </Link>
  );
}
