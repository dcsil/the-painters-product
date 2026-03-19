-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "batchId" TEXT;

-- CreateIndex
CREATE INDEX "Upload_batchId_idx" ON "Upload"("batchId");
