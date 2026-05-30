/** Id разделов `/profile` — единый источник для lib и pages. */
export type ProfileSectionId =
  | "overview"
  | "identity"
  | "room"
  | "lobby"
  | "notepad"
  | "notifications"
  | "organization"
  | "billing"
  | "security"
  | "danger";

export const DEFAULT_PROFILE_SECTION: ProfileSectionId = "overview";
