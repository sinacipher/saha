import { prisma } from "@/lib/prisma"

export async function isAuthorizedToChat(
  senderId: string,
  senderRole: string,
  receiverId: string
): Promise<boolean> {
  if (senderRole === "ADMIN") return true

  if (!senderId || !receiverId || senderId === receiverId) return false

  if (senderRole === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: senderId },
      select: { counselorId: true },
    })
    return profile?.counselorId === receiverId
  }

  if (senderRole === "PARENT") {
    const profile = await prisma.parentProfile.findUnique({
      where: { userId: senderId },
      include: { student: { select: { counselorId: true } } },
    })
    return profile?.student?.counselorId === receiverId
  }

  if (senderRole === "COUNSELOR") {
    const isAssignedStudent = await prisma.studentProfile.findFirst({
      where: { userId: receiverId, counselorId: senderId },
      select: { id: true },
    })

    if (isAssignedStudent) return true

    const isParentOfAssignedStudent = await prisma.parentProfile.findFirst({
      where: {
        userId: receiverId,
        student: { counselorId: senderId },
      },
      select: { id: true },
    })

    return Boolean(isParentOfAssignedStudent)
  }

  return false
}
