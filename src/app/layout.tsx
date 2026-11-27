import type { Metadata } from "next"
import { Vazirmatn } from "next/font/google"
import "./globals.css"
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider"

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
})

export const metadata: Metadata = {
  title: "سحا | پلتفرم مشاوره و کنکور",
  description: "سیستم مدیریت مشاوره تحصیلی و کنکور",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body
        suppressHydrationWarning
        className={`${vazirmatn.variable} font-sans antialiased`}
      >
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  )
}