export type ChatRole = "COUNSELOR" | "STUDENT" | "PARENT"

export function isAssignedChatReceiver(params: {
  role: ChatRole | undefined
  counselorId: string
  studentCounselorId?: string | null
  parentStudentCounselorId?: string | null
}) {
  if (params.role === "STUDENT") {
    return params.studentCounselorId === params.counselorId
  }

  if (params.role === "PARENT") {
    return params.parentStudentCounselorId === params.counselorId
  }

  return false
}

export function normalizeChatText(content: string | undefined): string {
  return content?.trim() || ""
}
