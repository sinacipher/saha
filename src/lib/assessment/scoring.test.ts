import { describe, expect, it } from "vitest"
import { calculateAssessmentScore } from "./scoring"

const rule = {
  correctPoints: 3,
  incorrectPenalty: -1,
  unansweredPoints: 0,
  roundingPrecision: 2
}

describe("calculateAssessmentScore", () => {
  it("matches the Konkur default formula for 20 correct, 6 incorrect, and 4 unanswered", () => {
    const questions = Array.from({ length: 30 }, (_, index) => ({
      id: `q-${index + 1}`,
      subjectId: "subject-1",
      options: [{ optionKey: "A", isCorrect: true }, { optionKey: "B", isCorrect: false }]
    }))

    const answers: Record<string, string | null> = {}
    questions.forEach((question, index) => {
      if (index < 20) answers[question.id] = "A"
      else if (index < 26) answers[question.id] = "B"
    })

    const result = calculateAssessmentScore([
      { id: "section-1", title: "Section", questions }
    ], answers, rule)

    expect(result.correctAnswers).toBe(20)
    expect(result.incorrectAnswers).toBe(6)
    expect(result.unansweredAnswers).toBe(4)
    expect(result.rawScore).toBe(54)
    expect(result.percentage).toBe(60)
  })

  it("supports custom positive and negative subject coefficients at result level", () => {
    const result = calculateAssessmentScore([
      {
        id: "section-1",
        title: "Section",
        questions: [
          { id: "q1", subjectId: "subject-1", options: [{ optionKey: "C", isCorrect: true }] },
          { id: "q2", subjectId: "subject-1", options: [{ optionKey: "D", isCorrect: true }] }
        ]
      }
    ], { q1: "C", q2: "A" }, {
      correctPoints: 2,
      incorrectPenalty: -0.5,
      unansweredPoints: 0,
      roundingPrecision: 1
    })

    expect(result.correctAnswers).toBe(1)
    expect(result.incorrectAnswers).toBe(1)
    expect(result.rawScore).toBe(1.5)
    expect(result.percentage).toBe(37.5)
  })

  it("clamps percentage to zero and never returns above 100", () => {
    const result = calculateAssessmentScore([
      {
        id: "section-1",
        title: "Section",
        questions: [{ id: "q1", subjectId: null, options: [{ optionKey: "A", isCorrect: true }] }]
      }
    ], { q1: "B" }, rule)

    expect(result.percentage).toBe(0)
  })
})
