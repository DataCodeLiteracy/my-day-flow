"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useTimer } from "@/contexts/TimerContext"
import { ActivityCategory, ActivityItem, TimerSession } from "@/types/activity"
import { ActivityService } from "@/services/activityService"

export default function ActivityCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const { userUid, userDocId, isLoggedIn, loading } = useAuth()
  const { timerState, startTimer, pauseTimer, resumeTimer, stopTimer } =
    useTimer()

  const categoryId = params.categoryId as string

  const [category, setCategory] = useState<ActivityCategory | null>(null)
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [todaySessions, setTodaySessions] = useState<TimerSession[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<{
    itemId: string
    name: string
  } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ActivityItem | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    estimatedDuration: 0,
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newItemForm, setNewItemForm] = useState({
    name: "",
    description: "",
    estimatedDuration: 0,
  })
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ActivityItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [completedSession, setCompletedSession] = useState<TimerSession | null>(
    null
  )
  const [feedbackForm, setFeedbackForm] = useState({
    feedback: "",
    rating: 0,
  })

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  useEffect(() => {
    if (!isLoggedIn || !userDocId || !categoryId) return

    const loadData = async () => {
      try {
        setError(null)

        // getCategories에서 자동으로 초기화됨

        const [itemsData, sessionsData] = await Promise.all([
          ActivityService.getActivityItems(categoryId, userDocId!),
          ActivityService.getTodaySessions(userUid!),
        ])
        setActivityItems(itemsData)
        setTodaySessions(sessionsData)

        // 카테고리 정보 가져오기
        const categories = await ActivityService.getCategories(userDocId!)
        const foundCategory = categories.find((cat) => cat.id === categoryId)
        if (foundCategory) {
          setCategory(foundCategory)
        } else {
          setError("카테고리를 찾을 수 없습니다.")
        }
      } catch (error) {
        console.error("Error loading data:", error)
        setError("데이터를 불러오는 중 오류가 발생했습니다.")
      }
    }

    loadData()
  }, [isLoggedIn, userDocId, categoryId])

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
      await startTimer(itemId, categoryId, name)
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
      const completedSession = await stopTimer(true)
      setIsTimerModalOpen(false)
      setSelectedActivity(null)
      setElapsedTime(0)

      // 피드백 모달 열기
      if (completedSession) {
        setCompletedSession(completedSession)
        setIsFeedbackModalOpen(true)
      }

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

  // 피드백 모달 닫기
  const handleFeedbackCancel = () => {
    setIsFeedbackModalOpen(false)
    setCompletedSession(null)
    setFeedbackForm({ feedback: "", rating: 0 })
  }

  // 피드백 저장
  const handleFeedbackSave = async () => {
    if (!completedSession || feedbackForm.rating === 0) {
      setError("평점을 선택해주세요.")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      await ActivityService.updateSessionFeedback(
        completedSession.id,
        feedbackForm.feedback,
        feedbackForm.rating
      )

      setIsFeedbackModalOpen(false)
      setCompletedSession(null)
      setFeedbackForm({ feedback: "", rating: 0 })

      // 데이터 새로고침
      if (userUid) {
        const sessionsData = await ActivityService.getTodaySessions(userUid)
        setTodaySessions(sessionsData)
      }
    } catch (error) {
      console.error("Error saving feedback:", error)
      setError("피드백 저장 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
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

  // 아이템별 오늘의 세션 가져오기
  const getItemSessions = (itemId: string) => {
    return todaySessions.filter(
      (session) =>
        session.activityItemId === itemId && session.status === "completed"
    )
  }

  // 아이템 수정 시작
  const handleEditStart = (item: ActivityItem) => {
    setEditingItem(item)
    setEditForm({
      name: item.name,
      description: item.description || "",
      estimatedDuration: item.estimatedDuration,
    })
    setIsEditModalOpen(true)
  }

  // 아이템 수정 취소
  const handleEditCancel = () => {
    setIsEditModalOpen(false)
    setEditingItem(null)
    setEditForm({ name: "", description: "", estimatedDuration: 0 })
  }

  // 아이템 수정 저장
  const handleEditSave = async () => {
    console.log("🔍 handleEditSave called")
    console.log("📝 Editing item:", editingItem)
    console.log("📝 Form data:", editForm)

    if (!editingItem || !editForm.name.trim()) {
      console.log("❌ Validation failed")
      setError("아이템 이름을 입력해주세요.")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log("📤 Updating item with ID:", editingItem.id)
      await ActivityService.updateActivityItem(editingItem.id, {
        name: editForm.name,
        description: editForm.description,
        estimatedDuration: editForm.estimatedDuration,
      })

      console.log("✅ Item updated successfully")
      setIsEditModalOpen(false)
      setEditingItem(null)
      setEditForm({ name: "", description: "", estimatedDuration: 0 })

      // 데이터 새로고침
      if (userUid) {
        const itemsData = await ActivityService.getActivityItems(
          categoryId,
          userDocId!
        )
        console.log("🔄 Refreshed items after update:", itemsData.length)
        setActivityItems(itemsData)
      }
    } catch (error) {
      console.error("❌ Error updating item:", error)
      setError("아이템 수정 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 아이템 삭제 시작
  const handleDeleteItemStart = (item: ActivityItem) => {
    setItemToDelete(item)
    setIsDeleteModalOpen(true)
  }

  // 아이템 삭제 취소
  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false)
    setItemToDelete(null)
  }

  // 아이템 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    try {
      setIsLoading(true)
      setError(null)

      await ActivityService.deleteActivityItem(itemToDelete.id)

      setIsDeleteModalOpen(false)
      setItemToDelete(null)

      // 데이터 새로고침
      if (userUid) {
        const itemsData = await ActivityService.getActivityItems(
          categoryId,
          userDocId!
        )
        setActivityItems(itemsData)
      }
    } catch (error) {
      console.error("Error deleting item:", error)
      setError("아이템 삭제 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 새 아이템 추가 시작
  const handleAddItemStart = () => {
    setIsAddModalOpen(true)
    setNewItemForm({ name: "", description: "", estimatedDuration: 0 })
  }

  // 새 아이템 추가 취소
  const handleAddItemCancel = () => {
    setIsAddModalOpen(false)
    setNewItemForm({ name: "", description: "", estimatedDuration: 0 })
  }

  // 새 아이템 추가 저장
  const handleAddItemSave = async () => {
    console.log("🔍 handleAddItemSave called")
    console.log("📝 Form data:", newItemForm)
    console.log("📂 Category ID:", categoryId)
    console.log("👤 User Doc ID:", userDocId)
    console.log("📊 Current items count:", activityItems.length)

    if (!newItemForm.name.trim()) {
      console.log("❌ Validation failed: name is empty")
      setError("아이템 이름을 입력해주세요.")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const itemData = {
        categoryId,
        name: newItemForm.name,
        description: newItemForm.description,
        estimatedDuration: newItemForm.estimatedDuration,
        order: activityItems.length,
        isActive: true,
        userId: userDocId!, // userId 추가
      }

      console.log("📤 Creating item with data:", itemData)

      await ActivityService.createActivityItem(itemData)

      console.log("✅ Item created successfully, refreshing data...")
      setIsAddModalOpen(false)
      setNewItemForm({ name: "", description: "", estimatedDuration: 0 })

      // 데이터 새로고침
      if (userUid) {
        const itemsData = await ActivityService.getActivityItems(
          categoryId,
          userDocId!
        )
        console.log("🔄 Refreshed items:", itemsData.length)
        setActivityItems(itemsData)
      }
    } catch (error) {
      console.error("❌ Error creating item:", error)
      setError("아이템 생성 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
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
      {/* 상단 네비게이션 바 */}
      <div className='bg-theme-secondary border-b border-theme-primary/20'>
        <div className='container mx-auto px-4 py-3'>
          <div className='flex items-center justify-between relative'>
            <button
              onClick={() => router.back()}
              className='flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors'
            >
              <ArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold text-theme-primary'>
              나의 하루 리포트
            </h1>
            <div className='w-9' /> {/* 공간 맞추기 */}
          </div>
        </div>
      </div>

      <div className='container mx-auto px-4 py-6'>
        {/* 카테고리 정보 섹션 */}
        <div className='mb-6'>
          <div className='flex items-start justify-between mb-4'>
            <div className='flex-1'>
              <h2 className='text-xl font-bold text-theme-primary flex items-center gap-2 mb-1'>
                <span className='text-2xl'>{category?.icon}</span>
                {category?.name}
              </h2>
              <p className='text-theme-secondary text-sm'>
                {category?.description}
              </p>
            </div>
            <button
              onClick={handleAddItemStart}
              className='bg-accent-theme hover:bg-accent-theme-secondary text-white p-3 rounded-lg transition-colors shadow-md ml-3'
              title='새 아이템 추가'
            >
              <Plus className='h-5 w-5' />
            </button>
          </div>
        </div>

        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
            </div>
          </div>
        )}

        {/* 타이머 실행 중 상태 표시 */}
        {timerState.isRunning && (
          <div className='mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
            <div className='flex items-center gap-2'>
              <Clock className='h-4 w-4 text-green-500 animate-pulse' />
              <p className='text-green-700 dark:text-green-400 text-sm font-medium'>
                ⏰{" "}
                <span className='font-semibold'>{timerState.activityName}</span>{" "}
                진행 중
              </p>
            </div>
          </div>
        )}

        {/* 활동 아이템 리스트 */}
        <div className='bg-theme-secondary rounded-lg py-6 px-3 shadow-sm mb-6'>
          <div className='space-y-3'>
            {activityItems.length === 0 ? (
              <div className='text-center py-8'>
                <div className='text-4xl mb-4'>📝</div>
                <p className='text-theme-secondary mb-2'>
                  아직 등록된 아이템이 없습니다
                </p>
                <p className='text-sm text-theme-tertiary'>
                  + 버튼을 눌러 새로운 아이템을 추가해보세요
                </p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {activityItems.map((item) => {
                  const itemSessions = getItemSessions(item.id)
                  const totalTime = itemSessions.reduce(
                    (sum, session) => sum + session.activeDuration,
                    0
                  )

                  return (
                    <div
                      key={item.id}
                      className='bg-theme-primary/10 border border-theme-primary/20 rounded-lg p-4 hover:bg-theme-primary/20 hover:border-theme-primary/40 transition-all duration-200'
                    >
                      {/* 아이템 정보 */}
                      <div className='mb-4'>
                        <div className='flex items-start justify-between mb-2'>
                          <h3 className='text-lg font-semibold text-theme-primary flex-1'>
                            {item.name}
                          </h3>
                          <div className='flex items-center gap-1 ml-2'>
                            <button
                              onClick={() => handleEditStart(item)}
                              className='text-blue-500 hover:text-blue-700 p-2 rounded-lg transition-colors'
                              title='수정'
                            >
                              <Edit className='h-4 w-4' />
                            </button>
                            <button
                              onClick={() => handleDeleteItemStart(item)}
                              className='text-red-500 hover:text-red-700 p-2 rounded-lg transition-colors'
                              title='삭제'
                            >
                              <Trash2 className='h-4 w-4' />
                            </button>
                          </div>
                        </div>
                        <p className='text-sm text-theme-secondary mb-2'>
                          {item.description}
                        </p>
                        <div className='flex items-center gap-4 text-xs text-theme-tertiary'>
                          <span>예상: {item.estimatedDuration}분</span>
                          <span>오늘: {Math.floor(totalTime / 60)}분</span>
                        </div>
                      </div>

                      {/* 타이머 시작 버튼 */}
                      <button
                        onClick={() => handleStartActivity(item.id, item.name)}
                        disabled={timerState.isRunning}
                        className='w-full flex items-center justify-center gap-3 bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:transform-none disabled:scale-100 font-medium text-base'
                        title='활동 시작'
                      >
                        <Play className='h-5 w-5' />
                        <span>타이머 시작</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 새 아이템 추가 모달 */}
        {isAddModalOpen && (
          <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
            <div className='bg-theme-secondary rounded-lg p-6 shadow-lg max-w-md w-full mx-4'>
              <h3 className='text-xl font-semibold text-theme-primary mb-4'>
                새 아이템 추가
              </h3>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-theme-secondary mb-1'>
                    아이템 이름
                  </label>
                  <input
                    type='text'
                    value={newItemForm.name}
                    onChange={(e) =>
                      setNewItemForm({ ...newItemForm, name: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='예: 양치하기'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-theme-secondary mb-1'>
                    설명
                  </label>
                  <input
                    type='text'
                    value={newItemForm.description}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        description: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='예: 치아를 깨끗하게 닦기'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-theme-secondary mb-1'>
                    예상 시간 (분)
                  </label>
                  <input
                    type='number'
                    value={newItemForm.estimatedDuration || ""}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        estimatedDuration: parseInt(e.target.value) || 0,
                      })
                    }
                    className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='5'
                  />
                </div>
                <div className='flex gap-2 pt-4'>
                  <button
                    onClick={handleAddItemCancel}
                    disabled={isLoading}
                    className='flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors'
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddItemSave}
                    disabled={isLoading}
                    className='flex-1 bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2'
                  >
                    {isLoading && (
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                    )}
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 아이템 수정 모달 */}
        {isEditModalOpen && editingItem && (
          <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
            <div className='bg-theme-secondary rounded-lg p-6 shadow-lg max-w-md w-full mx-4'>
              <h3 className='text-xl font-semibold text-theme-primary mb-4'>
                아이템 수정
              </h3>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-theme-secondary mb-1'>
                    아이템 이름
                  </label>
                  <input
                    type='text'
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='예: 양치하기'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-theme-secondary mb-1'>
                    설명
                  </label>
                  <input
                    type='text'
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='예: 치아를 깨끗하게 닦기'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-theme-secondary mb-1'>
                    예상 시간 (분)
                  </label>
                  <input
                    type='number'
                    value={editForm.estimatedDuration || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        estimatedDuration: parseInt(e.target.value) || 0,
                      })
                    }
                    className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    placeholder='5'
                  />
                </div>
                <div className='flex gap-2 pt-4'>
                  <button
                    onClick={handleEditCancel}
                    disabled={isLoading}
                    className='flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors'
                  >
                    취소
                  </button>
                  <button
                    onClick={handleEditSave}
                    disabled={isLoading}
                    className='flex-1 bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2'
                  >
                    {isLoading && (
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                    )}
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        {isDeleteModalOpen && itemToDelete && (
          <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
            <div className='bg-theme-secondary rounded-lg p-6 shadow-lg max-w-md w-full mx-4'>
              <div className='text-center'>
                <div className='flex items-center justify-center mb-4'>
                  <div className='bg-red-100 dark:bg-red-900/20 p-3 rounded-full'>
                    <Trash2 className='h-8 w-8 text-red-500' />
                  </div>
                </div>
                <h3 className='text-xl font-semibold text-theme-primary mb-2'>
                  아이템 삭제
                </h3>
                <p className='text-theme-secondary mb-6'>
                  <span className='font-semibold text-theme-primary'>
                    {itemToDelete.name}
                  </span>
                  을(를) 정말로 삭제하시겠습니까?
                </p>
                <p className='text-sm text-theme-tertiary mb-6'>
                  이 작업은 되돌릴 수 없습니다.
                </p>
                <div className='flex gap-3'>
                  <button
                    onClick={handleDeleteCancel}
                    disabled={isLoading}
                    className='flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors'
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isLoading}
                    className='flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2'
                  >
                    {isLoading && (
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
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
          <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
            <div className='bg-theme-secondary rounded-lg p-8 shadow-lg max-w-md w-full mx-4'>
              <div className='text-center'>
                <h3 className='text-xl font-semibold text-theme-primary mb-2'>
                  {selectedActivity.name}
                </h3>
                <div className='text-4xl font-mono text-accent-theme mb-6'>
                  {formatTime(elapsedTime)}
                </div>

                <div className='space-y-3 w-full'>
                  {timerState.isPaused ? (
                    <button
                      onClick={handleResumeTimer}
                      className='w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors'
                    >
                      <Play className='h-5 w-5' />
                      재개
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseTimer}
                      className='w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg transition-colors'
                    >
                      <Pause className='h-5 w-5' />
                      일시정지
                    </button>
                  )}

                  <button
                    onClick={handleCompleteTimer}
                    className='w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors'
                  >
                    <CheckCircle className='h-5 w-5' />
                    완료
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 피드백 모달 */}
        {isFeedbackModalOpen && completedSession && (
          <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
            <div className='bg-theme-secondary rounded-lg p-8 shadow-lg max-w-md w-full mx-4'>
              <div className='text-center mb-6'>
                <h3 className='text-xl font-semibold text-theme-primary mb-2'>
                  활동 완료!
                </h3>
                <p className='text-theme-tertiary'>
                  {completedSession.activityName || "활동"}에 대한 피드백을
                  남겨주세요
                </p>
              </div>

              <div className='space-y-6'>
                {/* 평점 선택 */}
                <div>
                  <label className='block text-sm font-medium text-theme-primary mb-3'>
                    평점 (필수)
                  </label>
                  <div className='flex justify-center gap-2'>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() =>
                          setFeedbackForm((prev) => ({ ...prev, rating }))
                        }
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold transition-colors ${
                          feedbackForm.rating >= rating
                            ? "bg-yellow-400 text-yellow-900"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                {/* 피드백 입력 */}
                <div>
                  <label className='block text-sm font-medium text-theme-primary mb-3'>
                    피드백 (선택사항)
                  </label>
                  <textarea
                    value={feedbackForm.feedback}
                    onChange={(e) =>
                      setFeedbackForm((prev) => ({
                        ...prev,
                        feedback: e.target.value,
                      }))
                    }
                    placeholder='이번 활동에 대한 소감이나 개선점을 적어주세요...'
                    className='w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-theme-primary text-theme-primary placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-theme focus:border-transparent resize-none'
                  />
                </div>

                {/* 버튼 */}
                <div className='flex gap-3'>
                  <button
                    onClick={handleFeedbackCancel}
                    disabled={isLoading}
                    className='flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors'
                  >
                    건너뛰기
                  </button>
                  <button
                    onClick={handleFeedbackSave}
                    disabled={isLoading || feedbackForm.rating === 0}
                    className='flex-1 bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2'
                  >
                    {isLoading && (
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                    )}
                    저장
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
