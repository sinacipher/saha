export type SectionTiming = {
  sectionId: string
  startedAt: string
  expiresAt: string
}

export function buildSectionTimings(
  sections: Array<{ id: string; durationSeconds: number | null }>,
  overallStartedAt: Date
): SectionTiming[] {
  let cursor = overallStartedAt.getTime()
  return sections.map((section) => {
    const startedAt = new Date(cursor)
    const durationSeconds = section.durationSeconds
    const expiresAt = durationSeconds
      ? new Date(cursor + durationSeconds * 1000)
      : new Date(cursor)
    cursor = expiresAt.getTime()
    return {
      sectionId: section.id,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    }
  })
}

export function getSectionDeadline(timing: SectionTiming[] | undefined, sectionId: string): Date | null {
  const match = timing?.find((item) => item.sectionId === sectionId)
  return match ? new Date(match.expiresAt) : null
}
