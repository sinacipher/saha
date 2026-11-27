import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

const OTP_SECRET = process.env.AUTH_SECRET || "fallback-secret"

export const { handlers, auth, signIn, signOut } = NextAuth({
    trustHost: true,
  providers: [
    Credentials({
      credentials: {
        nationalId: { label: "کد ملی", type: "text" },
        code: { label: "کد تایید", type: "text" },
      },
      authorize: async (credentials) => {
        const { nationalId, code } = credentials as { nationalId: string, code: string }
        if (!nationalId || !code) return null

        const user = await prisma.user.findUnique({ where: { nationalId } })
        if (!user || !user.isActive) return null

        const otp = await prisma.otp.findFirst({
          where: { phone: user.phone, expiresAt: { gt: new Date() } }
        })

        if (!otp) return null

        // 1. Verify Hashing
        const hashedInput = crypto.createHmac("sha256", OTP_SECRET).update(code).digest("hex")
        
        if (otp.hashedCode !== hashedInput) {
          // Increment failed attempts
          await prisma.otp.update({
            where: { id: otp.id },
            data: { attempts: { increment: 1 } }
          })
          // Delete if too many attempts
          if (otp.attempts >= 4) {
            await prisma.otp.delete({ where: { id: otp.id } })
          }
          return null
        }

        // Success: Delete OTP
        await prisma.otp.delete({ where: { id: otp.id } })

        return { id: user.id, name: user.fullName, role: user.role, nationalId: user.nationalId }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      } else if (token.id) {
        // 2. Session Revocation & Role Sync
        // We query the DB on every JWT verification. To optimize, you can 
        // cache this or only check every X minutes, but for strict security, 
        // we verify the user is still active and their role hasn't changed.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isActive: true, role: true }
        })
        
        if (!dbUser || !dbUser.isActive) {
          return null // Revoke session entirely
        }
        
        // Sync role changes (e.g., if student became counselor)
        token.role = dbUser.role
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  }
})