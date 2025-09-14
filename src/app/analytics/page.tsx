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
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { ActivityService } from "@/services/activityService"
import { TimerSession, ActivityCategory } from "@/types/activity"

interface AnalyticsData {
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
  dailyStats: { [date: string]: { time: number; sessions: number } }
  hourlyStats: { [hour: string]: number }
  weeklyStats: { [week: string]: { time: number; sessions: number } }
  monthlyStats: { [month: string]: { time: number; sessions: number } }
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, loading, isLoggedIn } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [categories, setCategories] = useState<ActivityCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<
    "week" | "month" | "year"
  >("month")

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [loading, isLoggedIn, router])

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      loadAnalyticsData()
    }
  }, [isLoggedIn, user?.uid, selectedPeriod])

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true)

      // 카테고리 데이터 로드
      const categoriesData = await ActivityService.getCategories(user!.uid)
      setCategories(categoriesData)

      // 기간 설정
      const endDate = new Date()
      const startDate = new Date()

      switch (selectedPeriod) {
        case "week":
          startDate.setDate(endDate.getDate() - 7)
          break
        case "month":
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case "year":
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      // 세션 데이터 로드 (최근 30일로 제한)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const actualStartDate =
        startDate > thirtyDaysAgo ? startDate : thirtyDaysAgo

      const sessions = await ActivityService.getTodaySessions(user!.uid)
      const filteredSessions = sessions.filter(
        (session) =>
          new Date(session.startTime) >= actualStartDate &&
          new Date(session.startTime) <= endDate
      )

      // 분석 데이터 계산
      const analysisData = calculateAnalytics(filteredSessions, categoriesData)
      setAnalyticsData(analysisData)
    } catch (error) {
      console.error("Error loading analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAnalytics = (
    sessions: TimerSession[],
    categories: ActivityCategory[]
  ): AnalyticsData => {
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

    // 일별 통계
    const dailyStats: { [date: string]: { time: number; sessions: number } } =
      {}
    sessions.forEach((session) => {
      const date = new Date(session.startTime).toLocaleDateString("ko-KR")
      if (!dailyStats[date]) {
        dailyStats[date] = { time: 0, sessions: 0 }
      }
      dailyStats[date].time += session.activeDuration
      dailyStats[date].sessions += 1
    })

    // 시간대별 통계
    const hourlyStats: { [hour: string]: number } = {}
    sessions.forEach((session) => {
      const hour = new Date(session.startTime).getHours()
      const hourKey = `${hour}:00`
      hourlyStats[hourKey] =
        (hourlyStats[hourKey] || 0) + session.activeDuration
    })

    // 주별 통계
    const weeklyStats: { [week: string]: { time: number; sessions: number } } =
      {}
    sessions.forEach((session) => {
      const date = new Date(session.startTime)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toLocaleDateString("ko-KR")

      if (!weeklyStats[weekKey]) {
        weeklyStats[weekKey] = { time: 0, sessions: 0 }
      }
      weeklyStats[weekKey].time += session.activeDuration
      weeklyStats[weekKey].sessions += 1
    })

    // 월별 통계
    const monthlyStats: {
      [month: string]: { time: number; sessions: number }
    } = {}
    sessions.forEach((session) => {
      const date = new Date(session.startTime)
      const monthKey = `${date.getFullYear()}년 ${date.getMonth() + 1}월`

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { time: 0, sessions: 0 }
      }
      monthlyStats[monthKey].time += session.activeDuration
      monthlyStats[monthKey].sessions += 1
    })

    return {
      totalSessions,
      totalTime,
      averageSessionTime,
      categoryStats,
      dailyStats,
      hourlyStats,
      weeklyStats,
      monthlyStats,
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
              분석 페이지
            </h1>
            <div className='w-9' />
          </div>
        </div>
      </div>

      <div className='max-w-md mx-auto px-4 py-6'>
        {/* 분석 유형 선택 */}
        <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg'>
          <h2 className='text-lg font-semibold text-theme-primary mb-4'>
            분석 유형
          </h2>
          <div className='space-y-3'>
            <button
              onClick={() => router.push("/analytics/daily")}
              className='w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg border border-blue-200 dark:border-blue-800'
            >
              <Calendar className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              <div className='text-left'>
                <div className='font-medium text-blue-700 dark:text-blue-300'>
                  일별 분석
                </div>
                <div className='text-xs text-blue-600 dark:text-blue-400'>
                  하루 단위 상세 분석
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push("/analytics/weekly")}
              className='w-full bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg border border-green-200 dark:border-green-800'
            >
              <Calendar className='h-5 w-5 text-green-600 dark:text-green-400' />
              <div className='text-left'>
                <div className='font-medium text-green-700 dark:text-green-300'>
                  주별 분석
                </div>
                <div className='text-xs text-green-600 dark:text-green-400'>
                  일주일 단위 분석
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push("/analytics/monthly")}
              className='w-full bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg border border-purple-200 dark:border-purple-800'
            >
              <Calendar className='h-5 w-5 text-purple-600 dark:text-purple-400' />
              <div className='text-left'>
                <div className='font-medium text-purple-700 dark:text-purple-300'>
                  월별 분석
                </div>
                <div className='text-xs text-purple-600 dark:text-purple-400'>
                  한 달 단위 분석
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push("/analytics/yearly")}
              className='w-full bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg border border-orange-200 dark:border-orange-800'
            >
              <Calendar className='h-5 w-5 text-orange-600 dark:text-orange-400' />
              <div className='text-left'>
                <div className='font-medium text-orange-700 dark:text-orange-300'>
                  연별 분석
                </div>
                <div className='text-xs text-orange-600 dark:text-orange-400'>
                  일년 단위 분석
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 전체 요약 통계 */}
        {isLoading ? (
          <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-accent-theme mx-auto'></div>
            <p className='text-theme-tertiary mt-2 text-sm'>
              요약 데이터 로딩 중...
            </p>
          </div>
        ) : analyticsData ? (
          <>
            {/* 전체 통계 카드 */}
            <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg'>
              <h2 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
                <BarChart3 className='h-5 w-5' />
                전체 요약
              </h2>
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-accent-theme'>
                    {analyticsData.totalSessions}
                  </div>
                  <div className='text-xs text-theme-tertiary'>총 세션</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-accent-theme'>
                    {formatTime(analyticsData.totalTime)}
                  </div>
                  <div className='text-xs text-theme-tertiary'>총 집중시간</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-accent-theme'>
                    {formatTime(analyticsData.averageSessionTime)}
                  </div>
                  <div className='text-xs text-theme-tertiary'>평균 세션</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl font-bold text-accent-theme'>
                    {Object.keys(analyticsData.categoryStats).length}
                  </div>
                  <div className='text-xs text-theme-tertiary'>
                    활동 카테고리
                  </div>
                </div>
              </div>
            </div>

            {/* 카테고리별 요약 */}
            {Object.keys(analyticsData.categoryStats).length > 0 && (
              <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg'>
                <h2 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
                  <PieChart className='h-5 w-5' />
                  카테고리별 요약
                </h2>
                <div className='space-y-3'>
                  {Object.entries(analyticsData.categoryStats)
                    .sort(([, a], [, b]) => b.time - a.time)
                    .slice(0, 3)
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

            {/* 최근 활동 요약 */}
            {Object.keys(analyticsData.dailyStats).length > 0 && (
              <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg'>
                <h2 className='text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2'>
                  <Calendar className='h-5 w-5' />
                  최근 활동
                </h2>
                <div className='space-y-2'>
                  {Object.entries(analyticsData.dailyStats)
                    .sort(
                      ([a], [b]) =>
                        new Date(b).getTime() - new Date(a).getTime()
                    )
                    .slice(0, 5)
                    .map(([date, stats]) => (
                      <div
                        key={date}
                        className='flex items-center justify-between p-3 bg-theme-primary/5 rounded-lg'
                      >
                        <div className='text-sm text-theme-primary'>{date}</div>
                        <div className='text-right'>
                          <div className='text-sm font-medium text-accent-theme'>
                            {formatDuration(stats.time)}
                          </div>
                          <div className='text-xs text-theme-tertiary'>
                            {stats.sessions}개 세션
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg text-center'>
            <div className='text-4xl mb-4'>📊</div>
            <p className='text-theme-secondary mb-2'>분석 데이터가 없습니다</p>
            <p className='text-sm text-theme-tertiary'>
              타이머를 사용하여 데이터를 수집해보세요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
