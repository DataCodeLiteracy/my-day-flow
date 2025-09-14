import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  UserStatistics,
  DailyActivitySummary,
  CategorySummary,
  ItemSummary,
  CategoryStats,
  WeeklyStats,
  MonthlyStats,
  TimerSession,
} from "@/types/activity"
import { ApiError } from "@/lib/apiClient"

export class StatisticsService {
  // 일일 활동 요약 생성
  static async createDailySummary(
    userId: string,
    date: string,
    sessions: TimerSession[]
  ): Promise<void> {
    try {
      // 카테고리별로 그룹화
      const categoryMap = new Map<
        string,
        {
          categoryName: string
          totalTime: number
          sessionCount: number
          items: Map<
            string,
            { itemName: string; totalTime: number; sessionCount: number }
          >
        }
      >()

      sessions.forEach((session) => {
        if (session.status === "completed" && session.endTime) {
          const categoryId = session.categoryId
          const itemId = session.activityItemId

          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, {
              categoryName: "", // 실제로는 카테고리 이름을 가져와야 함
              totalTime: 0,
              sessionCount: 0,
              items: new Map(),
            })
          }

          const category = categoryMap.get(categoryId)!
          category.totalTime += session.activeDuration
          category.sessionCount += 1

          if (!category.items.has(itemId)) {
            category.items.set(itemId, {
              itemName: "", // 실제로는 아이템 이름을 가져와야 함
              totalTime: 0,
              sessionCount: 0,
            })
          }

          const item = category.items.get(itemId)!
          item.totalTime += session.activeDuration
          item.sessionCount += 1
        }
      })

