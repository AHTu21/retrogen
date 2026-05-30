import type { AuthUserDto } from "../api";
import { pullCloudProfileIntoLocal } from "./profileCloudSync";
import { loadProfilePrefs } from "./profilePrefs";

/** Подтянуть облако в localStorage, если нет локального черновика. */
export async function pullProfileCloudIfIdle(
  authUser: AuthUserDto,
  isDirty: boolean,
): Promise<"merged" | "noop" | "offline" | "conflict"> {
  if (isDirty) return "noop";
  const local = loadProfilePrefs();
  const result = await pullCloudProfileIntoLocal(authUser, local, false);
  if (result.kind === "noop" && result.offline) return "offline";
  if (result.kind === "conflict") return "conflict";
  if (result.kind === "merged" && result.pulled) return "merged";
  return "noop";
}
