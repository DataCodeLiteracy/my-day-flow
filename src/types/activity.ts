// 할 일 카테고리 (메인 페이지의 카드들)
export interface ActivityCategory {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  isActive: boolean
  order: number
  userId?: string // 사용자별 카테고리를 위한 속성
  created_at: Date
  updated_at: Date
}

// 할 일 아이템 (카테고리 안의 세부 항목들)
export interface ActivityItem {
  id: string
  categoryId: string
  categoryName?: string // 초기화 시에만 사용되는 임시 속성
  name: string
  description?: string
  estimatedDuration: number // 예상 소요 시간 (분)
  isActive: boolean
  order: number
  userId?: string // 사용자별 아이템을 위한 속성
  isHardcoded?: boolean // 하드코딩된 기본 데이터인지 표시
  created_at: Date
  updated_at: Date
}

// 타이머 세션
export interface TimerSession {
  id: string
  userId: string
  activityItemId: string
  categoryId: string
  activityName?: string // 활동 이름
  startTime: Date
  endTime?: Date
  totalDuration: number // 총 소요 시간 (초)
  activeDuration: number // 실제 활동 시간 (초) - 일시정지 시간 제외
  pauseCount: number // 일시정지 횟수
  pauseRecords?: PauseRecord[] // 일시정지 기록들
  status: "active" | "paused" | "completed" | "cancelled"
  notes?: string
  feedback?: string // 활동에 대한 피드백
  rating?: number // 활동 평점 (1-5)
  created_at: Date
  updated_at: Date
}

// 일시정지 기록
export interface PauseRecord {
  id: string
  sessionId: string
  pauseTime: Date
  resumeTime?: Date
  duration: number // 일시정지 시간 (초)
  reason?: string
  created_at: Date
}

// 일일 활동 요약
export interface DailyActivitySummary {
  id: string
  userId: string
  date: string // YYYY-MM-DD 형식
  totalActiveTime: number // 총 활동 시간 (초)
  totalSessions: number // 총 세션 수
  categorySummaries: CategorySummary[]
  created_at: Date
  updated_at: Date
}

// 카테고리별 요약
export interface CategorySummary {
  categoryId: string
  categoryName: string
  totalTime: number // 총 시간 (초)
  sessionCount: number // 세션 수
  averageSessionTime: number // 평균 세션 시간 (초)
  items: ItemSummary[]
}

// 아이템별 요약
export interface ItemSummary {
  itemId: string
  itemName: string
  totalTime: number // 총 시간 (초)
  sessionCount: number // 세션 수
  averageSessionTime: number // 평균 세션 시간 (초)
}

// 사용자 통계
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
  categoryStats: CategoryStats[]
  weeklyStats: WeeklyStats[]
  monthlyStats: MonthlyStats[]
  created_at: Date
  updated_at: Date
}

// 카테고리별 통계
export interface CategoryStats {
  categoryId: string
  categoryName: string
  totalTime: number
  sessionCount: number
  averageSessionTime: number
  lastActivityDate: string
}

// 주간 통계
export interface WeeklyStats {
  week: string // YYYY-WW 형식
  totalTime: number
  sessionCount: number
  activeDays: number
}

// 월간 통계
export interface MonthlyStats {
  month: string // YYYY-MM 형식
  totalTime: number
  sessionCount: number
  activeDays: number
}

// 타이머 상태
export interface TimerState {
  isRunning: boolean
  isPaused: boolean
  startTime: Date | null
  pausedTime: number // 일시정지된 시간 (초)
  currentSession: TimerSession | null
  pauseRecords: PauseRecord[]
  activityName?: string
}
