import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getRoomBySlug } from "../rooms.js";
import { readPlaneImageFile, savePlaneImageFile } from "./planeImageStorage.js";

const MAX_BYTES = 4 * 1024 * 1024;

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

type SlugParams = { slug: string };
type ImageParams = { slug: string; imageRef: string };

export function registerPlaneImageRoutes(
  app: FastifyInstance,
  roomUnlockPre: (req: FastifyRequest<{ Params: SlugParams }>, reply: FastifyReply) => Promise<void>,
) {
  app.post<{ Params: SlugParams }>(
    "/api/rooms/:slug/plane-images",
    { preHandler: roomUnlockPre },
    async (req, reply) => {
      const room = await getRoomBySlug(req.params.slug);
      if (!room) return reply.code(404).send({ error: "not_found" });

      const data = await req.file();
      if (!data) return reply.code(400).send({ error: "file_required" });
      const buffer = await data.toBuffer();
      if (buffer.length > MAX_BYTES) return reply.code(413).send({ error: "file_too_large" });
      const mime = data.mimetype || "application/octet-stream";
      if (!mime.startsWith("image/")) return reply.code(400).send({ error: "not_image" });

      try {
        const { imageId, ext } = await savePlaneImageFile(room.id, buffer, mime);
        const url = `/api/rooms/${req.params.slug}/plane-images/${imageId}.${ext}`;
        return reply.code(201).send({ id: imageId, ext, url });
      } catch (e) {
        if (e instanceof Error && e.message === "unsupported_mime") {
          return reply.code(400).send({ error: "unsupported_mime" });
        }
        throw e;
      }
    },
  );

  app.get<{ Params: ImageParams }>(
    "/api/rooms/:slug/plane-images/:imageRef",
    { preHandler: roomUnlockPre },
    async (req, reply) => {
      const room = await getRoomBySlug(req.params.slug);
      if (!room) return reply.code(404).send({ error: "not_found" });

      const ref = req.params.imageRef;
      const dot = ref.lastIndexOf(".");
      if (dot <= 0) return reply.code(404).send({ error: "not_found" });
      const imageId = ref.slice(0, dot);
      const ext = ref.slice(dot + 1).toLowerCase();
      const contentType = EXT_MIME[ext];
      if (!contentType) return reply.code(404).send({ error: "not_found" });

      try {
        const buf = await readPlaneImageFile(room.id, imageId, ext);
        return reply.header("Content-Type", contentType).header("Cache-Control", "public, max-age=86400").send(buf);
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
    },
  );
}
