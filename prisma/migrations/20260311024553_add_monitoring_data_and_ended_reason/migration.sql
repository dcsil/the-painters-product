-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "monitoringData" TEXT;

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "endedReason" TEXT;
