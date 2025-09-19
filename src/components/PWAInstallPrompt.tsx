"use client"

import { useState, useEffect } from "react"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("✅ PWA 설치 완료")
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
  }

  if (!showInstallPrompt) return null

  return (
    <div className='fixed bottom-4 left-4 right-4 bg-theme-secondary border border-theme-primary/20 rounded-lg p-4 shadow-lg z-50'>
      <div className='flex items-start gap-3'>
        <div className='flex-1'>
          <h3 className='text-sm font-semibold text-theme-primary mb-1'>
            📱 앱으로 설치하세요
          </h3>
          <p className='text-xs text-theme-secondary mb-2'>
            앱으로 설치하면 백그라운드에서도 알림을 받을 수 있습니다
          </p>
          <div className='flex gap-2'>
            <button
              onClick={handleInstallClick}
              className='flex items-center gap-1 bg-accent-theme hover:bg-accent-theme-secondary text-white px-3 py-1 rounded text-xs transition-colors'
            >
              <Download className='h-3 w-3' />
              설치
            </button>
            <button
              onClick={handleDismiss}
              className='text-theme-tertiary hover:text-theme-secondary text-xs'
            >
              나중에
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className='text-theme-tertiary hover:text-theme-secondary'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}
