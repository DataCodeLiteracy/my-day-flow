"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, Play, Plus } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useTimer } from "@/contexts/TimerContext"
import { ActivityItem, TimerSession } from "@/types/activity"

export default function HygienePage() {
  const router = useRouter()
  const { userUid, isLoggedIn, loading } = useAuth()
  const { timerState, startTimer, pauseTimer, resumeTimer, stopTimer } =
    useTimer()

  const [todaySessions, setTodaySessions] = useState<TimerSession[]>([])
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<{
    itemId: string
    name: string
  } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // 씻기 관련 활동 아이템들
  const hygieneActivities = [
    {
      id: "brushing_teeth",
      name: "양치하기",
      description: "치아 청결 관리",
      estimatedDuration: 5,
      icon: "🦷",
    },
    {
      id: "face_washing",
      name: "세수하기",
      description: "얼굴 세정",
      estimatedDuration: 3,
      icon: "🧼",
    },
    {
      id: "bathing",
      name: "목욕하기",
      description: "전신 세정",
      estimatedDuration: 20,
      icon: "🛁",
    },
    {
      id: "showering",
      name: "샤워하기",
      description: "빠른 전신 세정",
      estimatedDuration: 10,
      icon: "🚿",
    },
    {
      id: "hair_washing",
      name: "머리 감기",
      description: "두발 세정",
      estimatedDuration: 15,
      icon: "💧",
    },
    {
      id: "skincare",
      name: "스킨케어",
      description: "피부 관리",
      estimatedDuration: 10,
      icon: "✨",
    },
  ]

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  // 타이머 경과 시간 업데이트
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      interval = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor(
          (now.getTime() - timerState.startTime!.getTime()) / 1000
        )
        setElapsedTime(elapsed - timerState.pausedTime)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [
    timerState.isRunning,
    timerState.isPaused,
    timerState.startTime,
    timerState.pausedTime,
  ])

  // 활동 시작
  const handleStartActivity = async (itemId: string, name: string) => {
    try {
      setSelectedActivity({ itemId, name })
      await startTimer(itemId, "hygiene")
      setIsTimerModalOpen(true)
    } catch (error) {
      console.error("Error starting activity:", error)
    }
  }

  // 타이머 일시정지
  const handlePauseTimer = async () => {
    try {
      await pauseTimer()
    } catch (error) {
      console.error("Error pausing timer:", error)
    }
  }

  // 타이머 재개
  const handleResumeTimer = async () => {
    try {
      await resumeTimer()
    } catch (error) {
      console.error("Error resuming timer:", error)
    }
  }

  // 타이머 완료
  const handleCompleteTimer = async () => {
    try {
      await stopTimer(true)
      setIsTimerModalOpen(false)
      setSelectedActivity(null)
      setElapsedTime(0)
    } catch (error) {
      console.error("Error completing timer:", error)
    }
  }

  // 타이머 취소
  const handleCancelTimer = async () => {
    try {
      await stopTimer(false)
      setIsTimerModalOpen(false)
      setSelectedActivity(null)
      setElapsedTime(0)
    } catch (error) {
      console.error("Error cancelling timer:", error)
    }
  }

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <Clock className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container mx-auto px-4 py-6'>
        {/* 헤더 */}
        <header className='mb-6'>
          <div className='flex items-center gap-4 mb-4'>
            <button
              onClick={() => router.back()}
              className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
            >
              <ArrowLeft className='h-5 w-5' />
              <span className='text-sm'>뒤로</span>
            </button>
            <h1 className='text-3xl font-bold text-theme-primary'>🛁 씻기</h1>
          </div>
          <p className='text-theme-secondary text-sm'>
            개인 위생 관리 활동을 선택하고 기록해보세요
          </p>
        </header>

        {/* 활동 아이템들 */}
        <div className='space-y-3 mb-6'>
          {hygieneActivities.map((activity) => (
            <div
              key={activity.id}
              className='bg-theme-secondary rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow'
            >
              <div className='flex items-center justify-between'>
                {/* 왼쪽: 아이콘과 텍스트 */}
                <div className='flex items-center gap-3 flex-1'>
                  <span className='text-2xl'>{activity.icon}</span>
                  <div>
                    <h3 className='text-lg font-semibold text-theme-primary'>
                      {activity.name}
                    </h3>
                    <p className='text-sm text-theme-secondary'>
                      {activity.description}
                    </p>
                    <div className='flex items-center gap-2 text-xs text-theme-tertiary mt-1'>
                      <Clock className='h-3 w-3' />
                      <span>예상 시간: {activity.estimatedDuration}분</span>
                    </div>
                  </div>
                </div>

                {/* 오른쪽: 수정/삭제 버튼과 시작 버튼 */}
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => {
                      // 수정 기능
                      console.log("수정:", activity.name)
                    }}
                    className='bg-theme-tertiary hover:bg-theme-primary text-theme-secondary hover:text-white p-2 rounded-lg transition-colors'
                    title='수정'
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      // 삭제 기능
                      console.log("삭제:", activity.name)
                    }}
                    className='bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors'
                    title='삭제'
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() =>
                      handleStartActivity(activity.id, activity.name)
                    }
                    className='bg-accent-theme hover:bg-accent-theme-secondary text-white py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2'
                  >
                    <Play className='h-4 w-4' />
                    시작
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 커스텀 활동 추가 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-theme-primary mb-4'>
            다른 활동 추가하기
          </h3>
          <p className='text-sm text-theme-secondary mb-4'>
            원하는 씻기 관련 활동이 없다면 직접 추가해보세요
          </p>
          <button
            onClick={() => router.push("/settings")}
            className='flex items-center gap-2 text-accent-theme hover:text-accent-theme-secondary transition-colors'
          >
            <Plus className='h-4 w-4' />
            <span className='text-sm'>새 활동 추가</span>
          </button>
        </div>

        {/* 타이머 모달 */}
        {isTimerModalOpen && selectedActivity && (
          <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
            <div className='bg-theme-secondary rounded-lg p-8 shadow-lg max-w-md w-full mx-4'>
              <div className='text-center'>
                <h3 className='text-xl font-semibold text-theme-primary mb-2'>
                  {selectedActivity.name}
                </h3>
                <div className='text-4xl font-mono text-accent-theme mb-6'>
                  {formatTime(elapsedTime)}
                </div>

                <div className='flex gap-3 justify-center'>
                  {timerState.isPaused ? (
                    <button
                      onClick={handleResumeTimer}
                      className='flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors'
                    >
                      <Play className='h-4 w-4' />
                      재개
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseTimer}
                      className='flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors'
                    >
                      <Clock className='h-4 w-4' />
                      일시정지
                    </button>
                  )}

                  <button
                    onClick={handleCompleteTimer}
                    className='flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors'
                  >
                    ✓ 완료
                  </button>

                  <button
                    onClick={handleCancelTimer}
                    className='flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors'
                  >
                    ✕ 취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
