import type { AuthUserDto } from "../api";
import type { UserProfilePrefs } from "./profilePrefs";
import { effectiveBoardWallpaper } from "./profilePrefs";
import { resolveProfileNotificationEmail } from "./profileNotificationPrefs";
import { profileHasAvatar } from "./profileMediaCache";
import type { ProfileSectionId } from "./profileSections";

export type ProfileCompletionTask = {
  id: string;
  label: string;
  done: boolean;
  section: ProfileSectionId;
};

export function buildProfileCompletionTasks(
  prefs: UserProfilePrefs,
  authUser: AuthUserDto | null,
): ProfileCompletionTask[] {
  const hasName = !!(prefs.displayName.trim() || authUser?.displayName?.trim());
  const hasBoardStyle = !!(prefs.boardBackdrop.trim() || effectiveBoardWallpaper(prefs));
  const shownEmail = prefs.profileEmail.trim() || authUser?.email?.trim() || "";
  const notifyEmail = resolveProfileNotificationEmail(prefs.profileEmail, authUser?.email);
  const notifyConfigured =
    !!authUser &&
    !!notifyEmail &&
    (prefs.notifications.retroEnded || prefs.notifications.weeklyDigest || prefs.notifications.productUpdates);

  const tasks: ProfileCompletionTask[] = [
    { id: "name", label: "Имя для комнаты", done: hasName, section: "identity" },
    { id: "avatar", label: "Фото профиля", done: profileHasAvatar(prefs), section: "identity" },
    { id: "bio", label: "Коротко «О себе»", done: !!prefs.signature.trim(), section: "identity" },
    { id: "role", label: "Роль или команда", done: !!(prefs.roleTitle.trim() || prefs.teamName.trim()), section: "identity" },
    { id: "contact", label: "Email или контакт", done: !!shownEmail, section: "identity" },
    { id: "status", label: "Эмодзи-статус", done: !!prefs.emojiStatus.trim(), section: "identity" },
    { id: "room", label: "Оформление доски", done: hasBoardStyle, section: "room" },
    { id: "notepad", label: "Заметки в блокноте", done: !!prefs.notepad.trim(), section: "notepad" },
  ];

  if (authUser) {
    tasks.splice(6, 0, {
      id: "notify",
      label: "Email-уведомления",
      done: notifyConfigured,
      section: "notifications",
    });
  }

  return tasks;
}

export function profileCompletionPercent(tasks: ProfileCompletionTask[]): number {
  if (!tasks.length) return 0;
  const done = tasks.filter((t) => t.done).length;
  return Math.round((done / tasks.length) * 100);
}
