export type ScoringRule = {
  correctPoints: number
  incorrectPenalty: number
  unansweredPoints: number
  roundingPrecision: number
}

export type ScoringQuestion = {
  id: string
  subjectId: string | null
  options: Array<{ optionKey: string; isCorrect?: boolean }>
}

export type ScoringSection = {
  id: string
  title: string
  questions: ScoringQuestion[]
}

export type ScoringResult = {
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  unansweredAnswers: number
  rawScore: number
  percentage: number
  subjectScoresJson: Record<string, { correct: number; incorrect: number; unanswered: number; score: number }>
  sectionScoresJson: Record<string, { correct: number; incorrect: number; unanswered: number; score: number }>
}

export function calculateAssessmentScore(
  sections: ScoringSection[],
  answers: Record<string, string | null>,
  rule: ScoringRule
): ScoringResult {
  let correctAnswers = 0
  let incorrectAnswers = 0
  let unansweredAnswers = 0
  let rawScore = 0

  const sectionScoresJson: ScoringResult["sectionScoresJson"] = {}
  const subjectScoresJson: ScoringResult["subjectScoresJson"] = {}

  for (const section of sections) {
    let sectionCorrect = 0
    let sectionIncorrect = 0
    let sectionUnanswered = 0
    let sectionRaw = 0

    for (const question of section.questions) {
      const selected = answers[question.id] || null
      const correctOption = question.options.find((option) => option.isCorrect)

      if (!selected) {
        unansweredAnswers++
        sectionUnanswered++
        sectionRaw += rule.unansweredPoints
        rawScore += rule.unansweredPoints
      } else if (selected === correctOption?.optionKey) {
        correctAnswers++
        sectionCorrect++
        sectionRaw += rule.correctPoints
        rawScore += rule.correctPoints
      } else {
        incorrectAnswers++
        sectionIncorrect++
        sectionRaw += rule.incorrectPenalty
        rawScore += rule.incorrectPenalty
      }

      if (question.subjectId) {
        const subject = subjectScoresJson[question.subjectId] || {
          correct: 0,
          incorrect: 0,
          unanswered: 0,
          score: 0
        }

        if (!selected) {
          subject.unanswered++
          subject.score += rule.unansweredPoints
        } else if (selected === correctOption?.optionKey) {
          subject.correct++
          subject.score += rule.correctPoints
        } else {
          subject.incorrect++
          subject.score += rule.incorrectPenalty
        }

        subjectScoresJson[question.subjectId] = subject
      }
    }

    sectionScoresJson[section.id] = {
      correct: sectionCorrect,
      incorrect: sectionIncorrect,
      unanswered: sectionUnanswered,
      score: sectionRaw
    }
  }

  const totalQuestions = correctAnswers + incorrectAnswers + unansweredAnswers
  const maxRawScore = totalQuestions * rule.correctPoints
  const percentage = maxRawScore > 0
    ? Math.max(0, Math.min(100, (rawScore / maxRawScore) * 100))
    : 0

  return {
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    unansweredAnswers,
    rawScore,
    percentage: Number(percentage.toFixed(rule.roundingPrecision)),
    subjectScoresJson,
    sectionScoresJson
  }
}