      // CategorySummary 배열 생성
      const categorySummaries: CategorySummary[] = Array.from(
        categoryMap.entries()
      ).map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.categoryName,
        totalTime: data.totalTime,
        sessionCount: data.sessionCount,
        averageSessionTime:
          data.sessionCount > 0 ? data.totalTime / data.sessionCount : 0,
        items: Array.from(data.items.entries()).map(([itemId, itemData]) => ({
          itemId,
          itemName: itemData.itemName,
          totalTime: itemData.totalTime,
          sessionCount: itemData.sessionCount,
          averageSessionTime:
            itemData.sessionCount > 0
              ? itemData.totalTime / itemData.sessionCount
              : 0,
        })),
      }))

      const totalActiveTime = categorySummaries.reduce(
        (sum, cat) => sum + cat.totalTime,
        0
      )
      const totalSessions = categorySummaries.reduce(
        (sum, cat) => sum + cat.sessionCount,
        0
      )

      const dailySummary: Omit<
        DailyActivitySummary,
        "id" | "created_at" | "updated_at"
      > = {
        userId,
        date,
        totalActiveTime,
        totalSessions,
        categorySummaries,
      }

      const summaryRef = doc(db, "dailyActivitySummaries", `${userId}_${date}`)
      await setDoc(summaryRef, {
        ...dailySummary,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error creating daily summary:", error)
      throw new ApiError("일일 요약 생성 중 오류가 발생했습니다.")
    }
  }

  // 사용자 통계 업데이트
  static async updateUserStatistics(userId: string): Promise<void> {
    try {
      // userId 유효성 검사
      if (!userId || typeof userId !== "string" || userId.trim() === "") {
        console.error(
          "Invalid userId provided to updateUserStatistics:",
          userId
        )
        return
      }

      // 최근 30일의 세션 데이터 가져오기
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const sessionsRef = collection(db, "timerSessions")
      const q = query(
        sessionsRef,
        where("userId", "==", userId),
        where("status", "==", "completed")
      )
      const snapshot = await getDocs(q)

      const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || undefined,
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as TimerSession[]

      // 클라이언트 사이드에서 최근 30일 필터링 및 시간순 정렬 (최신순)
      const recentSessions = sessions.filter((session) => {
        return session.startTime >= thirtyDaysAgo
      })

      recentSessions.sort(
        (a, b) => b.startTime.getTime() - a.startTime.getTime()
      )

      // 통계 계산
      const totalActiveTime = recentSessions.reduce(
        (sum, session) => sum + session.activeDuration,
        0
      )
      const totalSessions = recentSessions.length
      const averageSessionTime =
        totalSessions > 0 ? totalActiveTime / totalSessions : 0

      // 연속 일수 계산
      const activeDates = new Set(
        recentSessions.map(
          (session) => session.startTime.toISOString().split("T")[0]
        )
      )
      const sortedDates = Array.from(activeDates).sort().reverse()

      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 0

      const today = new Date().toISOString().split("T")[0]
      let checkDate = today

      for (const date of sortedDates) {
        const expectedDate = new Date(checkDate)
        const actualDate = new Date(date)
        const diffDays = Math.floor(
          (expectedDate.getTime() - actualDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )

        if (diffDays === 0) {
          tempStreak++
          if (checkDate === today) currentStreak = tempStreak
          longestStreak = Math.max(longestStreak, tempStreak)
        } else if (diffDays === 1) {
          tempStreak++
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          tempStreak = 1
        }

        checkDate = date
      }

      // 카테고리별 통계
      const categoryStatsMap = new Map<string, CategoryStats>()
      sessions.forEach((session) => {
        const categoryId = session.categoryId
        if (!categoryStatsMap.has(categoryId)) {
          categoryStatsMap.set(categoryId, {
            categoryId,
            categoryName: "", // 실제로는 카테고리 이름을 가져와야 함
            totalTime: 0,
            sessionCount: 0,
            averageSessionTime: 0,
            lastActivityDate: "",
          })
        }

        const stats = categoryStatsMap.get(categoryId)!
        stats.totalTime += session.activeDuration
        stats.sessionCount += 1
        stats.lastActivityDate = session.startTime.toISOString().split("T")[0]
      })

      // 평균 세션 시간 계산
      categoryStatsMap.forEach((stats) => {
        stats.averageSessionTime =
          stats.sessionCount > 0 ? stats.totalTime / stats.sessionCount : 0
      })

      const categoryStats: CategoryStats[] = Array.from(
        categoryStatsMap.values()
      )

      // 주간/월간 통계는 별도로 계산 (간단히 구현)
      const weeklyStats: WeeklyStats[] = []
      const monthlyStats: MonthlyStats[] = []

      const userStats: Omit<
        UserStatistics,
        "id" | "created_at" | "updated_at"
      > = {
        userId,
        totalReadingTime: totalActiveTime, // 기존 타입과 호환성
        totalActiveTime,
        totalSessions,
        averageSessionTime,
        readingStreak: currentStreak, // 기존 타입과 호환성
        longestStreak,
        currentStreak,
        lastActiveDate: sortedDates[0] || "",
        categoryStats,
        weeklyStats,
        monthlyStats,
      }

      const statsRef = doc(db, "userStatistics", userId)
      await setDoc(statsRef, {
        ...userStats,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error updating user statistics:", error)
      throw new ApiError("사용자 통계 업데이트 중 오류가 발생했습니다.")
    }
  }

  // 사용자 통계 가져오기
  static async getUserStatistics(
    userId: string
  ): Promise<UserStatistics | null> {
    try {
      const statsRef = doc(db, "userStatistics", userId)
      const statsSnap = await getDoc(statsRef)

      if (statsSnap.exists()) {
        const data = statsSnap.data()
        return {
          id: statsSnap.id,
          ...data,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as UserStatistics
      }
      return null
    } catch (error) {
      console.error("Error getting user statistics:", error)
      throw new ApiError("사용자 통계를 가져오는 중 오류가 발생했습니다.")
    }
  }

  // 일일 요약 가져오기
  static async getDailySummary(
    userId: string,
    date: string
  ): Promise<DailyActivitySummary | null> {
    try {
      const summaryRef = doc(db, "dailyActivitySummaries", `${userId}_${date}`)
      const summarySnap = await getDoc(summaryRef)

      if (summarySnap.exists()) {
        const data = summarySnap.data()
        return {
          id: summarySnap.id,
          ...data,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as DailyActivitySummary
      }
      return null
    } catch (error) {
      console.error("Error getting daily summary:", error)
      throw new ApiError("일일 요약을 가져오는 중 오류가 발생했습니다.")
    }
  }
}
