// PWA 관련 유틸리티 함수들

export const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      console.log("✅ Service Worker 등록 완료:", registration)
      return registration
    } catch (error) {
      console.error("❌ Service Worker 등록 실패:", error)
      return null
    }
  }
  return null
}

export const requestNotificationPermission = async () => {
  if ("Notification" in window) {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }
  return false
}

export const isPWAInstalled = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  )
}

export const showInstallPrompt = () => {
  // PWA 설치 프롬프트 표시
  const event = new CustomEvent("show-install-prompt")
  window.dispatchEvent(event)
}
