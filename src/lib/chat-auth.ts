import { prisma } from "@/lib/prisma"

export async function isAuthorizedToChat(
  senderId: string, 
  senderRole: string, 
  receiverId: string
): Promise<boolean> {
  // 1. Admin can monitor everything
  if (senderRole === "ADMIN") return true

  // 2. Student can only chat with their assigned counselor
  if (senderRole === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: senderId },
      select: { counselorId: true }
    })
    return profile?.counselorId === receiverId
  }

  // 3. Parent can only chat with the counselor of their linked student
  if (senderRole === "PARENT") {
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: senderId },
      include: { student: { select: { counselorId: true } } }
    })
    return parentProfile?.student?.counselorId === receiverId
  }

  // 4. Counselor can only chat with their assigned students OR parents of those students
  if (senderRole === "COUNSELOR") {
    // Check if receiver is an assigned student
    const isStudent = await prisma.studentProfile.findFirst({
      where: { userId: receiverId, counselorId: senderId }
    })
    if (isStudent) return true

    // Check if receiver is a parent of an assigned student
    const isParent = await prisma.parentProfile.findFirst({
      where: {
        userId: receiverId,
        student: { counselorId: senderId }
      }
    })
    if (isParent) return true

    return false
  }

  return false
}