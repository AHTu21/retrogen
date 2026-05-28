/** Минималистичные кнопки внутри поля ввода мессенджера. */

export function composerInlineIconClass(isLight: boolean, active = false): string {
  const idle = isLight ? "text-zinc-400" : "text-zinc-500";
  const accent = active
    ? isLight
      ? "text-sky-600"
      : "text-sky-400"
    : idle;
  const hover = isLight ? "hover:text-sky-600" : "hover:text-sky-400";
  return `flex size-7 shrink-0 items-center justify-center rounded-md bg-transparent p-0 transition-colors ${accent} ${hover} disabled:pointer-events-none disabled:opacity-30`;
}

export function composerSendIconClass(isLight: boolean, canSend: boolean): string {
  const base =
    "flex size-7 shrink-0 items-center justify-center rounded-md bg-transparent p-0 transition-colors";
  if (!canSend) {
    return `${base} cursor-default ${isLight ? "text-zinc-300" : "text-zinc-600"}`;
  }
  const idle = isLight ? "text-zinc-400" : "text-zinc-500";
  const hover = isLight ? "hover:text-sky-600" : "hover:text-sky-400";
  return `${base} ${idle} ${hover}`;
}

export function composerFieldShellClass(isLight: boolean): string {
  return `flex w-full items-center gap-0.5 overflow-hidden rounded-lg border py-1 ${
    isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-800"
  }`;
}
