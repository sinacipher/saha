SAHA — Mobile User Management + Academic Performance Update

WHAT IS INCLUDED

1) Admin user management on mobile
- Replaces the fixed, clipped mobile user table with responsive user cards.
- Every user card displays full name, role, national ID, phone, active status, edit and activate/deactivate controls.
- Desktop keeps a horizontally scrollable table.
- User dialogs scroll within the mobile viewport.
- Activation/deactivation uses the project's custom confirmation dialog and notifications.

2) Academic performance reports
- /admin/performance: all students and all file-based simple-exam results.
- /counselor/performance: only students assigned to the signed-in counselor.
- /parent/performance: only the child linked to the signed-in parent.
- Admin, counselor and parent dashboard home pages now show performance summaries.
- Dashboard navigation includes the relevant report for each role.
- Reports show submitted attempts, average percentage, highest percentage, correct, incorrect and unanswered counts, and each exam result.

3) Shared exam visibility and instructions
- Counselors can see tests created by admins and other counselors.
- Counselors can create tests and add an instruction text for students.
- The API now saves and returns the instruction text.
- Student exam list and test-taking page show the instruction text.
- Counselors can download the question file for shared exams.
- Counselor-specific exam results are restricted to students assigned to that counselor.
- Admin-only analytics and delete permissions remain admin-only.
- Both DELETE /api/simple-exams/[id] and the older /file DELETE route are supported.

FILES

src/app/admin/page.tsx
src/app/admin/performance/page.tsx
src/app/admin/simple-exams/page.tsx
src/app/admin/simple-exams/[id]/analytics/page.tsx
src/app/admin/users/UserManager.tsx
src/app/api/simple-exams/route.ts
src/app/api/simple-exams/[id]/route.ts
src/app/api/simple-exams/[id]/file/route.ts
src/app/api/simple-exams/[id]/analytics/route.ts
src/app/counselor/page.tsx
src/app/counselor/performance/page.tsx
src/app/counselor/simple-exams/page.tsx
src/app/counselor/simple-exams/[id]/submissions/page.tsx
src/app/parent/page.tsx
src/app/parent/performance/page.tsx
src/app/student/simple-exams/page.tsx
src/app/student/simple-exams/[id]/page.tsx
src/app/student/simple-exams/[id]/ExamUI.tsx
src/components/dashboard/dashboard-shell.tsx
src/components/performance/PerformanceDashboard.tsx
src/lib/simple-exam-performance.ts

INSTALLATION

1. Stop the local Next.js server with Ctrl+C.
2. Extract this ZIP into the project root (for example F:\Desktop\saha).
3. Allow the existing files to be replaced.
4. Run:

   npm run lint
   npx tsc --noEmit
   npm run build

5. If all checks pass, commit and push:

   git add .
   git commit -m "Add academic performance reports and responsive user management"
   git push origin main

DATABASE

No Prisma schema changes or database migration are required. The update uses the existing SimpleExam.instructions field and SimpleExamAttempt records.

REPORT SCOPE

The performance summaries in this package are based on the existing file-based SimpleExamAttempt system. The separate AssessmentResult schema is not included because the current repository does not expose an active assessment-test submission flow through these panels.

VALIDATION

All 21 TypeScript/TSX files were syntax-parsed successfully. A full Next.js build and database-backed runtime test were not run in this isolated package workspace; run the commands above in the actual project before deployment.
