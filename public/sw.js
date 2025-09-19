// Service Worker for PWA
const CACHE_NAME = "my-day-flow-v1"
const urlsToCache = ["/", "/static/js/bundle.js", "/static/css/main.css"]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})

// Background sync for notifications
self.addEventListener("sync", (event) => {
  if (event.tag === "focus-check") {
    event.waitUntil(
      // 30분마다 집중 상태 확인 알림
      checkFocusStatus()
    )
  }
})

// Check focus status and send notification
async function checkFocusStatus() {
  // 서버에서 타이머 상태 확인
  const response = await fetch("/api/timer-status")
  const data = await response.json()

  if (data.isRunning && !data.isPaused) {
    // 백그라운드에서도 알림 표시
    self.registration.showNotification("집중 상태 확인", {
      body: "지금도 집중하고 계신가요?",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "focus-check",
      requireInteraction: true,
      actions: [
        { action: "focused", title: "집중 중" },
        { action: "not-focused", title: "집중 안함" },
      ],
    })
  }
}

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "focused") {
    // 집중 중 처리
    event.waitUntil(
      fetch("/api/focus-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focused: true }),
      })
    )
  } else if (event.action === "not-focused") {
    // 집중 안함 처리
    event.waitUntil(
      fetch("/api/focus-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focused: false }),
      })
    )
  }

  // 앱 열기
  event.waitUntil(clients.openWindow("/"))
})
