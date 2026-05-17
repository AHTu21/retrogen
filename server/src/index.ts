import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { attachSocket } from "./socket.js";
import { registerRoutes } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "..", ".env") });

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  const io = attachSocket(app.server);
  await registerRoutes(app, io);

  const clientDist = path.resolve(__dirname, "../../client/dist");
  if (process.env.NODE_ENV === "production") {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: "/",
    });
    app.setNotFoundHandler(async (req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api") && !req.url.startsWith("/socket.io")) {
        const html = await fs.readFile(path.join(clientDist, "index.html"), "utf-8");
        return reply.type("text/html").send(html);
      }
      return reply.code(404).send({ error: "not_found" });
    });
  }

  await app.listen({ port, host });
  app.log.info(`Retrogen server http://${host}:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
