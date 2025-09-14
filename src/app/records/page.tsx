"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  BarChart3,
  Target,
  TrendingUp,
  AlertCircle,
  Filter,
  Search,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { TimerSession, DailyActivitySummary } from "@/types/activity"
import { ActivityService } from "@/services/activityService"
import { StatisticsService } from "@/services/statisticsService"

export default function RecordsPage() {
  const router = useRouter()
  const { userUid, isLoggedIn, loading } = useAuth()

  const [sessions, setSessions] = useState<TimerSession[]>([])
  const [dailySummary, setDailySummary] = useState<DailyActivitySummary | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (!isLoggedIn || !userUid) return

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [sessionsData, summaryData] = await Promise.all([
          ActivityService.getTodaySessions(userUid),
          StatisticsService.getDailySummary(userUid, selectedDate),
        ])

        setSessions(sessionsData)
        setDailySummary(summaryData)
      } catch (error) {
        console.error("Error loading data:", error)
        setError("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isLoggedIn, userUid, selectedDate])

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // 세션을 시간순으로 그룹화
  const groupSessionsByTime = (sessions: TimerSession[]) => {
    const groups: { [key: string]: TimerSession[] } = {}

    sessions.forEach((session) => {
      const timeKey =
        session.startTime
          .toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })
          .split(":")[0] + "시"

      if (!groups[timeKey]) {
        groups[timeKey] = []
      }
      groups[timeKey].push(session)
    })

    return groups
  }

  if (loading || isLoading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <BarChart3 className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  const completedSessions = sessions.filter(
    (session) => session.status === "completed"
  )
  const groupedSessions = groupSessionsByTime(completedSessions)

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
              <span>뒤로</span>
            </button>
            <div>
              <h1 className='text-3xl font-bold text-theme-primary'>
                📊 활동 기록
              </h1>
              <p className='text-theme-secondary text-sm'>
                상세한 활동 기록을 확인하세요
              </p>
            </div>
          </div>

          {/* 날짜 선택 */}
          <div className='flex items-center gap-4'>
            <input
              type='date'
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className='bg-theme-secondary border border-theme-primary rounded-lg px-3 py-2 text-theme-primary'
            />
          </div>
        </header>

        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

        {/* 일일 요약 */}
        {dailySummary && (
          <div className='mb-6 bg-theme-secondary rounded-lg p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-theme-primary mb-4'>
              📈 {selectedDate} 요약
            </h2>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Clock className='h-6 w-6 text-blue-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>
                  총 활동 시간
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {Math.floor(dailySummary.totalActiveTime / 3600)}시간{" "}
                  {Math.floor((dailySummary.totalActiveTime % 3600) / 60)}분
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Target className='h-6 w-6 text-green-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>총 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {dailySummary.totalSessions}회
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <BarChart3 className='h-6 w-6 text-purple-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>평균 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {dailySummary.totalSessions > 0
                    ? Math.floor(
                        dailySummary.totalActiveTime /
                          dailySummary.totalSessions /
                          60
                      )
                    : 0}
                  분
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <TrendingUp className='h-6 w-6 text-orange-500' />
                </div>
                <p className='text-xs text-theme-secondary mb-1'>
                  활동 카테고리
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {dailySummary.categorySummaries.length}개
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 시간대별 세션 기록 */}
        <div className='space-y-6'>
          <h2 className='text-xl font-semibold text-theme-primary'>
            시간대별 활동 기록
          </h2>

          {Object.keys(groupedSessions).length > 0 ? (
            <div className='space-y-4'>
              {Object.entries(groupedSessions)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([timeSlot, timeSessions]) => {
                  const totalTime = timeSessions.reduce(
                    (sum, session) => sum + session.activeDuration,
                    0
                  )
                  const startTime = timeSessions[0].startTime
                  const endTime =
                    timeSessions[timeSessions.length - 1].endTime ||
                    timeSessions[timeSessions.length - 1].startTime

                  return (
                    <div
                      key={timeSlot}
                      className='bg-theme-secondary rounded-lg p-6 shadow-sm'
                    >
                      <div className='flex items-center justify-between mb-4'>
                        <h3 className='text-lg font-semibold text-theme-primary'>
                          {timeSlot} ({timeSessions.length}개 세션)
                        </h3>
                        <div className='text-sm text-theme-secondary'>
                          {startTime.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {endTime.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          ({Math.floor(totalTime / 60)}분)
                        </div>
                      </div>

                      <div className='space-y-3'>
                        {timeSessions.map((session) => (
                          <div
                            key={session.id}
                            className='bg-theme-tertiary rounded-lg p-4'
                          >
                            <div className='flex items-center justify-between mb-2'>
                              <h4 className='font-medium text-theme-primary'>
                                {session.activityItemId}{" "}
                                {/* 실제로는 아이템 이름을 가져와야 함 */}
                              </h4>
                              <div className='flex items-center gap-4 text-sm text-theme-secondary'>
                                <span>
                                  집중시간:{" "}
                                  {Math.floor(session.activeDuration / 60)}분
                                </span>
                                <span>일시정지: {session.pauseCount}회</span>
                              </div>
                            </div>

                            <div className='text-xs text-theme-tertiary'>
                              {session.startTime.toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}{" "}
                              -{" "}
                              {session.endTime?.toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}{" "}
                              ({formatTime(session.totalDuration)})
                            </div>

                            {session.notes && (
                              <div className='mt-2 text-sm text-theme-secondary bg-theme-primary/10 rounded p-2'>
                                {session.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className='text-center py-12'>
              <Calendar className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-theme-primary mb-2'>
                {selectedDate}에는 활동 기록이 없습니다
              </h3>
              <p className='text-theme-secondary'>
                활동을 시작해서 기록을 남겨보세요!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
