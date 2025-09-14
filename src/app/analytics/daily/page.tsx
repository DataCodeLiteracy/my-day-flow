"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { ActivityService } from "@/services/activityService"
import { TimerSession, ActivityCategory, ActivityItem } from "@/types/activity"

interface DailyAnalyticsData {
  selectedDate: Date
  totalSessions: number
  totalTime: number
  averageSessionTime: number
  categoryStats: {
    [categoryId: string]: {
      name: string
      time: number
      sessions: number
      color: string
    }
  }
  itemStats: {
    [itemId: string]: {
      name: string
      categoryName: string
      time: number
      sessions: number
      color: string
    }
  }
  hourlyStats: { [hour: string]: number }
  sessions: TimerSession[]
}

export default function DailyAnalyticsPage() {
  const router = useRouter()
  const { user, loading, isLoggedIn } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<DailyAnalyticsData | null>(
    null
  )
  const [categories, setCategories] = useState<ActivityCategory[]>([])
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [loading, isLoggedIn, router])

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      loadDailyAnalytics()
    }
  }, [isLoggedIn, user?.uid, selectedDate])

  const loadDailyAnalytics = async () => {
    try {
      setIsLoading(true)

      // 카테고리 데이터 로드
      const categoriesData = await ActivityService.getCategories(user!.uid)
      setCategories(categoriesData)

      // 모든 카테고리의 아이템들 가져오기
      const itemsPromises = categoriesData.map((category) =>
        ActivityService.getActivityItems(category.id, user!.uid)
      )
      const allItemsData = await Promise.all(itemsPromises)
      const flatItems = allItemsData.flat()
      setActivityItems(flatItems)

      // 선택된 날짜의 세션 데이터 로드
      const sessions = await ActivityService.getSessionsByDate(
        user!.uid,
        selectedDate
      )

      // 분석 데이터 계산
      const analysisData = calculateDailyAnalytics(
        sessions,
        categoriesData,
        flatItems,
        selectedDate
      )
      setAnalyticsData(analysisData)
    } catch (error) {
      console.error("Error loading daily analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDailyAnalytics = (
    sessions: TimerSession[],
    categories: ActivityCategory[],
    items: ActivityItem[],
    date: Date
  ): DailyAnalyticsData => {
    const totalSessions = sessions.length
    const totalTime = sessions.reduce(
      (sum, session) => sum + session.activeDuration,
      0
    )
    const averageSessionTime =
      totalSessions > 0 ? Math.floor(totalTime / totalSessions) : 0

    // 카테고리별 통계
    const categoryStats: {
      [categoryId: string]: {
        name: string
        time: number
        sessions: number
        color: string
      }
    } = {}
    sessions.forEach((session) => {
      const category = categories.find((cat) => cat.id === session.categoryId)
      if (category) {
        if (!categoryStats[session.categoryId]) {
          categoryStats[session.categoryId] = {
            name: category.name,
            time: 0,
            sessions: 0,
            color: category.color || "blue",
          }
        }
        categoryStats[session.categoryId].time += session.activeDuration
        categoryStats[session.categoryId].sessions += 1
      }
    })

    // 아이템별 통계
    const itemStats: {
      [itemId: string]: {
        name: string
        categoryName: string
        time: number
        sessions: number
        color: string
      }
    } = {}
    sessions.forEach((session) => {
      const item = items.find((item) => item.id === session.activityItemId)
      const category = categories.find((cat) => cat.id === session.categoryId)
      if (item && category) {
        if (!itemStats[session.activityItemId]) {
          itemStats[session.activityItemId] = {
            name: item.name,
            categoryName: category.name,
            time: 0,
            sessions: 0,
            color: category.color || "blue",
          }
        }
        itemStats[session.activityItemId].time += session.activeDuration
        itemStats[session.activityItemId].sessions += 1
      }
    })

    // 시간대별 통계
    const hourlyStats: { [hour: string]: number } = {}
    sessions.forEach((session) => {
      const hour = new Date(session.startTime).getHours()
      const hourKey = `${hour.toString().padStart(2, "0")}:00 ~ ${(hour + 1)
        .toString()
        .padStart(2, "0")}:00`
      hourlyStats[hourKey] =
        (hourlyStats[hourKey] || 0) + session.activeDuration
    })

    return {
      selectedDate: date,
      totalSessions,
      totalTime,
      averageSessionTime,
      categoryStats,
      itemStats,
      hourlyStats,
      sessions,
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    }
    return `${minutes}분`
  }

  const getHourlySegments = (sessions: TimerSession[]) => {
    const segments: { [hour: number]: { [minute: number]: number } } = {}

    sessions.forEach((session) => {
      const startTime = new Date(session.startTime)
      const endTime = session.endTime ? new Date(session.endTime) : new Date()

      // 일시정지 기록이 있으면 실제 집중한 시간만 계산
      if (session.pauseRecords && session.pauseRecords.length > 0) {
        let currentTime = startTime
        const pauseRecords = session.pauseRecords.sort(
          (a, b) =>
            new Date(a.pauseTime).getTime() - new Date(b.pauseTime).getTime()
        )

        for (const pauseRecord of pauseRecords) {
          const pauseTime = new Date(pauseRecord.pauseTime)
          const resumeTime = pauseRecord.resumeTime
            ? new Date(pauseRecord.resumeTime)
            : endTime

          // 일시정지 전까지의 시간 추가
          while (currentTime < pauseTime && currentTime < endTime) {
            const hour = currentTime.getHours()
            const minute = currentTime.getMinutes()

            if (!segments[hour]) segments[hour] = {}
            if (!segments[hour][minute]) segments[hour][minute] = 0

            const nextMinute = new Date(currentTime)
            nextMinute.setMinutes(minute + 1, 0, 0)
            const segmentEnd = new Date(
              Math.min(
                nextMinute.getTime(),
                pauseTime.getTime(),
                endTime.getTime()
              )
            )

            segments[hour][minute] +=
              (segmentEnd.getTime() - currentTime.getTime()) / 1000
            currentTime = segmentEnd
          }

          // 일시정지 시간 건너뛰기
          if (resumeTime > pauseTime) {
            currentTime = resumeTime
          }
        }

        // 마지막 일시정지 후 시간 추가
        while (currentTime < endTime) {
          const hour = currentTime.getHours()
          const minute = currentTime.getMinutes()

          if (!segments[hour]) segments[hour] = {}
          if (!segments[hour][minute]) segments[hour][minute] = 0

          const nextMinute = new Date(currentTime)
          nextMinute.setMinutes(minute + 1, 0, 0)
          const segmentEnd = new Date(
            Math.min(nextMinute.getTime(), endTime.getTime())
          )

          segments[hour][minute] +=
            (segmentEnd.getTime() - currentTime.getTime()) / 1000
          currentTime = segmentEnd
        }
      } else {
        // 일시정지 기록이 없으면 전체 시간 사용
        let currentTime = startTime
        while (currentTime < endTime) {
          const hour = currentTime.getHours()
          const minute = currentTime.getMinutes()

          if (!segments[hour]) segments[hour] = {}
          if (!segments[hour][minute]) segments[hour][minute] = 0

          const nextMinute = new Date(currentTime)
          nextMinute.setMinutes(minute + 1, 0, 0)
          const segmentEnd = new Date(
            Math.min(nextMinute.getTime(), endTime.getTime())
          )

          segments[hour][minute] +=
            (segmentEnd.getTime() - currentTime.getTime()) / 1000
          currentTime = segmentEnd
        }
      }
    })

    return segments
  }

  const handlePreviousDay = () => {
    const previousDay = new Date(selectedDate)
    previousDay.setDate(previousDay.getDate() - 1)
    setSelectedDate(previousDay)
  }

  const handleNextDay = () => {
    const nextDay = new Date(selectedDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setSelectedDate(nextDay)
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      {/* 상단 네비게이션 바 */}
      <div className='bg-theme-secondary border-b border-theme-primary/20'>
        <div className='max-w-md mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <button
              onClick={() => router.back()}
              className='p-2 text-theme-primary hover:text-theme-primary/80 transition-colors rounded-lg hover:bg-theme-primary/10'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='text-lg font-semibold text-theme-primary'>
              일별 분석
            </h1>
            <div className='w-9' />
          </div>
        </div>
      </div>

      <div className='max-w-md mx-auto px-4 py-6'>
        {/* 날짜 선택 */}
        <div className='bg-theme-secondary rounded-2xl p-4 mb-6 shadow-lg'>
          <div className='flex items-center justify-center gap-4'>
            <button
              onClick={handlePreviousDay}
              className='p-2 text-theme-secondary hover:text-theme-primary transition-colors rounded-lg hover:bg-theme-primary/10'
              title='이전 날'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>

            <div className='text-center'>
              <div className='text-sm text-theme-tertiary'>
                {selectedDate.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </div>
              {selectedDate.toDateString() !== new Date().toDateString() && (
                <button
                  onClick={handleToday}
                  className='text-xs text-accent-theme hover:text-accent-theme-secondary mt-1'
                >
                  오늘로 이동
                </button>
              )}
            </div>

            <button
              onClick={handleNextDay}
              className='p-2 text-theme-secondary hover:text-theme-primary transition-colors rounded-lg hover:bg-theme-primary/10'
              title='다음 날'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className='text-center py-12'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-accent-theme mx-auto'></div>
            <p className='text-theme-tertiary mt-4'>분석 데이터 로딩 중...</p>
          </div>
        ) : analyticsData ? (
          <>
            {/* 전체 통계 카드 */}
            <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg'>
              <h2 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
                <BarChart3 className='h-5 w-5' />
                {selectedDate.toLocaleDateString("ko-KR", {
                  month: "long",
                  day: "numeric",
                })}{" "}
                통계
              </h2>
              <div className='space-y-4'>
                <div className='flex items-center justify-between p-3 bg-theme-primary/5 rounded-lg'>
                  <div className='text-sm text-theme-tertiary'>세션</div>
                  <div className='text-xl font-bold text-accent-theme'>
                    {analyticsData.totalSessions}개
                  </div>
                </div>
                <div className='flex items-center justify-between p-3 bg-theme-primary/5 rounded-lg'>
                  <div className='text-sm text-theme-tertiary'>집중시간</div>
                  <div className='text-xl font-bold text-accent-theme'>
                    {formatTime(analyticsData.totalTime)}
                  </div>
                </div>
                <div className='flex items-center justify-between p-3 bg-theme-primary/5 rounded-lg'>
                  <div className='text-sm text-theme-tertiary'>평균 세션</div>
                  <div className='text-xl font-bold text-accent-theme'>
                    {formatTime(analyticsData.averageSessionTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* 카테고리별 통계 */}
            {Object.keys(analyticsData.categoryStats).length > 0 && (
              <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg'>
                <h2 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
                  <PieChart className='h-5 w-5' />
                  카테고리별 활동
                </h2>
                <div className='space-y-3'>
                  {Object.entries(analyticsData.categoryStats)
                    .sort(([, a], [, b]) => b.time - a.time)
                    .map(([categoryId, stats]) => (
                      <div
                        key={categoryId}
                        className='flex items-center justify-between p-3 bg-theme-primary/5 rounded-lg'
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-4 h-4 rounded-full bg-${stats.color}-500`}
                          ></div>
                          <div>
                            <div className='font-medium text-theme-primary'>
                              {stats.name}
                            </div>
                            <div className='text-sm text-theme-tertiary'>
                              {stats.sessions}개 세션
                            </div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='font-semibold text-accent-theme'>
                            {formatDuration(stats.time)}
                          </div>
                          <div className='text-xs text-theme-tertiary'>
                            {Math.round(
                              (stats.time / analyticsData.totalTime) * 100
                            )}
                            %
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 아이템별 통계 */}
            {Object.keys(analyticsData.itemStats).length > 0 && (
              <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg'>
                <h2 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
                  <Target className='h-5 w-5' />
                  아이템별 활동
                </h2>
                <div className='space-y-3'>
                  {Object.entries(analyticsData.itemStats)
                    .sort(([, a], [, b]) => b.time - a.time)
                    .map(([itemId, stats]) => (
                      <div
                        key={itemId}
                        className='flex items-center justify-between p-3 bg-theme-primary/5 rounded-lg'
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-4 h-4 rounded-full bg-${stats.color}-500`}
                          ></div>
                          <div>
                            <div className='font-medium text-theme-primary'>
                              {stats.name}
                            </div>
                            <div className='text-sm text-theme-tertiary'>
                              {stats.categoryName} • {stats.sessions}개 세션
                            </div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='font-semibold text-accent-theme'>
                            {formatDuration(stats.time)}
                          </div>
                          <div className='text-xs text-theme-tertiary'>
                            {Math.round(
                              (stats.time / analyticsData.totalTime) * 100
                            )}
                            %
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 시간대별 통계 */}
            {analyticsData.sessions.length > 0 && (
              <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg'>
                <h2 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
                  <Clock className='h-5 w-5' />
                  시간대별 활동
                </h2>
                <div className='space-y-4'>
                  {(() => {
                    const segments = getHourlySegments(analyticsData.sessions)
                    const hours = Object.keys(segments)
                      .map(Number)
                      .sort((a, b) => a - b)

                    return hours.map((hour) => {
                      const hourSegments = segments[hour]
                      const totalTime = Object.values(hourSegments).reduce(
                        (sum, time) => sum + time,
                        0
                      )
                      const maxTime = Math.max(...Object.values(hourSegments))

                      return (
                        <div key={hour} className='space-y-2'>
                          <div className='flex items-center justify-between'>
                            <div className='text-sm font-medium text-theme-primary'>
                              {hour.toString().padStart(2, "0")}:00 ~{" "}
                              {(hour + 1).toString().padStart(2, "0")}:00
                            </div>
                            <div className='text-sm text-theme-tertiary'>
                              {formatDuration(totalTime)}
                            </div>
                          </div>
                          <div className='relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                            {(() => {
                              // 60분을 1분 단위로 60개 세그먼트로 나누기
                              const minuteSegments = Array.from(
                                { length: 60 },
                                (_, i) => {
                                  const time = hourSegments[i] || 0
                                  return time
                                }
                              )

                              // 연속된 집중 시간 구간 찾기
                              const activeSegments = []
                              let currentStart = -1
                              let currentEnd = -1

                              for (let i = 0; i < 60; i++) {
                                if (minuteSegments[i] > 0) {
                                  if (currentStart === -1) {
                                    currentStart = i
                                  }
                                  currentEnd = i
                                } else {
                                  if (currentStart !== -1) {
                                    activeSegments.push({
                                      start: currentStart,
                                      end: currentEnd,
                                    })
                                    currentStart = -1
                                    currentEnd = -1
                                  }
                                }
                              }

                              // 마지막 구간 처리
                              if (currentStart !== -1) {
                                activeSegments.push({
                                  start: currentStart,
                                  end: currentEnd,
                                })
                              }

                              return activeSegments.map((segment, index) => {
                                const leftPercent = (segment.start / 60) * 100
                                const widthPercent =
                                  ((segment.end - segment.start + 1) / 60) * 100

                                return (
                                  <div
                                    key={index}
                                    className='absolute h-full bg-blue-500 rounded-full'
                                    style={{
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`,
                                    }}
                                    title={`${segment.start
                                      .toString()
                                      .padStart(2, "0")}분 ~ ${segment.end
                                      .toString()
                                      .padStart(2, "0")}분`}
                                  />
                                )
                              })
                            })()}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}

            {/* 세션 목록 */}
            {analyticsData.sessions.length > 0 && (
              <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg'>
                <h2 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
                  <Activity className='h-5 w-5' />
                  세션 목록
                </h2>
                <div className='space-y-3'>
                  {analyticsData.sessions.map((session) => {
                    const category = categories.find(
                      (cat) => cat.id === session.categoryId
                    )
                    const item = activityItems.find(
                      (item) => item.id === session.activityItemId
                    )
                    return (
                      <div
                        key={session.id}
                        className='p-4 bg-theme-primary/5 rounded-lg border border-theme-primary/10'
                      >
                        <div className='flex items-start justify-between mb-3'>
                          <div className='flex-1'>
                            <div className='font-medium text-theme-primary mb-1'>
                              {item?.name || category?.name || "알 수 없음"}
                            </div>
                            <div className='text-sm text-theme-tertiary'>
                              {new Date(session.startTime).toLocaleTimeString(
                                "ko-KR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>
                          <div className='text-right'>
                            <div className='font-semibold text-accent-theme'>
                              {formatDuration(session.activeDuration)}
                            </div>
                            <div className='text-xs text-theme-tertiary'>
                              {session.pauseCount}회 일시정지
                            </div>
                          </div>
                        </div>

                        {/* 피드백과 평점 */}
                        {(session.feedback || session.rating) && (
                          <div className='mt-3 pt-3 border-t border-theme-primary/20'>
                            {session.rating && (
                              <div className='flex items-center gap-2 mb-2'>
                                <span className='text-sm text-theme-tertiary'>
                                  평점:
                                </span>
                                <div className='flex gap-1'>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                      key={star}
                                      className={`text-sm ${
                                        star <= session.rating!
                                          ? "text-yellow-400"
                                          : "text-gray-300 dark:text-gray-600"
                                      }`}
                                    >
                                      ⭐
                                    </span>
                                  ))}
                                </div>
                                <span className='text-sm text-theme-tertiary'>
                                  ({session.rating}/5)
                                </span>
                              </div>
                            )}
                            {session.feedback && (
                              <div className='text-sm text-theme-primary bg-theme-primary/10 p-2 rounded'>
                                "{session.feedback}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className='text-center py-12'>
            <div className='text-4xl mb-4'>📊</div>
            <p className='text-theme-secondary mb-2'>
              이 날의 데이터가 없습니다
            </p>
            <p className='text-sm text-theme-tertiary'>
              다른 날짜를 선택해보세요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
