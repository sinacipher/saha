import type { Metadata } from "next"
import { Vazirmatn } from "next/font/google"
import "./globals.css"
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider"

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "ریمو | سامانه هوشمند مشاوره تحصیلی",
    template: "%s | ریمو",
  },
  applicationName: "ریمو",
  description: "سامانه یکپارچه مدیریت مشاوره تحصیلی، ارتباط با خانواده و آزمون‌های آموزشی",
  keywords: ["ریمو", "مشاوره تحصیلی", "کنکور", "آزمون", "کارنامه"],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "ریمو",
    title: "ریمو | سامانه هوشمند مشاوره تحصیلی",
    description: "مدیریت یکپارچه مشاوره، آزمون و عملکرد تحصیلی",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazirmatn.variable} font-sans antialiased`}>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  )
}
