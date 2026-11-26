import { Prisma } from "@prisma/client"

export type AttemptWithExam = Prisma.SimpleExamAttemptGetPayload<{
  include: { exam: true }
}>

export type ExamWithAttempts = Prisma.SimpleExamGetPayload<{
  include: { attempts: true }
}>

export type ChatWithMessages = Prisma.ChatGetPayload<{
  include: { messages: { include: { sender: true } } }
}>