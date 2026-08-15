-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "title",
ADD COLUMN     "firstUserId" UUID NOT NULL,
ADD COLUMN     "secondUserId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "senderId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_organizationId_firstUserId_secondUserId_key" ON "Conversation"("organizationId", "firstUserId", "secondUserId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
