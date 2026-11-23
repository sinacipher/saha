import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        nationalId: { label: "کد ملی", type: "text" },
        code: { label: "کد تایید", type: "text" },
      },
      authorize: async (credentials) => {
        const { nationalId, code } = credentials as { nationalId: string, code: string }

        if (!nationalId || !/^\d{10}$/.test(nationalId)) return null
        if (!code || !/^\d{5}$/.test(code)) return null

        // پیدا کردن کاربر
        const user = await prisma.user.findUnique({ where: { nationalId } })
        if (!user || !user.isActive) return null

        // بررسی کد OTP
        const otp = await prisma.otp.findFirst({
          where: {
            phone: user.phone,
            expiresAt: { gt: new Date() }
          },
          orderBy: { createdAt: "desc" }
        })

        if (!otp) return null

        if (otp.code !== code) {
          const attempts = otp.attempts + 1
          if (attempts >= 5) {
            await prisma.otp.delete({ where: { id: otp.id } })
          } else {
            await prisma.otp.update({
              where: { id: otp.id },
              data: { attempts }
            })
          }
          return null
        }

        await prisma.otp.deleteMany({ where: { phone: user.phone } })

        return { 
          id: user.id, 
          name: user.fullName, 
          role: user.role, 
          nationalId: user.nationalId 
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
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