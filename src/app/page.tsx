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
  Trash2,
  History,
  ChevronRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useData } from "@/contexts/DataContext"
import { useTimer } from "@/contexts/TimerContext"
import { ActivityCategory, ActivityItem, TimerSession } from "@/types/activity"
import { ActivityService } from "@/services/activityService"
import { StatisticsService } from "@/services/statisticsService"
import { DataSetupService } from "@/services/dataSetupService"
import PWAInstallPrompt from "@/components/PWAInstallPrompt"
import {
  registerServiceWorker,
  requestNotificationPermission,
} from "@/utils/pwa"

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
    handleFocusCheck,
  } = useTimer()

  // PWA 초기화
  useEffect(() => {
    const initPWA = async () => {
      // Service Worker 등록
      await registerServiceWorker()

      // 알림 권한 요청
      await requestNotificationPermission()
    }

    initPWA()
  }, [])

  // 알림 소리 중지 함수
  const stopAlertSound = () => {
    if (timerState.alertInterval) {
      clearInterval(timerState.alertInterval)
    }
  }

  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ActivityCategory[]>([])
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [todaySessions, setTodaySessions] = useState<TimerSession[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<{
    itemId: string
    categoryId: string
    name: string
  } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] =
    useState<ActivityCategory | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    icon: "",
  })
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false)
  const [showIconSuggestions, setShowIconSuggestions] = useState(false)
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: "",
    description: "",
    icon: "",
  })
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] =
    useState(false)
  const [categoryToDelete, setCategoryToDelete] =
    useState<ActivityCategory | null>(null)

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
        setIsDataLoading(true)

        // getCategories에서 자동으로 초기화됨

        const [categoriesData, sessionsData] = await Promise.all([
          ActivityService.getCategories(userUid),
          ActivityService.getTodaySessions(userUid),
        ])
        setCategories(categoriesData || [])
        setTodaySessions(sessionsData || [])

        // 모든 카테고리의 아이템들 가져오기
        if (categoriesData && categoriesData.length > 0) {
          const itemsPromises = categoriesData.map((category) =>
            ActivityService.getActivityItems(category.id, userUid)
          )
          const allItemsData = await Promise.all(itemsPromises)
          const flatItems = allItemsData.flat()
          setActivityItems(flatItems)
        }
      } catch (error) {
        console.error("Error loading data:", error)
        // 데이터가 없을 때는 오류가 아니라 빈 배열로 설정
        setCategories([])
        setTodaySessions([])
        // 실제 네트워크 오류나 권한 오류일 때만 에러 표시
        if (error instanceof Error && error.message.includes("permission")) {
          setError("데이터에 접근할 권한이 없습니다.")
        }
      } finally {
        setIsDataLoading(false)
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

  // 카테고리 수정 시작
  const handleEditCategory = (category: ActivityCategory) => {
    setEditingCategory(category)
    setEditForm({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
    })
    setIsEditModalOpen(true)
  }

  // 카테고리 수정 취소
  const handleEditCancel = () => {
    setIsEditModalOpen(false)
    setEditingCategory(null)
    setEditForm({ name: "", description: "", icon: "" })
  }

  // 카테고리 수정 저장
  const handleEditSave = async () => {
    if (!editingCategory || !editForm.name.trim()) {
      setError("카테고리 이름을 입력해주세요.")
      return
    }

    try {
      setIsActionLoading(true)
      setError(null)

      await ActivityService.updateCategory(editingCategory.id, {
        name: editForm.name,
        description: editForm.description,
        icon: editForm.icon,
      })

      setIsEditModalOpen(false)
      setEditingCategory(null)
      setEditForm({ name: "", description: "", icon: "" })

      // 데이터 새로고침
      if (userUid) {
        const categoriesData = await ActivityService.getCategories(userUid)
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error("Error updating category:", error)
      setError("카테고리 수정 중 오류가 발생했습니다.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // 카테고리 삭제 시작
  const handleDeleteCategoryStart = (category: ActivityCategory) => {
    setCategoryToDelete(category)
    setIsDeleteCategoryModalOpen(true)
  }

  // 카테고리 삭제 취소
  const handleDeleteCategoryCancel = () => {
    setIsDeleteCategoryModalOpen(false)
    setCategoryToDelete(null)
  }

  // 카테고리 삭제 확인
  const handleDeleteCategoryConfirm = async () => {
    if (!categoryToDelete) return

    try {
      setIsActionLoading(true)
      setError(null)

      await ActivityService.deleteCategory(categoryToDelete.id)

      setIsDeleteCategoryModalOpen(false)
      setCategoryToDelete(null)

      // 데이터 새로고침
      if (userUid) {
        const categoriesData = await ActivityService.getCategories(userUid)
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      setError("카테고리 삭제 중 오류가 발생했습니다.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // 새 카테고리 추가 시작
  const handleAddCategoryStart = () => {
    setIsAddCategoryModalOpen(true)
    setNewCategoryForm({ name: "", description: "", icon: "" })
  }

  // 새 카테고리 추가 취소
  const handleAddCategoryCancel = () => {
    setIsAddCategoryModalOpen(false)
    setNewCategoryForm({ name: "", description: "", icon: "" })
  }

  // 새 카테고리 추가 저장
  const handleAddCategorySave = async () => {
    if (!newCategoryForm.name.trim()) {
      setError("카테고리 이름을 입력해주세요.")
      return
    }

    if (!userUid) {
      setError("사용자 정보를 찾을 수 없습니다.")
      return
    }

    try {
      setIsActionLoading(true)
      setError(null)

      // 기본값 설정
      const categoryName = newCategoryForm.name.trim()
      const description =
        newCategoryForm.description.trim() || `${categoryName} 관련 활동`
      const icon = newCategoryForm.icon.trim() || "📝"

      await ActivityService.createCategory(userUid, {
        name: categoryName,
        description: description,
        icon: icon,
        color: "blue",
        isActive: true,
        order: categories.length,
      })

      setIsAddCategoryModalOpen(false)
      setNewCategoryForm({ name: "", description: "", icon: "" })

      // 데이터 새로고침
      const categoriesData = await ActivityService.getCategories(userUid)
      setCategories(categoriesData)
    } catch (error) {
      console.error("Error creating category:", error)
      setError("카테고리 생성 중 오류가 발생했습니다.")
    } finally {
      setIsActionLoading(false)
    }
  }

  if (loading || isDataLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-theme-gradient'>
        <div className='text-center'>
          <div className='w-12 h-12 mx-auto mb-4 border-b-2 rounded-full animate-spin border-theme-primary'></div>
          <p className='text-theme-secondary'>데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient'>
      <div className='container px-4 py-6 mx-auto'>
        <header className='mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h1 className='text-3xl font-bold text-theme-primary'>
              📅 나의 하루 리포트
            </h1>
            <button
              onClick={() => router.push("/mypage")}
              className='flex items-center gap-2 transition-colors text-theme-secondary hover:text-theme-primary'
            >
              <User className='w-5 h-5' />
              <span className='text-sm'>마이페이지</span>
            </button>
          </div>
          <p className='text-sm text-theme-secondary'>
            나만의 하루 흐름을 기록하고 관리해보세요
          </p>
          {user && (
            <p className='mt-1 text-sm text-theme-tertiary'>
              안녕하세요, {user.displayName || "사용자"}님!
            </p>
          )}
        </header>

        {error && (
          <div className='p-4 mb-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='w-5 h-5 text-red-500' />
              <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>
            </div>
          </div>
        )}

        {/* 사용자 통계 섹션 */}
        {userStatistics && (
          <div className='p-6 mb-6 rounded-lg shadow-sm bg-theme-secondary'>
            <h2 className='mb-4 text-lg font-semibold text-theme-primary'>
              📊 하루 통계
            </h2>
            <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Clock className='w-6 h-6 accent-theme-primary' />
                </div>
                <p className='mb-1 text-xs text-theme-secondary'>
                  총 활동 시간
                </p>
                <p className='text-lg font-bold text-theme-primary'>
                  {Math.floor(userStatistics.totalActiveTime / 3600)}시간{" "}
                  {Math.floor((userStatistics.totalActiveTime % 3600) / 60)}분
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Calendar className='w-6 h-6 text-green-500' />
                </div>
                <p className='mb-1 text-xs text-theme-secondary'>활동 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {userStatistics.totalSessions}회
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <BarChart3 className='w-6 h-6 text-purple-500' />
                </div>
                <p className='mb-1 text-xs text-theme-secondary'>평균 세션</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {Math.floor(userStatistics.averageSessionTime / 60)}분
                </p>
              </div>

              <div className='text-center'>
                <div className='flex items-center justify-center mb-2'>
                  <Target className='w-6 h-6 text-orange-500' />
                </div>
                <p className='mb-1 text-xs text-theme-secondary'>연속 활동일</p>
                <p className='text-lg font-bold text-theme-primary'>
                  {userStatistics.currentStreak}일
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 활동 카테고리 카드 */}
        <div className='relative px-3 py-6 mb-6 rounded-lg shadow-sm bg-theme-secondary'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-xl font-semibold text-theme-primary'>
              일상 활동
            </h2>
            <button
              onClick={handleAddCategoryStart}
              className='p-2 text-white transition-colors rounded-lg bg-accent-theme hover:bg-accent-theme-secondary'
              title='카테고리 추가'
            >
              <Plus className='w-4 h-4' />
            </button>
          </div>

          {/* 활동 리스트 */}
          <div className='space-y-3'>
            {categories.length === 0 ? (
              <div className='py-8 text-center'>
                <div className='mb-4 text-4xl'>📝</div>
                <p className='mb-2 text-theme-secondary'>
                  아직 등록된 활동이 없습니다
                </p>
                <p className='text-sm text-theme-tertiary'>
                  새로운 활동을 추가해보세요
                </p>
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                {categories.map((category) => {
                  console.log("Category for navigation:", {
                    id: category.id,
                    name: category.name,
                    isHardcoded: category.id.startsWith("default_"),
                  })
                  return (
                    <div
                      key={category.id}
                      className='flex flex-col p-4 transition-all duration-200 border rounded-lg shadow-sm cursor-pointer bg-theme-primary/10 border-theme-primary/20 hover:bg-theme-primary/20 hover:border-theme-primary/40 hover:shadow-md'
                      onClick={() => {
                        console.log(
                          "Navigating to:",
                          `/activity/${category.id}`
                        )
                        router.push(`/activity/${category.id}`)
                      }}
                    >
                      <div className='flex items-center flex-1 gap-3 mb-3'>
                        <span className='text-2xl'>{category.icon}</span>
                        <div className='flex-1 min-w-0'>
                          <h3 className='text-lg font-semibold truncate text-theme-primary'>
                            {category.name}
                          </h3>
                          <p className='text-sm text-theme-secondary line-clamp-2'>
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditCategory(category)
                            }}
                            className='p-1 text-blue-500 transition-colors rounded-lg hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                            title='수정'
                          >
                            <svg
                              className='w-4 h-4'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCategoryStart(category)
                            }}
                            className='p-1 text-red-500 transition-colors rounded-lg hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                            title='삭제'
                          >
                            <svg
                              className='w-4 h-4'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                              />
                            </svg>
                          </button>
                        </div>
                        <ChevronRight className='w-5 h-5 text-theme-tertiary' />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 데일리 리포트 섹션 */}
        <div className='px-3 py-6 mb-6 rounded-lg shadow-sm bg-theme-secondary'>
          <div className='mb-4'>
            <div className='flex items-center gap-2 mb-2'>
              <h2 className='flex items-center gap-2 text-xl font-semibold text-theme-primary'>
                <History className='w-5 h-5' />
                데일리 리포트
              </h2>
            </div>
            <div className='mb-2 text-sm text-theme-tertiary'>
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </div>
            <div className='flex items-center justify-between'>
              <div className='text-sm font-medium text-theme-secondary'>
                총 {todaySessions.length}개 세션
              </div>
              <button
                onClick={() => router.push("/records/daily")}
                className='flex items-center gap-1 text-sm font-medium transition-colors text-accent-theme hover:text-accent-theme-secondary'
              >
                더보기
                <span className='text-xs'>&gt;</span>
              </button>
            </div>
          </div>

          <div className='space-y-3'>
            {todaySessions.length === 0 ? (
              <div className='py-8 text-center'>
                <div className='mb-4 text-4xl'>📊</div>
                <p className='mb-2 text-theme-secondary'>
                  아직 오늘의 기록이 없습니다
                </p>
                <p className='text-sm text-theme-tertiary'>
                  활동을 시작해보세요
                </p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <div className='min-w-[400px]'>
                  {/* 테이블 헤더 */}
                  <div className='flex gap-2 px-3 py-2 mb-2 text-xs font-medium border-b text-theme-tertiary border-theme-primary/20'>
                    <div className='flex-shrink-0 w-32 text-center'>시간</div>
                    <div className='flex-1 min-w-[200px] text-center'>
                      할 일
                    </div>
                    <div className='flex-shrink-0 w-20 text-center'>
                      집중시간
                    </div>
                    <div className='flex-shrink-0 w-16 text-center'>
                      일시정지
                    </div>
                  </div>

                  {/* 테이블 데이터 */}
                  {todaySessions
                    .filter((session) => session.status === "completed")
                    .sort(
                      (a, b) =>
                        new Date(a.startTime).getTime() -
                        new Date(b.startTime).getTime()
                    )
                    .map((session) => {
                      // 카테고리와 아이템 정보 찾기
                      const category = categories.find(
                        (cat) => cat.id === session.categoryId
                      )
                      const categoryName = category?.name || "알 수 없음"

                      // 아이템 정보 찾기
                      const item = activityItems.find(
                        (item) => item.id === session.activityItemId
                      )
                      const itemName = item?.name || "알 수 없음"

                      // 시간 포맷팅
                      const formatTime = (seconds: number): string => {
                        const hours = Math.floor(seconds / 3600)
                        const minutes = Math.floor((seconds % 3600) / 60)
                        if (hours > 0) {
                          return `${hours}시간 ${minutes}분`
                        } else {
                          return `${minutes}분`
                        }
                      }

                      const startTime = new Date(session.startTime)
                      const endTime = session.endTime
                        ? new Date(session.endTime)
                        : null

                      const startTimeStr = startTime.toLocaleTimeString(
                        "ko-KR",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }
                      )

                      const endTimeStr =
                        endTime?.toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }) || "진행중"

                      const timeRange = `${startTimeStr} ~ ${endTimeStr}`

                      return (
                        <div
                          key={session.id}
                          className='flex items-center gap-2 px-3 py-3 text-sm transition-colors rounded-lg hover:bg-theme-primary/5'
                        >
                          <div className='flex-shrink-0 w-32 font-mono text-center text-theme-secondary whitespace-nowrap'>
                            {timeRange}
                          </div>
                          <div className='flex-1 min-w-[200px] text-theme-primary font-medium text-center'>
                            {itemName}
                          </div>
                          <div className='flex-shrink-0 w-20 text-center text-theme-secondary whitespace-nowrap'>
                            {formatTime(session.activeDuration)}
                          </div>
                          <div className='flex-shrink-0 w-16 text-center text-theme-tertiary'>
                            {session.pauseCount > 0
                              ? `${session.pauseCount}회`
                              : "-"}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 카테고리 수정 모달 */}
        {isEditModalOpen && editingCategory && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-theme-backdrop'>
            <div className='w-full max-w-md p-6 mx-4 rounded-lg shadow-lg bg-theme-secondary'>
              <h3 className='mb-4 text-xl font-semibold text-theme-primary'>
                카테고리 수정
              </h3>
              <div className='space-y-4'>
                <div>
                  <label className='block mb-1 text-sm font-medium text-theme-secondary'>
                    카테고리 이름
                  </label>
                  <input
                    type='text'
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className='w-full px-3 py-2 border rounded-lg border-theme-primary/20 bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='예: 씻기'
                  />
                </div>
                <div>
                  <label className='block mb-1 text-sm font-medium text-theme-secondary'>
                    설명
                  </label>
                  <input
                    type='text'
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    className='w-full px-3 py-2 border rounded-lg border-theme-primary/20 bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='예: 몸을 깨끗하게 씻는 활동'
                  />
                </div>
                <div>
                  <label className='block mb-1 text-sm font-medium text-theme-secondary'>
                    아이콘 (이모지)
                  </label>
                  <input
                    type='text'
                    value={editForm.icon}
                    onChange={(e) =>
                      setEditForm({ ...editForm, icon: e.target.value })
                    }
                    className='w-full px-3 py-2 border rounded-lg border-theme-primary/20 bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='예: 🚿'
                    onFocus={() => setShowIconSuggestions(true)}
                  />

                  {/* 아이콘 추천 */}
                  {showIconSuggestions && (
                    <div className='p-3 mt-2 border rounded-lg bg-theme-primary/5 border-theme-primary/20'>
                      <p className='mb-2 text-xs text-theme-secondary'>
                        추천 아이콘:
                      </p>
                      <div className='grid grid-cols-5 gap-2'>
                        {[
                          "🚿",
                          "🍽️",
                          "📚",
                          "💪",
                          "😴",
                          "🎵",
                          "🎨",
                          "💻",
                          "🏃",
                          "🧘",
                          "📝",
                          "🔧",
                          "🎯",
                          "💡",
                          "🌟",
                        ].map((icon) => (
                          <button
                            key={icon}
                            onClick={() => {
                              setEditForm({
                                ...editForm,
                                icon: icon,
                              })
                              setShowIconSuggestions(false)
                            }}
                            className='flex items-center justify-center w-8 h-8 text-lg transition-colors rounded-lg hover:bg-theme-primary/20'
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowIconSuggestions(false)}
                        className='mt-2 text-xs transition-colors text-theme-tertiary hover:text-theme-primary'
                      >
                        닫기
                      </button>
                    </div>
                  )}
                </div>
                <div className='flex gap-2 pt-4'>
                  <button
                    onClick={handleEditCancel}
                    disabled={isActionLoading}
                    className='flex-1 px-4 py-2 text-white transition-colors bg-gray-500 rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed'
                  >
                    취소
                  </button>
                  <button
                    onClick={handleEditSave}
                    disabled={isActionLoading}
                    className='flex items-center justify-center flex-1 gap-2 px-4 py-2 text-white transition-colors rounded-lg bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-gray-400 disabled:cursor-not-allowed'
                  >
                    {isActionLoading && (
                      <div className='w-4 h-4 border-b-2 border-white rounded-full animate-spin'></div>
                    )}
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 새 카테고리 추가 모달 */}
        {isAddCategoryModalOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-theme-backdrop'>
            <div className='w-full max-w-md p-6 mx-4 rounded-lg shadow-lg bg-theme-secondary'>
              <h3 className='mb-4 text-xl font-semibold text-theme-primary'>
                새 카테고리 추가
              </h3>
              <div className='space-y-4'>
                <div>
                  <label className='block mb-1 text-sm font-medium text-theme-secondary'>
                    카테고리 이름 <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={newCategoryForm.name}
                    onChange={(e) =>
                      setNewCategoryForm({
                        ...newCategoryForm,
                        name: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border rounded-lg border-theme-primary/20 bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='예: 씻기'
                    required
                  />
                </div>
                <div>
                  <label className='block mb-1 text-sm font-medium text-theme-secondary'>
                    설명{" "}
                    <span className='text-xs text-theme-tertiary'>
                      (선택사항)
                    </span>
                  </label>
                  <input
                    type='text'
                    value={newCategoryForm.description}
                    onChange={(e) =>
                      setNewCategoryForm({
                        ...newCategoryForm,
                        description: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border rounded-lg border-theme-primary/20 bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='비워두면 "카테고리명 관련 활동"으로 설정됩니다'
                  />
                </div>
                <div>
                  <label className='block mb-1 text-sm font-medium text-theme-secondary'>
                    아이콘{" "}
                    <span className='text-xs text-theme-tertiary'>
                      (선택사항)
                    </span>
                  </label>
                  <input
                    type='text'
                    value={newCategoryForm.icon}
                    onChange={(e) =>
                      setNewCategoryForm({
                        ...newCategoryForm,
                        icon: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border rounded-lg border-theme-primary/20 bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='비워두면 📝로 설정됩니다'
                    onFocus={() => setShowIconSuggestions(true)}
                  />

                  {/* 아이콘 추천 */}
                  {showIconSuggestions && (
                    <div className='p-3 mt-2 border rounded-lg bg-theme-primary/5 border-theme-primary/20'>
                      <p className='mb-2 text-xs text-theme-secondary'>
                        추천 아이콘:
                      </p>
                      <div className='grid grid-cols-5 gap-2'>
                        {[
                          "🚿",
                          "🍽️",
                          "📚",
                          "💪",
                          "😴",
                          "🎵",
                          "🎨",
                          "💻",
                          "🏃",
                          "🧘",
                          "📝",
                          "🔧",
                          "🎯",
                          "💡",
                          "🌟",
                        ].map((icon) => (
                          <button
                            key={icon}
                            onClick={() => {
                              setNewCategoryForm({
                                ...newCategoryForm,
                                icon: icon,
                              })
                              setShowIconSuggestions(false)
                            }}
                            className='flex items-center justify-center w-8 h-8 text-lg transition-colors rounded-lg hover:bg-theme-primary/20'
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowIconSuggestions(false)}
                        className='mt-2 text-xs transition-colors text-theme-tertiary hover:text-theme-primary'
                      >
                        닫기
                      </button>
                    </div>
                  )}
                </div>
                <div className='flex gap-2 pt-4'>
                  <button
                    onClick={handleAddCategoryCancel}
                    disabled={isActionLoading}
                    className='flex-1 px-4 py-2 text-white transition-colors bg-gray-500 rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed'
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddCategorySave}
                    disabled={isActionLoading}
                    className='flex items-center justify-center flex-1 gap-2 px-4 py-2 text-white transition-colors rounded-lg bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-gray-400 disabled:cursor-not-allowed'
                  >
                    {isActionLoading && (
                      <div className='w-4 h-4 border-b-2 border-white rounded-full animate-spin'></div>
                    )}
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 카테고리 삭제 확인 모달 */}
        {isDeleteCategoryModalOpen && categoryToDelete && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-theme-backdrop'>
            <div className='w-full max-w-md p-6 mx-4 rounded-lg shadow-lg bg-theme-secondary'>
              <div className='text-center'>
                <div className='flex items-center justify-center mb-4'>
                  <div className='p-3 bg-red-100 rounded-full dark:bg-red-900/20'>
                    <Trash2 className='w-8 h-8 text-red-500' />
                  </div>
                </div>
                <h3 className='mb-2 text-xl font-semibold text-theme-primary'>
                  카테고리 삭제
                </h3>
                <p className='mb-6 text-theme-secondary'>
                  <span className='font-semibold text-theme-primary'>
                    {categoryToDelete.name}
                  </span>
                  을(를) 정말로 삭제하시겠습니까?
                </p>
                <p className='mb-6 text-sm text-theme-tertiary'>
                  이 카테고리의 모든 활동 아이템이 함께 삭제됩니다.
                </p>
                <div className='flex gap-3'>
                  <button
                    onClick={handleDeleteCategoryCancel}
                    disabled={isActionLoading}
                    className='flex-1 px-4 py-3 text-white transition-colors bg-gray-500 rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed'
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteCategoryConfirm}
                    disabled={isActionLoading}
                    className='flex items-center justify-center flex-1 gap-2 px-4 py-3 text-white transition-colors bg-red-500 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed'
                  >
                    {isActionLoading && (
                      <div className='w-4 h-4 border-b-2 border-white rounded-full animate-spin'></div>
                    )}
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 타이머 모달 */}
        {isTimerModalOpen && selectedActivity && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-theme-backdrop'>
            <div className='w-full max-w-md p-8 mx-4 rounded-lg shadow-lg bg-theme-secondary'>
              <div className='text-center'>
                <h3 className='mb-2 text-xl font-semibold text-theme-primary'>
                  {selectedActivity.name}
                </h3>
                <div className='mb-6 font-mono text-4xl text-accent-theme'>
                  {formatTime(elapsedTime)}
                </div>

                <div className='space-y-3'>
                  <div className='flex justify-center gap-3'>
                    {timerState.isPaused ? (
                      <button
                        onClick={handleResumeTimer}
                        className='flex items-center gap-2 px-4 py-2 text-white transition-colors bg-green-500 rounded-lg hover:bg-green-600'
                      >
                        <Play className='w-4 h-4' />
                        재개
                      </button>
                    ) : (
                      <button
                        onClick={handlePauseTimer}
                        className='flex items-center gap-2 px-4 py-2 text-white transition-colors bg-yellow-500 rounded-lg hover:bg-yellow-600'
                      >
                        <Pause className='w-4 h-4' />
                        일시정지
                      </button>
                    )}

                    <button
                      onClick={handleCompleteTimer}
                      className='flex items-center gap-2 px-4 py-2 text-white transition-colors bg-green-500 rounded-lg hover:bg-green-600'
                    >
                      <CheckCircle className='w-4 h-4' />
                      완료
                    </button>

                    <button
                      onClick={handleCancelTimer}
                      className='flex items-center gap-2 px-4 py-2 text-white transition-colors bg-red-500 rounded-lg hover:bg-red-600'
                    >
                      <Square className='w-4 h-4' />
                      취소
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 집중 상태 확인 모달 */}
        {timerState.showFocusCheckModal && (
          <div className='fixed inset-0 flex items-center justify-center bg-theme-backdrop z-60'>
            <div className='w-full max-w-md p-8 mx-4 rounded-lg shadow-lg bg-theme-secondary'>
              <div className='text-center'>
                <h3 className='mb-4 text-xl font-semibold text-theme-primary'>
                  집중 상태 확인
                </h3>
                <p className='mb-6 text-theme-secondary'>
                  지금 집중하고 계신가요?
                </p>

                <div className='flex justify-center gap-3 mb-4'>
                  <button
                    onClick={() => handleFocusCheck(true)}
                    className='flex items-center gap-2 px-6 py-3 text-lg font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600'
                  >
                    <CheckCircle className='w-5 h-5' />
                    집중 중
                  </button>
                  <button
                    onClick={() => handleFocusCheck(false)}
                    className='flex items-center gap-2 px-6 py-3 text-lg font-medium text-white transition-colors bg-orange-500 rounded-lg hover:bg-orange-600'
                  >
                    <Pause className='w-5 h-5' />
                    집중 안함
                  </button>
                </div>

                {/* 알림 소리 끄기 버튼 */}
                {timerState.alertInterval && (
                  <div className='mt-4'>
                    <button
                      onClick={stopAlertSound}
                      className='flex items-center justify-center w-full gap-2 px-4 py-2 text-sm text-white transition-colors bg-gray-500 rounded-lg hover:bg-gray-600'
                    >
                      🔇 알림 소리 끄기
                    </button>
                  </div>
                )}

                <p className='mt-4 text-xs text-theme-tertiary'>
                  집중 상태를 선택해주세요
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PWA 설치 프롬프트 */}
        <PWAInstallPrompt />
      </div>
    </div>
  )
}
