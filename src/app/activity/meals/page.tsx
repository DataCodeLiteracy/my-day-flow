"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, Play, Plus } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useTimer } from "@/contexts/TimerContext"
import { ActivityItem, TimerSession } from "@/types/activity"

export default function MealsPage() {
  const router = useRouter()
  const { userUid, isLoggedIn, loading } = useAuth()
  const { timerState, startTimer, pauseTimer, resumeTimer, stopTimer } = useTimer()

  const [todaySessions, setTodaySessions] = useState<TimerSession[]>([])
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<{
    itemId: string
    name: string
  } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // 식사 관련 활동 아이템들
  const mealActivities = [
    {
      id: "breakfast",
      name: "아침 식사",
      description: "아침 식사 준비 및 섭취",
      estimatedDuration: 20,
      icon: "🌅"
    },
    {
      id: "lunch",
      name: "점심 식사",
      description: "점심 식사 준비 및 섭취",
      estimatedDuration: 30,
      icon: "☀️"
    },
    {
      id: "dinner",
      name: "저녁 식사",
      description: "저녁 식사 준비 및 섭취",
      estimatedDuration: 40,
      icon: "🌙"
    },
    {
      id: "snack",
      name: "간식",
      description: "간식 섭취",
      estimatedDuration: 10,
      icon: "🍪"
    },
    {
      id: "cooking",
      name: "요리하기",
      description: "음식 준비 및 조리",
      estimatedDuration: 60,
      icon: "👨‍🍳"
    },
    {
      id: "coffee_break",
      name: "커피 타임",
      description: "커피 및 음료 시간",
      estimatedDuration: 15,
      icon: "☕"
    }
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
      await startTimer(itemId, "meals")
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
            <h1 className='text-3xl font-bold text-theme-primary'>
              🍽️ 식사하기
            </h1>
          </div>
          <p className='text-theme-secondary text-sm'>
            음식 섭취 및 식사 준비 활동을 선택하고 기록해보세요
          </p>
        </header>

        {/* 활동 아이템들 */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
          {mealActivities.map((activity) => (
            <div
              key={activity.id}
              className='bg-theme-secondary rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow'
            >
              <div className='text-center mb-4'>
                <div className='text-4xl mb-3'>{activity.icon}</div>
                <h3 className='text-lg font-semibold text-theme-primary mb-2'>
                  {activity.name}
                </h3>
                <p className='text-sm text-theme-secondary mb-3'>
                  {activity.description}
                </p>
                <div className='flex items-center justify-center gap-2 text-xs text-theme-tertiary mb-4'>
                  <Clock className='h-4 w-4' />
                  <span>예상 시간: {activity.estimatedDuration}분</span>
                </div>
              </div>

              <button
                onClick={() => handleStartActivity(activity.id, activity.name)}
                className='w-full bg-accent-theme hover:bg-accent-theme-secondary text-white py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2'
              >
                <Play className='h-4 w-4' />
                시작하기
              </button>
            </div>
          ))}
        </div>

        {/* 커스텀 활동 추가 */}
        <div className='bg-theme-secondary rounded-lg p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-theme-primary mb-4'>
            다른 활동 추가하기
          </h3>
          <p className='text-sm text-theme-secondary mb-4'>
            원하는 식사 관련 활동이 없다면 직접 추가해보세요
          </p>
          <button
            onClick={() => router.push('/settings')}
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
                    ✓
                    완료
                  </button>

                  <button
                    onClick={handleCancelTimer}
                    className='flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors'
                  >
                    ✕
                    취소
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
