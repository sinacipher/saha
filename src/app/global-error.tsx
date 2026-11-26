"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[SAHA Global Error]", {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#FFFBEB",
          color: "#1C1917",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #E7E5E4",
            borderRadius: "1rem",
            padding: "2rem",
            textAlign: "center",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚨</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            خطای سیستمی
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#78716C", marginBottom: "1.5rem", lineHeight: 1.7 }}>
            متأسفانه برنامه با مشکل جدی مواجه شده است. لطفاً صفحه را دوباره بارگذاری کنید.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              width: "100%",
              background: "#D97706",
              color: "#FFFFFF",
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            بارگذاری مجدد
          </button>
          {error.digest && (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#A8A29E" }} dir="ltr">
              کد خطا: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}