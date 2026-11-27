"use client"

import ChatWorkspace from "@/components/chat/ChatWorkspace"

type ChatStudent = {
  id: string
  fullName: string | null
}

type ChatParent = {
  user: {
    id: string
    fullName: string | null
  }
}

export default function ChatUI({
  counselorId,
  student,
  parents,
}: {
  counselorId: string
  student: ChatStudent
  parents: ChatParent[]
}) {
  const contacts = [
    {
      id: student.id,
      name: student.fullName || "دانش‌آموز",
      role: "دانش‌آموز",
    },
    ...parents.map((parent) => ({
      id: parent.user.id,
      name: parent.user.fullName || "والد",
      role: "والدین دانش‌آموز",
    })),
  ]

  return (
    <ChatWorkspace
      currentUserId={counselorId}
      contacts={contacts}
      title="ارتباط با خانواده"
      initialReceiverId={student.id}
    />
  )
}
