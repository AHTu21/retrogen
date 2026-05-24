import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";

const StickerTipTapField = lazy(() =>
  import("./StickerTipTapField").then((m) => ({ default: m.StickerTipTapField })),
);

type Props = ComponentProps<typeof StickerTipTapField>;

export function StickerTipTapFieldLazy(props: Props) {
  return (
    <Suspense
      fallback={
        <div
          className="h-full min-h-[2rem] w-full animate-pulse rounded bg-black/5 dark:bg-white/5"
          aria-hidden
        />
      }
    >
      <StickerTipTapField {...props} />
    </Suspense>
  );
}
