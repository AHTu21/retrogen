import type { ReactNode } from "react";
import type { ProfileSectionId } from "./profileHubTheme";

const iconClass = "h-[1.125rem] w-[1.125rem] shrink-0 opacity-80";

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className={iconClass} aria-hidden>
      {children}
    </span>
  );
}

const ICONS: Record<ProfileSectionId, ReactNode> = {
  overview: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    </Icon>
  ),
  identity: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    </Icon>
  ),
  room: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 4a2 2 0 012-2h3.5A1.5 1.5 0 0110 3.5V4h6a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm8.5 0V3.5a.5.5 0 00-.5-.5H4a.5.5 0 00-.5.5V4h7z" />
      </svg>
    </Icon>
  ),
  lobby: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
      </svg>
    </Icon>
  ),
  notepad: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h8.586a1 1 0 00.707-.293l3.414-3.414A1 1 0 0017 11.586V5a2 2 0 00-2-2H4zm9 1.414L15.586 7H13a1 1 0 01-1-1V4.414zM6 7a1 1 0 000 2h4a1 1 0 100-2H6zm0 4a1 1 0 000 2h6a1 1 0 100-2H6z" />
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
  organization: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm4 1a1 1 0 100 2h4a1 1 0 100-2H8zm0 4a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
      </svg>
    </Icon>
  ),
  billing: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 4H2v6a2 2 0 002 2h12a2 2 0 002-2V8z" />
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
  danger: (
    <Icon>
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 13a1 1 0 100-2 1 1 0 000 2zm-1-4a1 1 0 112 0v2a1 1 0 11-2 0V9z" clipRule="evenodd" />
      </svg>
    </Icon>
  ),
};

export function profileNavIcon(id: ProfileSectionId) {
  return ICONS[id];
}
