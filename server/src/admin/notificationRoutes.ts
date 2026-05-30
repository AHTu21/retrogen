import type { FastifyInstance } from "fastify";
import { getBearerUser } from "../auth/routes.js";
import { profileMediaBackendLabel } from "../storage/profileMediaStoreFactory.js";
import { runProductUpdatesBroadcast } from "../notifications/productUpdates.js";
import { runWeeklyDigestBatch } from "../notifications/weeklyDigest.js";

async function requireAdmin(req: { headers: { authorization?: string } }) {
  const u = await getBearerUser(req);
  if (!u || u.globalRole !== "admin") return null;
  return u;
}

export function registerAdminNotificationRoutes(app: FastifyInstance) {
  app.get("/api/admin/notifications/status", async (req, reply) => {
    if (!(await requireAdmin(req))) return reply.code(403).send({ error: "forbidden" });
    return {
      mediaBackend: profileMediaBackendLabel(),
      scheduler: process.env.RETROGEN_NOTIFICATIONS_SCHEDULER !== "false",
    };
  });

  app.post<{ Body: { force?: boolean } }>("/api/admin/notifications/weekly-digest", async (req, reply) => {
    if (!(await requireAdmin(req))) return reply.code(403).send({ error: "forbidden" });
    const result = await runWeeklyDigestBatch({ force: req.body?.force === true });
    return result;
  });

  app.post<{ Body: { subject?: string; body?: string; refKey?: string } }>(
    "/api/admin/notifications/product-updates",
    async (req, reply) => {
      if (!(await requireAdmin(req))) return reply.code(403).send({ error: "forbidden" });
      const subject = typeof req.body?.subject === "string" ? req.body.subject : "";
      const body = typeof req.body?.body === "string" ? req.body.body : "";
      if (!body.trim()) return reply.code(400).send({ error: "body_required" });
      const result = await runProductUpdatesBroadcast({
        subject,
        body,
        refKey: typeof req.body?.refKey === "string" ? req.body.refKey : undefined,
      });
      return result;
    },
  );
}
