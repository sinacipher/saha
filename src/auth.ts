import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import {
  normalizeNationalId,
  normalizeDigits,
  isValidNationalIdFormat,
  nationalIdVariants,
} from "@/lib/national-id"

const OTP_SECRET = process.env.AUTH_SECRET

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,

  providers: [
    Credentials({
      credentials: {
        nationalId: {
          label: "کد ملی",
          type: "text",
        },
        code: {
          label: "کد تایید",
          type: "text",
        },
      },

      authorize: async (credentials) => {
        if (!OTP_SECRET) {
          console.error("AUTH_SECRET is missing")
          return null
        }

        const rawNationalId = String(credentials?.nationalId || "")
        const rawCode = String(credentials?.code || "")

        const nationalId = normalizeNationalId(rawNationalId)
        const code = normalizeDigits(rawCode).replace(/\D/g, "")

        if (
          !isValidNationalIdFormat(nationalId) ||
          !/^\d{5}$/.test(code)
        ) {
          return null
        }

        const user = await prisma.user.findFirst({
          where: {
            nationalId: {
              in: nationalIdVariants(nationalId),
            },
          },
        })

        if (!user || !user.isActive) {
          return null
        }

        const otp = await prisma.otp.findFirst({
          where: {
            phone: user.phone,
            expiresAt: { gt: new Date() },
          },
          orderBy: {
            createdAt: "desc",
          },
        })

        if (!otp || otp.attempts >= 5) {
          return null
        }

        const hashedInput = crypto
          .createHmac("sha256", OTP_SECRET)
          .update(code)
          .digest("hex")

        const storedHash = Buffer.from(otp.hashedCode, "hex")
        const inputHash = Buffer.from(hashedInput, "hex")

        const isCorrect =
          storedHash.length === inputHash.length &&
          crypto.timingSafeEqual(storedHash, inputHash)

        if (!isCorrect) {
          const updated = await prisma.otp.update({
            where: { id: otp.id },
            data: {
              attempts: { increment: 1 },
            },
          })

          if (updated.attempts >= 5) {
            await prisma.otp.delete({
              where: { id: otp.id },
            })
          }

          return null
        }

        await prisma.otp.delete({
          where: { id: otp.id },
        })

        return {
          id: user.id,
          name: user.fullName,
          role: user.role,
          nationalId: user.nationalId,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: {
            id: token.id as string,
          },
          select: {
            isActive: true,
            role: true,
          },
        })

        if (!dbUser || !dbUser.isActive) {
          return null
        }

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
    },
  },

  pages: {
    signIn: "/login",
  },
})