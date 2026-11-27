SAHA — COUNSELOR / ADMIN EXAM SYNC

This bundle aligns the exam workflow in the admin and counselor panels.
It is based on the current main-branch files inspected on 27 November 2026.

WHAT THIS FIXES
1. Counselors can see all tests created in the system, including tests created by administrators.
2. The counselor panel uses the same exam manager as the admin panel, including a direct question-file download link.
3. Counselors can create tests and include a student-visible information/instructions text.
4. Instructions are saved in the existing SimpleExam.instructions database column and shown in counselor, student list, and student test pages.
5. Counselors can download question files for all visible exams.
6. Counselors can see analytics and detailed answer results only for students assigned to them through StudentProfile.counselorId.
7. Admin keeps global results and delete permissions. The delete action remains admin-only.
8. The dashboard menu label is updated to show exam management rather than only exam creation.

NO PRISMA MIGRATION IS REQUIRED.
The current schema already contains SimpleExam.instructions. The existing migration
20261126153731_add_exam_instructions_and_publish adds it.

INSTALL
1. Stop the local Next.js server with Ctrl+C.
2. Extract this ZIP directly into F:\Desktop\saha and allow overwriting existing files.
   The ZIP contains the src folder structure.
3. Open CMD and run:

   cd /d F:\Desktop\saha
   npm run lint
   npx tsc --noEmit
   npm run build

4. If all checks pass, start the app:

   npm run dev

5. Test these routes:
   /admin/simple-exams
   /counselor/simple-exams
   /student/simple-exams

IMPORTANT
- Existing tests with instructions = NULL will simply show no information text.
- Counselors see all exam definitions. Their result tables are restricted to students
  assigned to their account in StudentProfile.counselorId.
- Only ADMIN can delete an exam. The UI sends DELETE to the existing
  /api/simple-exams/{id}/file endpoint.
- This bundle updates only the exam-related files and dashboard navigation.
  It does not replace unrelated parts of the SAHA project.
- The files have been assembled against the current GitHub main source, but this
  environment cannot run your project against your local DATABASE_URL. Run the
  lint, TypeScript, and build checks locally before committing.

COMMIT
   git add .
   git commit -m "Sync counselor and admin exam management"
   git push origin main
