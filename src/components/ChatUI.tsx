"use client"

import ChatWorkspace from "@/components/chat/ChatWorkspace"

export default function ChatUI({
  currentUserId,
  receiverId,
  receiverName,
}: {
  currentUserId: string
  receiverId: string
  receiverName: string
}) {
  return (
    <ChatWorkspace
      currentUserId={currentUserId}
      title="گفت‌وگو"
      contacts={[{ id: receiverId, name: receiverName, role: "مشاور" }]}
      initialReceiverId={receiverId}
    />
  )
}
