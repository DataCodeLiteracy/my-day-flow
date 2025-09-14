import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { DataProvider } from "@/contexts/DataContext"
import { TimerProvider } from "@/contexts/TimerContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "나의 하루 리포트",
  description: "나만의 하루 흐름을 기록하고 관리해보세요",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang='ko'
      data-theme='light'
      data-color-scheme='blue'
      data-font-size='medium'
    >
      <body className={inter.className}>
        <AuthProvider>
          <SettingsProvider>
            <DataProvider>
              <TimerProvider>{children}</TimerProvider>
            </DataProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
