/**
 * Сброс пароля пользователя в БД (для разработки / если забыли пароль).
 *
 *   cd server
 *   npx tsx scripts/reset-user-password.ts brain.007@bk.ru НовыйПароль123
 *
 * Email приводится к нижнему регистру, как при регистрации.
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/auth/password.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const [, , emailArg, newPassword] = process.argv;
  if (!emailArg || !newPassword) {
    console.error("Использование: npx tsx scripts/reset-user-password.ts <email> <новый_пароль>");
    console.error("Пример: npx tsx scripts/reset-user-password.ts brain.007@bk.ru Secret12345");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error("Пароль не короче 8 символов.");
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.error(`Пользователь не найден: ${email}`);
    process.exit(1);
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  console.log(`Пароль обновлён для ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
