-- AlterTable
ALTER TABLE "User" ADD COLUMN     "politics" TEXT,
ADD COLUMN     "totalScore" INTEGER NOT NULL DEFAULT 0;
