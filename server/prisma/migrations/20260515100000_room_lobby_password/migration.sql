-- Room visibility in public lobby and optional join password (bcrypt hash).
ALTER TABLE "Room" ADD COLUMN "listedInLobby" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Room" ADD COLUMN "joinPasswordHash" TEXT;
