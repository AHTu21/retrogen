import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION ?? process.env.PLANE_IMAGE_S3_REGION ?? "us-east-1",
    });
  }
  return client;
}

function bucket(): string {
  const b = process.env.PLANE_IMAGE_S3_BUCKET;
  if (!b) throw new Error("PLANE_IMAGE_S3_BUCKET required");
  return b;
}

function key(roomId: string, imageId: string, ext: string): string {
  const prefix = (process.env.PLANE_IMAGE_S3_PREFIX ?? "plane-images").replace(/\/+$/, "");
  return `${prefix}/${roomId}/${imageId}.${ext}`;
}

export async function s3SavePlaneImage(
  roomId: string,
  imageId: string,
  ext: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key(roomId, imageId, ext),
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=86400",
    }),
  );
}

export async function s3ReadPlaneImage(roomId: string, imageId: string, ext: string): Promise<Buffer> {
  const res = await s3().send(
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key(roomId, imageId, ext),
    }),
  );
  const body = res.Body;
  if (!body) throw new Error("not_found");
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
