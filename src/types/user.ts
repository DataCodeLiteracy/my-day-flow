export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  phoneNumber: string | null
  lastLoginAt: Date
  isActive: boolean
  isAdmin?: boolean
  created_at?: Date
  updated_at?: Date
}

export interface UserStatistics {
  id: string
  userId: string
  totalReadingTime: number // 총 활동 시간 (초) - 기존 타입과 호환성을 위해 유지
  totalActiveTime: number // 총 활동 시간 (초)
  totalSessions: number // 총 세션 수
  averageSessionTime: number // 평균 세션 시간 (초)
  readingStreak: number // 연속 활동일 - 기존 타입과 호환성을 위해 유지
  longestStreak: number // 최장 연속 일수
  currentStreak: number // 현재 연속 일수
  lastActiveDate: string // 마지막 활동 날짜
  categoryStats: any[] // 카테고리별 통계
  weeklyStats: any[] // 주간 통계
  monthlyStats: any[] // 월간 통계
  created_at: Date
  updated_at: Date
}

export interface UserChecklist {
  id: string
  userId: string
  items: ChecklistItem[]
  completedItems: string[]
  created_at: Date
  updated_at: Date
}

export interface ChecklistItem {
  id: string
  title: string
  description?: string
  category: string
  isCompleted: boolean
  completedAt?: Date
}
