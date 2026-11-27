# ریمو — Persistent simple-exam timer fix

This package targets the `main` branch snapshot of `sinacipher/saha` inspected on 27 November 2026. It changes only the legacy **SimpleExam** flow (`/student/simple-exams`). It does not modify the newer Assessment/ExamAttempt system.

## What changes

- Creates the student's `SimpleExamAttempt` when the exam is first opened.
- Keeps the original `startedAt` and a persisted `deadlineAt` snapshot across refreshes and multiple tabs.
- Uses the persisted deadline, capped by the exam's `endAt`, so later duration edits cannot reset or extend an attempt.
- Restores saved answers after refresh and autosaves each answer to PostgreSQL.
- Uses atomic PostgreSQL JSONB merges for saves and a row lock when finalizing, preventing an autosave/final-submit race.
- Scores only the answers saved on the server. Client-provided answer data is no longer trusted.
- Keeps in-progress attempts out of admin/counselor completed-result reports.
- Preserves existing completed attempts and their submitted timestamps.

## Apply on Windows

1. Back up the project folder and database. This package was built from the current GitHub `main` snapshot; preserve any local-only edits before merging files.
2. Extract this ZIP directly into `F:\Desktop\saha` and allow files to merge/overwrite. Do not extract into an extra nested folder.
3. Open CMD:

```cmd
cd /d F:\Desktop\saha
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\apply-simple-exam-timer-schema.ps1
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Check the `DATABASE_URL` target before running database commands. `migrate status` may correctly report the new migration as pending; that is expected. Stop only if it reports a failed migration or schema-history problem. Then run `migrate deploy`. The migration adds a nullable `deadlineAt` snapshot and removes the default and `NOT NULL` constraint from `SimpleExamAttempt.submittedAt`. Existing completed attempts and their submission timestamps remain intact. Do not use `db push` or reset the database.

## Deployment

Deploy only after the local checks pass. The production database must receive the same migration before the new application code is used. Run `npx prisma migrate deploy` with the production `DATABASE_URL` before or as part of the production release. Do not use `prisma db push` for this change.

## Verification checklist

1. Log in as a student and open an active simple exam.
2. Select several answers and wait until the UI says they are saved.
3. Refresh the browser. The same answers and remaining time must return; time must continue to decrease rather than reset.
4. Open the same exam in a second tab. Both tabs must show the same remaining time.
5. Submit manually before the deadline. The result should appear once; reopening the exam must not start another attempt.
6. In a separate test exam, leave the page open until time expires. It should auto-submit. Refreshing after the deadline should finalize the saved answers and open the result page.
7. Check admin/counselor results: only submitted attempts should be counted.

## Important scope note

The server enforces the deadline and retains saved answers. If the student closes the browser at the deadline, finalization occurs on the next request (for example, when the student reopens the exam); no background cron job is required for preventing extra time or answer loss.

This package was built against the GitHub `main` source snapshot. It has not been run against your live database, and a full Next.js build/test run could not be performed in this environment. Run the checks above before production deployment.
