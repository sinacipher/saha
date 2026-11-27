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
    console.error("[REMO Global Error]", {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F3F7F7", color: "#102A32", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <main style={{ maxWidth: "28rem", width: "100%", background: "#FFFFFF", border: "1px solid #DCE7E9", borderRadius: "1.25rem", padding: "2rem", textAlign: "center", boxShadow: "0 12px 30px rgba(16,42,50,.10)" }}>
          <div style={{ width: "3.5rem", height: "3.5rem", margin: "0 auto 1rem", borderRadius: "1rem", background: "#CCFBF1", color: "#0F766E", display: "grid", placeItems: "center", fontSize: "1.7rem", fontWeight: 800 }}>ر</div>
          <p style={{ color: "#0F766E", fontWeight: 800, marginBottom: ".4rem" }}>ریمو</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: ".5rem" }}>خطای سیستمی</h1>
          <p style={{ fontSize: ".875rem", color: "#647780", marginBottom: "1.5rem", lineHeight: 1.8 }}>برنامه با مشکل غیرمنتظره‌ای مواجه شد. می‌توانید بارگذاری مجدد را امتحان کنید.</p>
          <button type="button" onClick={reset} style={{ width: "100%", background: "#0F766E", color: "#FFFFFF", padding: ".8rem 1rem", borderRadius: ".75rem", fontSize: ".9rem", fontWeight: 700, border: "none", cursor: "pointer" }}>بارگذاری مجدد</button>
          {error.digest && <p style={{ marginTop: "1rem", fontSize: ".75rem", color: "#94A3A8" }} dir="ltr">کد خطا: {error.digest}</p>}
        </main>
      </body>
    </html>
  )
}
