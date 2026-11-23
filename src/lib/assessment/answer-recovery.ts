export type CachedAnswer = {
  questionId: string
  optionKey: string | null
  markedForReview: boolean
  updatedAt: number
}

const DATABASE_NAME = "saha-exam-recovery"
const STORE_NAME = "pendingAnswers"

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function cacheAnswer(attemptId: string, answer: CachedAnswer): Promise<void> {
  if (typeof indexedDB === "undefined") return
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    store.put({ key: `${attemptId}:${answer.questionId}`, attemptId, ...answer })
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export async function getPendingAnswers(attemptId: string): Promise<CachedAnswer[]> {
  if (typeof indexedDB === "undefined") return []
  const database = await openDatabase()
  const answers = await new Promise<CachedAnswer[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly")
    const request = transaction.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => {
      const all = request.result as Array<CachedAnswer & { key: string; attemptId: string }>
      resolve(all.filter((answer) => answer.attemptId === attemptId).map((answer) => ({
        questionId: answer.questionId,
        optionKey: answer.optionKey,
        markedForReview: answer.markedForReview,
        updatedAt: answer.updatedAt
      })))
    }
    request.onerror = () => reject(request.error)
  })
  database.close()
  return answers
}

export async function clearPendingAnswer(attemptId: string, questionId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite")
    transaction.objectStore(STORE_NAME).delete(`${attemptId}:${questionId}`)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}
