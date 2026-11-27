-- Add a per-attempt deadline snapshot. Existing completed attempts remain unchanged.
ALTER TABLE "SimpleExamAttempt"
  ADD COLUMN "deadlineAt" TIMESTAMP(3),
  ALTER COLUMN "submittedAt" DROP DEFAULT,
  ALTER COLUMN "submittedAt" DROP NOT NULL;
