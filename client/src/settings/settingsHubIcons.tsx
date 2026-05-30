import type { ReactNode } from "react";
import type { SettingsSectionId } from "./settingsHubTypes";

const iconClass = "h-[1.125rem] w-[1.125rem] shrink-0 opacity-80";

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className={iconClass} aria-hidden>
      {children}
    </span>
  );
}

const ICONS: Record<SettingsSectionId, ReactNode> = {
  general: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.885.216 2.015-.948 2.286-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.948 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    </Icon>
  ),
  profile: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    </Icon>
  ),
  board: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 4a2 2 0 012-2h3.5A1.5 1.5 0 0110 3.5V4h6a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm8.5 0V3.5a.5.5 0 00-.5-.5H4a.5.5 0 00-.5.5V4h7z" />
      </svg>
    </Icon>
  ),
  chat: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H7l-4 3v-3H4a2 2 0 01-2-2V5z" />
      </svg>
    </Icon>
  ),
  notifications: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
    </Icon>
  ),
  security: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
    </Icon>
  ),
  workshop: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </Icon>
  ),
};

export function settingsHubIcon(id: SettingsSectionId) {
  return ICONS[id];
}
