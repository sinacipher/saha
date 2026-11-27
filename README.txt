REMO — CHAT SYSTEM AND UI/UX REFRESH

Copy the src folder contents into the project's src folder, preserving the folder structure and replacing existing files.

Files included:
- src/app/api/chat/route.ts
- src/app/api/admin/chats/route.ts
- src/app/admin/chats/AdminChatViewer.tsx
- src/app/admin/chats/page.tsx
- src/app/counselor/students/[id]/page.tsx
- src/app/counselor/students/[id]/ChatUI.tsx
- src/app/student/chat/page.tsx
- src/app/parent/chat/page.tsx
- src/components/chat/ChatWorkspace.tsx (new)
- src/components/ChatUI.tsx
- src/lib/chat-auth.ts

No Prisma schema changes and no new npm dependencies are required.

Behavior:
- Student and parent can chat only with their assigned counselor.
- Counselors can chat with assigned students and parents connected to those students.
- Admin chat panel remains read-only and cannot send messages through the chat API.
- Opening a conversation marks received messages as read.
- Messages are paginated in 50-message pages for regular participants.
- Polling is reduced to 5 seconds and pauses while the browser tab is hidden.
- The chat UI is shared by counselor/student/parent panels and adapts to mobile screens.
- Counselor student chat page lets the counselor switch between the student and their linked parents.

Validation after copying:
  npm run lint
  npx tsc --noEmit
  npm test
  npm run build

Real-time note:
This keeps HTTP polling (5 seconds), not WebSockets. True instant delivery needs a realtime service or persistent socket infrastructure, which is not added here.
