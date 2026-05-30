import type { ReactNode } from "react";
import { useProfileHideTips } from "../../lib/useProfileHideTips";

/** Подсказка на кнопке — скрывается для «профи». */
export function ProfileControlHint({
  hint,
  children,
}: {
  hint: string;
  children: ReactNode;
}) {
  const { hideTips } = useProfileHideTips();
  if (hideTips) return <>{children}</>;
  return (
    <span className="inline-flex" title={hint}>
      {children}
    </span>
  );
}
