import type { ProfileMediaStore } from "./profileMediaTypes.js";
import { LocalProfileMediaStore } from "./localProfileMediaStore.js";
import { getS3MediaConfig, S3ProfileMediaStore } from "./s3ProfileMediaStore.js";

let store: ProfileMediaStore | null = null;

export function getProfileMediaStore(): ProfileMediaStore {
  if (store) return store;
  const backend = process.env.RETROGEN_PROFILE_MEDIA_BACKEND?.trim() || "local";
  if (backend === "s3") {
    const cfg = getS3MediaConfig();
    if (cfg) {
      store = new S3ProfileMediaStore(cfg);
      return store;
    }
    console.warn("[profile-media] S3 backend requested but RETROGEN_S3_* incomplete — using local");
  }
  store = new LocalProfileMediaStore();
  return store;
}

export function profileMediaBackendLabel(): "local" | "s3" {
  return getProfileMediaStore() instanceof S3ProfileMediaStore ? "s3" : "local";
}
