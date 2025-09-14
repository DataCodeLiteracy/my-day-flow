"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  Clock,
  Plus,
  User,
  Settings,
  BarChart3,
  Target,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Square,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useData } from "@/contexts/DataContext"
import { useTimer } from "@/contexts/TimerContext"
import { ActivityCategory, ActivityItem, TimerSession } from "@/types/activity"
import { ActivityService } from "@/services/activityService"
import { StatisticsService } from "@/services/statisticsService"

export default function Home() {
  const router = useRouter()
  const { user, loading, isLoggedIn, userUid } = useAuth()
  const { settings } = useSettings()
  const { userStatistics, isLoading } = useData()
  const {
    timerState,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    cancelTimer,
  } = useTimer()

  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ActivityCategory[]>([])
  const [todaySessions, setTodaySessions] = useState<TimerSession[]>([])
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<{
    itemId: string
    categoryId: string
    name: string
  } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  // 카테고리와 오늘의 세션 로드
  useEffect(() => {
    if (!isLoggedIn || !userUid) return

    const loadData = async () => {
      try {
        setError(null)

        // getCategories에서 자동으로 초기화됨
        const [categoriesData, sessionsData] = await Promise.all([
          ActivityService.getCategories(userUid),
          ActivityService.getTodaySessions(userUid),
        ])
        setCategories(categoriesData || [])
        setTodaySessions(sessionsData || [])
      } catch (error) {
        console.error("Error loading data:", error)
        // 데이터가 없을 때는 오류가 아니라 빈 배열로 설정
        setCategories([])
        setTodaySessions([])
        // 실제 네트워크 오류나 권한 오류일 때만 에러 표시
        if (error instanceof Error && error.message.includes("permission")) {
          setError("데이터에 접근할 권한이 없습니다.")
        }
      }
    }

    loadData()
  }, [isLoggedIn, userUid])

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
  const handleStartActivity = async (
    itemId: string,
    categoryId: string,
    name: string
  ) => {
    try {
      setSelectedActivity({ itemId, categoryId, name })
      await startTimer(itemId, categoryId)
      setIsTimerModalOpen(true)
    } catch (error) {
      console.error("Error starting activity:", error)
      setError("활동을 시작하는 중 오류가 발생했습니다.")
    }
  }

  // 타이머 일시정지
  const handlePauseTimer = async () => {
    try {
      await pauseTimer()
    } catch (error) {
      console.error("Error pausing timer:", error)
      setError("타이머를 일시정지하는 중 오류가 발생했습니다.")
    }
  }

  // 타이머 재개
  const handleResumeTimer = async () => {
    try {
      await resumeTimer()
    } catch (error) {
      console.error("Error resuming timer:", error)
      setError("타이머를 재개하는 중 오류가 발생했습니다.")
    }
  }

  // 타이머 완료
  const handleCompleteTimer = async () => {
    try {
      await stopTimer(true)
      setIsTimerModalOpen(false)
      setSelectedActivity(null)
      setElapsedTime(0)
      // 데이터 새로고침
      if (userUid) {
        const sessionsData = await ActivityService.getTodaySessions(userUid)
        setTodaySessions(sessionsData)
      }
    } catch (error) {
      console.error("Error completing timer:", error)
      setError("타이머를 완료하는 중 오류가 발생했습니다.")
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
      setError("타이머를 취소하는 중 오류가 발생했습니다.")
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
          <Calendar className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
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
        <header className='mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h1 className='text-3xl font-bold text-theme-primary'>
              📅 나의 하루 리포트
            </h1>
            <button
              onClick={() => router.push("/mypage")}
              className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
            >
              <User className='h-5 w-5' />
              <span className='text-sm'>마이페이지</span>
            </button>
          </div>
          <p className='text-theme-secondary text-sm'>
            나만의 하루 흐름을 기록하고 관리해보세요
          </p>
          {user && (
            <p className='text-sm text-theme-tertiary mt-1'>
              안녕하세요, {user.displayName || "사용자"}님!
            </p>
          )}
        </header>

        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

        {/* 사용자 통계 섹션 */}
        {userStatistics && (
          <div className='mb-6 bg-theme-secondary rounded-lg p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-theme-primary mb-4'>
              📊 하루 통계
            </h2>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Clock className='h-6 w-6 accent-theme-primary' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>
                  총 활동 시간
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {Math.floor(userStatistics.totalActiveTime / 3600)}시간{" "}
                  {Math.floor((userStatistics.totalActiveTime % 3600) / 60)}분
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Calendar className='h-6 w-6 text-green-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>활동 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {userStatistics.totalSessions}회
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <BarChart3 className='h-6 w-6 text-purple-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>평균 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {Math.floor(userStatistics.averageSessionTime / 60)}분
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Target className='h-6 w-6 text-orange-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>연속 활동일</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {userStatistics.currentStreak}일
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 활동 카테고리 버튼들 */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
          {/* 씻기 */}
          <button
            onClick={() => router.push("/activity/hygiene")}
            className='bg-theme-secondary hover:bg-theme-primary rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md group'
          >
            <div className='text-center'>
              <div className='text-4xl mb-3 group-hover:scale-110 transition-transform'>
                🛁
              </div>
              <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                씻기
              </h3>
              <p className='text-sm text-theme-secondary'>개인 위생 관리</p>
            </div>
          </button>

          {/* 식사하기 */}
          <button
            onClick={() => router.push("/activity/meals")}
            className='bg-theme-secondary hover:bg-theme-primary rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md group'
          >
            <div className='text-center'>
              <div className='text-4xl mb-3 group-hover:scale-110 transition-transform'>
                🍽️
              </div>
              <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                식사하기
              </h3>
              <p className='text-sm text-theme-secondary'>
                음식 섭취 및 식사 준비
              </p>
            </div>
          </button>

          {/* 공부하기 */}
          <button
            onClick={() => router.push("/activity/study")}
            className='bg-theme-secondary hover:bg-theme-primary rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md group'
          >
            <div className='text-center'>
              <div className='text-4xl mb-3 group-hover:scale-110 transition-transform'>
                📚
              </div>
              <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                공부하기
              </h3>
              <p className='text-sm text-theme-secondary'>학습 및 교육 활동</p>
            </div>
          </button>

          {/* 독서 */}
          <button
            onClick={() => router.push("/activity/reading")}
            className='bg-theme-secondary hover:bg-theme-primary rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md group'
          >
            <div className='text-center'>
              <div className='text-4xl mb-3 group-hover:scale-110 transition-transform'>
                📖
              </div>
              <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                독서
              </h3>
              <p className='text-sm text-theme-secondary'>
                책 읽기 및 독서 활동
              </p>
            </div>
          </button>

          {/* 운동 */}
          <button
            onClick={() => router.push("/activity/exercise")}
            className='bg-theme-secondary hover:bg-theme-primary rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md group'
          >
            <div className='text-center'>
              <div className='text-4xl mb-3 group-hover:scale-110 transition-transform'>
                🏃
              </div>
              <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                운동
              </h3>
              <p className='text-sm text-theme-secondary'>신체 활동 및 운동</p>
            </div>
          </button>

          {/* 자기계발 */}
          <button
            onClick={() => router.push("/activity/self-development")}
            className='bg-theme-secondary hover:bg-theme-primary rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md group'
          >
            <div className='text-center'>
              <div className='text-4xl mb-3 group-hover:scale-110 transition-transform'>
                💪
              </div>
              <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                자기계발
              </h3>
              <p className='text-sm text-theme-secondary'>
                개인 성장 및 개발 활동
              </p>
            </div>
          </button>

          {/* 휴식 */}
          <button
            onClick={() => router.push("/activity/rest")}
            className='bg-theme-secondary hover:bg-theme-primary rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md group'
          >
            <div className='text-center'>
              <div className='text-4xl mb-3 group-hover:scale-110 transition-transform'>
                😴
              </div>
              <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                휴식
              </h3>
              <p className='text-sm text-theme-secondary'>쉬기 및 휴식 활동</p>
            </div>
          </button>

          {/* 기타 */}
          <button
            onClick={() => router.push("/activity/other")}
            className='bg-theme-secondary hover:bg-theme-primary rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md group'
          >
            <div className='text-center'>
              <div className='text-4xl mb-3 group-hover:scale-110 transition-transform'>
                ⚡
              </div>
              <h3 className='text-lg font-semibold text-theme-primary mb-1'>
                기타
              </h3>
              <p className='text-sm text-theme-secondary'>기타 활동</p>
            </div>
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
                      <Pause className='h-4 w-4' />
                      일시정지
                    </button>
                  )}

                  <button
                    onClick={handleCompleteTimer}
                    className='flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors'
                  >
                    <CheckCircle className='h-4 w-4' />
                    완료
                  </button>

                  <button
                    onClick={handleCancelTimer}
                    className='flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors'
                  >
                    <Square className='h-4 w-4' />
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
