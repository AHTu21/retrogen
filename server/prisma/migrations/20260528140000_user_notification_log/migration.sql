CREATE TABLE "UserNotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refKey" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserNotificationLog_userId_kind_sentAt_idx" ON "UserNotificationLog"("userId", "kind", "sentAt");

ALTER TABLE "UserNotificationLog" ADD CONSTRAINT "UserNotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
