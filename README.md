# SAHA (سحا) - Educational Management Platform

SAHA is a comprehensive educational management platform designed for Konkur counseling, featuring role-based access for Admins, Counselors, Students, and Parents.

## Technology Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (Strict mode)
- **Database ORM:** Prisma 6
- **Database:** PostgreSQL (Neon)
- **Authentication:** NextAuth.js v5 (OTP based)
- **Styling:** Tailwind CSS v4
- **Testing:** Vitest

## Getting Started

### Prerequisites
- Node.js 20+
- A PostgreSQL database (Neon recommended)

### Installation
1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in the values.
4. Run `npx prisma migrate deploy` (for production) or `npx prisma migrate dev` (for development).
5. Run `npx prisma generate`
6. Start the development server: `npm run dev`

### Environment Variables
Refer to `.env.example`. The `SMS_API_KEY` is required for production OTP delivery. In development, OTP codes are logged to the terminal.

## Database Workflow
This project uses Prisma migrations. 
- **Development:** `npx prisma migrate dev --name migration_name`
- **Production:** `npx prisma migrate deploy`

## Testing
- Run all tests: `npm test`
- Run specific test: `npx vitest run src/lib/chat-auth.test.ts`

## Production Build
Run `npm run build` to create the optimized production build.

## Known Limitations
- SMS integration requires a valid provider API key (Kavenegar/SMS.ir).
- Advanced PDF/DOCX exports for exam results are not yet implemented.
- Real-time chat uses 3-second polling instead of WebSockets to maintain serverless compatibility.