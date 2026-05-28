import { useEffect, type CSSProperties, type ReactNode } from "react";
import { lockMessengerPageScroll } from "../../lib/messengerModalBackdrop";

type Props = {
  zIndexClass?: string;
  paddingClass?: string;
  maxWidthClass?: string;
  onBackdropClick?: () => void;
  children: ReactNode;
};

const glassBackdropStyle: CSSProperties = {
  backgroundColor: "rgba(15, 23, 42, 0.14)",
  backdropFilter: "blur(6px) saturate(1.15)",
  WebkitBackdropFilter: "blur(6px) saturate(1.15)",
};

export function MessengerModalBackdrop({
  zIndexClass = "z-[1003]",
  paddingClass = "p-4",
  maxWidthClass = "max-w-md",
  onBackdropClick,
  children,
}: Props) {
  useEffect(() => lockMessengerPageScroll(), []);

  return (
    <div className={`fixed inset-0 ${zIndexClass}`}>
      <div
        className="messenger-modal-backdrop-enter absolute inset-0"
        style={glassBackdropStyle}
        aria-hidden
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && onBackdropClick) onBackdropClick();
        }}
      />
      <div
        className={`pointer-events-none relative z-10 flex min-h-full w-full items-center justify-center ${paddingClass}`}
      >
        <div className={`messenger-modal-panel-enter pointer-events-auto flex w-full ${maxWidthClass} flex-col items-center justify-center`}>
          {children}
        </div>
      </div>
    </div>
  );
}
