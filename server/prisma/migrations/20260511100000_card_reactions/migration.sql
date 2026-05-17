-- CreateTable
CREATE TABLE "CardReaction" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardReaction_cardId_voterKey_emoji_key" ON "CardReaction"("cardId", "voterKey", "emoji");

-- CreateIndex
CREATE INDEX "CardReaction_roomId_idx" ON "CardReaction"("roomId");

-- CreateIndex
CREATE INDEX "CardReaction_cardId_idx" ON "CardReaction"("cardId");

-- AddForeignKey
ALTER TABLE "CardReaction" ADD CONSTRAINT "CardReaction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardReaction" ADD CONSTRAINT "CardReaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
