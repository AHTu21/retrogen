import { runWeeklyDigestBatch } from "./weeklyDigest.js";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

let started = false;

export function startNotificationScheduler(): void {
  if (started) return;
  if (process.env.RETROGEN_NOTIFICATIONS_SCHEDULER === "false") return;
  started = true;

  const tick = () => {
    void runWeeklyDigestBatch().then((r) => {
      if (r.sent > 0) console.info("[scheduler] weekly digest sent:", r.sent);
    });
  };

  tick();
  setInterval(tick, TWELVE_HOURS_MS);
}
