/** Sum unread messages for a participant set without double-counting IDs. */
export function countUnreadMessagesForParticipants(
  participantUserIds: readonly string[],
  unreadBySender: ReadonlyMap<string, number>,
): number {
  let total = 0
  const uniqueIds = new Set(participantUserIds)

  for (const userId of uniqueIds) {
    const count = unreadBySender.get(userId) ?? 0
    if (Number.isFinite(count) && count > 0) total += count
  }

  return total
}
