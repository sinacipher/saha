-- AlterTable
ALTER TABLE "SimpleExam" ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "resultsPublished" BOOLEAN NOT NULL DEFAULT false;
