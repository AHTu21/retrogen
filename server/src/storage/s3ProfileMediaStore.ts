import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ProfileMediaKind } from "../auth/profileMediaMime.js";
import { extForMime, mimeFromExt, type ProfileMediaReadResult, type ProfileMediaStore } from "./profileMediaTypes.js";

export type S3MediaConfig = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  /** Публичная база CDN без слэша на конце, напр. https://cdn.example.com/profile-media */
  publicBaseUrl?: string;
};

function s3Key(userId: string, kind: ProfileMediaKind, ext: string): string {
  return `profile-media/${userId}/${kind}${ext}`;
}

export class S3ProfileMediaStore implements ProfileMediaStore {
  private client: S3Client;
  constructor(private cfg: S3MediaConfig) {
    this.client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint || undefined,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: !!cfg.endpoint,
    });
  }

  private publicUrl(key: string): string | undefined {
    if (!this.cfg.publicBaseUrl) return undefined;
    return `${this.cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }

  async save(userId: string, kind: ProfileMediaKind, buffer: Buffer, mime: string): Promise<void> {
    const ext = extForMime(mime);
    const key = s3Key(userId, kind, ext);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
        CacheControl: "private, max-age=3600",
      }),
    );
    for (const old of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
      if (old === ext) continue;
      await this.client
        .send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: s3Key(userId, kind, old) }))
        .catch(() => undefined);
    }
  }

  async read(userId: string, kind: ProfileMediaKind): Promise<ProfileMediaReadResult | null> {
    for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
      const key = s3Key(userId, kind, ext);
      const pub = this.publicUrl(key);
      if (pub) {
        try {
          await this.client.send(new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
          return { buffer: Buffer.alloc(0), mime: mimeFromExt(ext), publicUrl: pub };
        } catch {
          continue;
        }
      }
      try {
        const res = await this.client.send(new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
        const bytes = await res.Body?.transformToByteArray();
        if (!bytes) continue;
        return {
          buffer: Buffer.from(bytes),
          mime: res.ContentType ?? mimeFromExt(ext),
          publicUrl: pub,
        };
      } catch {
        /* try next ext */
      }
    }
    return null;
  }

  async delete(userId: string, kind: ProfileMediaKind): Promise<void> {
    for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
      await this.client
        .send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: s3Key(userId, kind, ext) }))
        .catch(() => undefined);
    }
  }
}

export function getS3MediaConfig(): S3MediaConfig | null {
  const bucket = process.env.RETROGEN_S3_BUCKET?.trim();
  if (!bucket) return null;
  const region = process.env.RETROGEN_S3_REGION?.trim() || "us-east-1";
  const accessKeyId = process.env.RETROGEN_S3_ACCESS_KEY?.trim() ?? "";
  const secretAccessKey = process.env.RETROGEN_S3_SECRET_KEY?.trim() ?? "";
  if (!accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint: process.env.RETROGEN_S3_ENDPOINT?.trim() || undefined,
    publicBaseUrl: process.env.RETROGEN_PROFILE_MEDIA_CDN_URL?.trim() || undefined,
  };
}
