"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Clock,
  Play,
  Pause,
  Edit,
  Plus,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import {
  ActivityCategory,
  ActivityItem,
  TimerSession,
  PauseRecord,
} from "@/types/activity"
import { ActivityService } from "@/services/activityService"

export default function DailyRecordsPage() {
  const router = useRouter()
  const { userUid, isLoggedIn, loading } = useAuth()

  const [categories, setCategories] = useState<ActivityCategory[]>([])
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [todaySessions, setTodaySessions] = useState<TimerSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<TimerSession | null>(
    null
  )
  const [editForm, setEditForm] = useState({
    startTime: "",
    endTime: "",
    activeDuration: 0,
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newSessionForm, setNewSessionForm] = useState({
    categoryId: "",
    activityItemId: "",
    startTime: "",
    endTime: "",
    activeDuration: 0,
    pauseCount: 0,
  })
  const [editCount, setEditCount] = useState(0)
  const [addCount, setAddCount] = useState(0)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedDateSessions, setSelectedDateSessions] = useState<
    TimerSession[]
  >([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<TimerSession | null>(
    null
  )

  // 시간 input refs
  const editStartTimeRef = useRef<HTMLInputElement>(null)
  const editEndTimeRef = useRef<HTMLInputElement>(null)
  const addStartTimeRef = useRef<HTMLInputElement>(null)
  const addEndTimeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, loading, router])

  // 선택된 날짜의 세션 데이터 로드
  useEffect(() => {
    if (isLoggedIn && !loading && userUid) {
      loadSessionsForDate(selectedDate)
    }
  }, [isLoggedIn, loading, userUid, selectedDate])

  useEffect(() => {
    if (!isLoggedIn || !userUid) return

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

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

        // 오늘의 수정/추가 횟수 가져오기 (로컬 스토리지에서)
        const today = new Date().toDateString()
        const savedEditCount = localStorage.getItem(`editCount_${today}`)
        const savedAddCount = localStorage.getItem(`addCount_${today}`)
        setEditCount(savedEditCount ? parseInt(savedEditCount) : 0)
        setAddCount(savedAddCount ? parseInt(savedAddCount) : 0)
      } catch (error) {
        console.error("Error loading data:", error)
        setError("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isLoggedIn, userUid])

  // 시간 포맷팅 (시간:분:초)
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // 시간 문자열을 Date로 변환
  const parseTimeString = (timeStr: string): Date => {
    const today = new Date()
    const [hours, minutes] = timeStr.split(":").map(Number)
    const date = new Date(today)
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  // Date를 시간 문자열로 변환
  const formatTimeString = (date: Date): string => {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  // 시작시간과 종료시간으로부터 집중시간(분) 계산
  const calculateActiveDuration = (
    startTime: string,
    endTime: string
  ): number => {
    if (!startTime || !endTime) return 0

    try {
      const start = parseTimeString(startTime)
      const end = parseTimeString(endTime)

      if (end <= start) return 0

      const diffMs = end.getTime() - start.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))

      return diffMinutes
    } catch (error) {
      console.error("Error calculating active duration:", error)
      return 0
    }
  }

  // 시간 input 클릭 시 시간 선택기 열기
  const handleTimeInputClick = (
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    if (inputRef.current && "showPicker" in inputRef.current) {
      try {
        ;(inputRef.current as any).showPicker()
      } catch (error) {
        // showPicker가 지원되지 않는 브라우저에서는 focus로 대체
        inputRef.current.focus()
      }
    }
  }

  // 수정 시작
  const handleEditStart = (session: TimerSession) => {
    if (editCount >= 10) {
      setError("하루 수정 횟수를 초과했습니다. (최대 10회)")
      return
    }

    setEditingSession(session)
    setEditForm({
      startTime: formatTimeString(new Date(session.startTime)),
      endTime: session.endTime
        ? formatTimeString(new Date(session.endTime))
        : "",
      activeDuration: Math.floor(session.activeDuration / 60), // 분 단위로 변환
    })
    setIsEditModalOpen(true)
  }

  // 수정 폼 시간 변경 핸들러
  const handleEditTimeChange = (
    field: "startTime" | "endTime",
    value: string
  ) => {
    const newForm = { ...editForm, [field]: value }

    // 시작시간과 종료시간이 모두 있으면 자동으로 집중시간 계산
    if (field === "startTime" && newForm.endTime) {
      newForm.activeDuration = calculateActiveDuration(value, newForm.endTime)
    } else if (field === "endTime" && newForm.startTime) {
      newForm.activeDuration = calculateActiveDuration(newForm.startTime, value)
    }

    setEditForm(newForm)
  }

  // 수정 취소
  const handleEditCancel = () => {
    setIsEditModalOpen(false)
    setEditingSession(null)
    setEditForm({ startTime: "", endTime: "", activeDuration: 0 })
  }

  // 수정 저장
  const handleEditSave = async () => {
    if (!editingSession) return

    try {
      setIsActionLoading(true)
      setError(null)

      const startTime = parseTimeString(editForm.startTime)
      const endTime = editForm.endTime
        ? parseTimeString(editForm.endTime)
        : null
      const activeDuration = editForm.activeDuration * 60 // 초 단위로 변환

      await ActivityService.updateTimerSession(editingSession.id, {
        startTime,
        endTime: endTime || undefined,
        activeDuration,
        totalDuration: endTime
          ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
          : 0,
      })

      // 수정 횟수 증가
      const newEditCount = editCount + 1
      setEditCount(newEditCount)
      const today = new Date().toDateString()
      localStorage.setItem(`editCount_${today}`, newEditCount.toString())

      setIsEditModalOpen(false)
      setEditingSession(null)

      // 데이터 새로고침
      const sessionsData = await ActivityService.getTodaySessions(userUid!)
      setTodaySessions(sessionsData)
      // 선택된 날짜의 세션도 새로고침
      await loadSessionsForDate(selectedDate)
    } catch (error) {
      console.error("Error updating session:", error)
      setError("세션 수정 중 오류가 발생했습니다.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // 삭제 시작
  const handleDeleteStart = (session: TimerSession) => {
    setSessionToDelete(session)
    setIsDeleteModalOpen(true)
  }

  // 삭제 취소
  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false)
    setSessionToDelete(null)
  }

  // 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return

    try {
      setIsActionLoading(true)
      setError(null)

      await ActivityService.deleteTimerSession(sessionToDelete.id)

      setIsDeleteModalOpen(false)
      setSessionToDelete(null)

      // 데이터 새로고침
      const sessionsData = await ActivityService.getTodaySessions(userUid!)
      setTodaySessions(sessionsData)
      // 선택된 날짜의 세션도 새로고침
      await loadSessionsForDate(selectedDate)
    } catch (error) {
      console.error("Error deleting session:", error)
      setError("세션 삭제 중 오류가 발생했습니다.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // 새 세션 추가 시작
  const handleAddSessionStart = () => {
    if (addCount >= 10) {
      setError("하루 추가 횟수를 초과했습니다. (최대 10회)")
      return
    }

    // 선택된 날짜가 오늘이 아닌 경우 오늘로 이동
    if (selectedDate.toDateString() !== new Date().toDateString()) {
      setSelectedDate(new Date())
    }

    setNewSessionForm({
      categoryId: "",
      activityItemId: "",
      startTime: "",
      endTime: "",
      activeDuration: 0,
      pauseCount: 0,
    })
    setIsAddModalOpen(true)
  }

  // 추가 폼 시간 변경 핸들러
  const handleAddTimeChange = (
    field: "startTime" | "endTime",
    value: string
  ) => {
    const newForm = { ...newSessionForm, [field]: value }

    // 시작시간과 종료시간이 모두 있으면 자동으로 집중시간 계산
    if (field === "startTime" && newForm.endTime) {
      newForm.activeDuration = calculateActiveDuration(value, newForm.endTime)
    } else if (field === "endTime" && newForm.startTime) {
      newForm.activeDuration = calculateActiveDuration(newForm.startTime, value)
    }

    setNewSessionForm(newForm)
  }

  // 새 세션 추가 취소
  const handleAddSessionCancel = () => {
    setIsAddModalOpen(false)
    setNewSessionForm({
      categoryId: "",
      activityItemId: "",
      startTime: "",
      endTime: "",
      activeDuration: 0,
      pauseCount: 0,
    })
  }

  // 새 세션 추가 저장
  const handleAddSessionSave = async () => {
    if (
      !newSessionForm.categoryId ||
      !newSessionForm.activityItemId ||
      !newSessionForm.startTime
    ) {
      setError("필수 정보를 모두 입력해주세요.")
      return
    }

    try {
      setIsActionLoading(true)
      setError(null)

      const startTime = parseTimeString(newSessionForm.startTime)
      const endTime = newSessionForm.endTime
        ? parseTimeString(newSessionForm.endTime)
        : null
      const activeDuration = newSessionForm.activeDuration * 60

      await ActivityService.createTimerSession({
        userId: userUid!,
        activityItemId: newSessionForm.activityItemId,
        categoryId: newSessionForm.categoryId,
        startTime,
        endTime: endTime || undefined,
        totalDuration: endTime
          ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
          : 0,
        activeDuration,
        pauseCount: newSessionForm.pauseCount,
        status: endTime ? "completed" : "active",
      })

      // 추가 횟수 증가
      const newAddCount = addCount + 1
      setAddCount(newAddCount)
      const today = new Date().toDateString()
      localStorage.setItem(`addCount_${today}`, newAddCount.toString())

      setIsAddModalOpen(false)
      setNewSessionForm({
        categoryId: "",
        activityItemId: "",
        startTime: "",
        endTime: "",
        activeDuration: 0,
        pauseCount: 0,
      })

      // 데이터 새로고침
      const sessionsData = await ActivityService.getTodaySessions(userUid!)
      setTodaySessions(sessionsData)
      // 선택된 날짜의 세션도 새로고침
      await loadSessionsForDate(selectedDate)
    } catch (error) {
      console.error("Error creating session:", error)
      setError("세션 생성 중 오류가 발생했습니다.")
    } finally {
      setIsActionLoading(false)
    }
  }

  // 카테고리별 아이템 필터링
  const getItemsByCategory = (categoryId: string) => {
    return activityItems.filter((item) => item.categoryId === categoryId)
  }

  // 선택된 날짜의 세션 데이터 불러오기
  const loadSessionsForDate = async (date: Date) => {
    if (!userUid) return

    try {
      const sessions = await ActivityService.getSessionsByDate(userUid, date)
      setSelectedDateSessions(sessions)
    } catch (error) {
      console.error("Error loading sessions for date:", error)
      setError("세션 데이터를 불러오는 중 오류가 발생했습니다.")
    }
  }

  // 날짜 네비게이션
  const handlePreviousDay = async () => {
    const previousDay = new Date(selectedDate)
    previousDay.setDate(previousDay.getDate() - 1)
    setSelectedDate(previousDay)
    await loadSessionsForDate(previousDay)
  }

  const handleNextDay = async () => {
    const nextDay = new Date(selectedDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setSelectedDate(nextDay)
    await loadSessionsForDate(nextDay)
  }

  const handleToday = async () => {
    const today = new Date()
    setSelectedDate(today)
    await loadSessionsForDate(today)
  }

  // 일시정지 기록을 포함한 세션 분할 (활동 구간만)
  const getSessionSegments = (session: TimerSession) => {
    const segments = []
    const startTime = new Date(session.startTime)
    const endTime = session.endTime ? new Date(session.endTime) : new Date()

    // 일시정지 기록을 시간순으로 정렬
    const pauseRecords = session.pauseRecords || []
    console.log("Session pauseRecords:", pauseRecords) // 디버깅용
    const sortedPauses = pauseRecords.sort(
      (a, b) =>
        new Date(a.pauseTime).getTime() - new Date(b.pauseTime).getTime()
    )

    // 일시정지 기록이 없는 경우 전체 세션을 하나의 구간으로
    if (sortedPauses.length === 0) {
      const totalDuration = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000
      )
      segments.push({
        startTime: startTime,
        endTime: endTime,
        duration: totalDuration,
        pauseCount: 0,
      })
      return segments
    }

    let currentStart = startTime

    for (let i = 0; i < sortedPauses.length; i++) {
      const pause = sortedPauses[i]
      const pauseStart = new Date(pause.pauseTime)
      const pauseEnd = new Date(pause.resumeTime || pause.pauseTime)

      // 일시정지 전까지의 활동 구간
      if (currentStart < pauseStart) {
        const segmentDuration = Math.floor(
          (pauseStart.getTime() - currentStart.getTime()) / 1000
        )

        segments.push({
          startTime: currentStart,
          endTime: pauseStart,
          duration: segmentDuration,
          pauseCount: 0,
        })
      }

      currentStart = pauseEnd
    }

    // 마지막 활동 구간 (일시정지 후 ~ 종료)
    if (currentStart < endTime) {
      const segmentDuration = Math.floor(
        (endTime.getTime() - currentStart.getTime()) / 1000
      )

      segments.push({
        startTime: currentStart,
        endTime: endTime,
        duration: segmentDuration,
        pauseCount: 0,
      })
    }

    return segments
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

  const allSessions = selectedDateSessions.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  return (
    <>
      <style jsx global>{`
        select option {
          background-color: var(--theme-background);
          color: var(--theme-primary);
        }

        select:focus option {
          background-color: var(--theme-background);
          color: var(--theme-primary);
        }

        @media (prefers-color-scheme: dark) {
          select option {
            background-color: #1f2937;
            color: #f9fafb;
          }

          select:focus option {
            background-color: #1f2937;
            color: #f9fafb;
          }
        }
      `}</style>
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
                데일리 리포트 상세 기록
              </h1>
              <div className='w-9' /> {/* 공간 맞추기 */}
            </div>
          </div>
        </div>

        <div className='container mx-auto px-4 py-6'>
          {/* 수정/추가 횟수 표시 */}
          <div className='mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <AlertCircle className='h-4 w-4 text-blue-500' />
                <p className='text-blue-700 dark:text-blue-400 text-sm'>
                  오늘 수정 횟수: {editCount}/10회
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <AlertCircle className='h-4 w-4 text-blue-500' />
                <p className='text-blue-700 dark:text-blue-400 text-sm'>
                  오늘 추가 횟수: {addCount}/10회
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
              <div className='flex items-center gap-2'>
                <AlertCircle className='h-5 w-5 text-red-500' />
                <p className='text-red-700 dark:text-red-400 text-sm'>
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* 세션 리스트 */}
          <div className='bg-theme-secondary rounded-lg py-6 px-3 shadow-sm'>
            <div className='mb-4'>
              <div className='flex items-center justify-between mb-2'>
                <h2 className='text-xl font-semibold text-theme-primary flex items-center gap-2'>
                  <Clock className='h-5 w-5' />
                  데일리 리포트 상세 기록
                </h2>
                <button
                  onClick={handleAddSessionStart}
                  disabled={addCount >= 10}
                  className='flex items-center gap-1 text-accent-theme hover:text-accent-theme-secondary disabled:text-gray-400 disabled:cursor-not-allowed transition-colors bg-accent-theme/10 hover:bg-accent-theme/20 disabled:bg-gray-100 px-3 py-1 rounded-lg'
                >
                  <Plus className='h-4 w-4' />
                  <span className='text-sm font-medium'>추가</span>
                </button>
              </div>
              <div className='flex items-center justify-center gap-4 my-4'>
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
                  {selectedDate.toDateString() !==
                    new Date().toDateString() && (
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

            {allSessions.length === 0 ? (
              <div className='text-center py-8'>
                <div className='text-4xl mb-4'>📊</div>
                <p className='text-theme-secondary mb-2'>
                  {selectedDate.toDateString() === new Date().toDateString()
                    ? "아직 오늘의 기록이 없습니다"
                    : "이 날의 기록이 없습니다"}
                </p>
                <p className='text-sm text-theme-tertiary'>
                  {selectedDate.toDateString() === new Date().toDateString()
                    ? "+ 버튼을 눌러 새로운 세션을 추가해보세요"
                    : "다른 날짜를 확인해보세요"}
                </p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <div className='min-w-[400px]'>
                  {/* 테이블 헤더 */}
                  <div className='flex gap-2 py-2 px-3 text-xs font-medium text-theme-tertiary border-b border-theme-primary/20 mb-2'>
                    <div className='w-24 flex-shrink-0 text-center'>시간</div>
                    <div className='flex-1 min-w-0 text-center'>할 일</div>
                    <div className='w-20 flex-shrink-0 text-center'>
                      집중시간
                    </div>
                    <div className='w-12 flex-shrink-0 text-center'>
                      일시정지
                    </div>
                    <div className='w-8 flex-shrink-0 text-center'>수정</div>
                    <div className='w-8 flex-shrink-0 text-center'>삭제</div>
                  </div>

                  {/* 테이블 데이터 */}
                  {allSessions
                    .map((session) => {
                      const category = categories.find(
                        (cat) => cat.id === session.categoryId
                      )
                      const item = activityItems.find(
                        (item) => item.id === session.activityItemId
                      )
                      const itemName = item?.name || "알 수 없음"

                      // 세션을 일시정지 기록에 따라 분할
                      const segments = getSessionSegments(session)

                      return segments.map((segment, segmentIndex) => {
                        const startTimeStr =
                          segment.startTime.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })

                        const endTimeStr = segment.endTime.toLocaleTimeString(
                          "ko-KR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }
                        )

                        const timeRange = `${startTimeStr} ~ ${endTimeStr}`

                        return (
                          <div
                            key={`${session.id}-${segmentIndex}`}
                            className='flex gap-2 py-3 px-3 text-sm hover:bg-theme-primary/5 rounded-lg transition-colors items-center'
                          >
                            <div className='w-24 flex-shrink-0 text-theme-secondary font-mono whitespace-nowrap text-center'>
                              {timeRange}
                            </div>
                            <div className='flex-1 min-w-0 text-theme-primary font-medium truncate text-center'>
                              {itemName}
                            </div>
                            <div className='w-20 flex-shrink-0 text-theme-secondary whitespace-nowrap text-center font-mono'>
                              {formatTime(segment.duration)}
                            </div>
                            <div className='w-12 flex-shrink-0 text-theme-tertiary text-center'>
                              {segment.pauseCount > 0
                                ? `${segment.pauseCount}회`
                                : "-"}
                            </div>
                            <div className='w-8 flex-shrink-0 text-center'>
                              <button
                                onClick={() => handleEditStart(session)}
                                disabled={editCount >= 10}
                                className='text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed p-1 rounded transition-colors'
                                title='수정'
                              >
                                <Edit className='h-4 w-4' />
                              </button>
                            </div>
                            <div className='w-8 flex-shrink-0 text-center'>
                              <button
                                onClick={() => handleDeleteStart(session)}
                                disabled={isActionLoading}
                                className='text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed p-1 rounded transition-colors'
                                title='삭제'
                              >
                                <X className='h-4 w-4' />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    })
                    .flat()}
                </div>
              </div>
            )}
          </div>

          {/* 수정 모달 */}
          {isEditModalOpen && editingSession && (
            <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
              <div className='bg-theme-secondary rounded-lg p-6 shadow-lg max-w-md w-full mx-4'>
                <h3 className='text-xl font-semibold text-theme-primary mb-4'>
                  세션 수정
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-theme-secondary mb-1'>
                      시작 시간
                    </label>
                    <input
                      ref={editStartTimeRef}
                      type='time'
                      value={editForm.startTime}
                      onChange={(e) =>
                        handleEditTimeChange("startTime", e.target.value)
                      }
                      onClick={() => handleTimeInputClick(editStartTimeRef)}
                      className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary cursor-pointer'
                      style={{
                        colorScheme: "dark",
                      }}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-theme-secondary mb-1'>
                      종료 시간
                    </label>
                    <input
                      ref={editEndTimeRef}
                      type='time'
                      value={editForm.endTime}
                      onChange={(e) =>
                        handleEditTimeChange("endTime", e.target.value)
                      }
                      onClick={() => handleTimeInputClick(editEndTimeRef)}
                      className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary cursor-pointer'
                      style={{
                        colorScheme: "dark",
                      }}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-theme-secondary mb-1'>
                      집중 시간 (분)
                    </label>
                    <input
                      type='number'
                      value={editForm.activeDuration || ""}
                      placeholder='0'
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          activeDuration: parseInt(e.target.value) || 0,
                        })
                      }
                      onFocus={(e) => {
                        if (e.target.value === "0") {
                          e.target.select()
                        }
                      }}
                      className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    />
                  </div>
                  <div className='flex gap-2 pt-4'>
                    <button
                      onClick={handleEditCancel}
                      disabled={isActionLoading}
                      className='flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors'
                    >
                      취소
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={isActionLoading}
                      className='flex-1 bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2'
                    >
                      {isActionLoading && (
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                      )}
                      저장
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 새 세션 추가 모달 */}
          {isAddModalOpen && (
            <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
              <div className='bg-theme-secondary rounded-lg p-6 shadow-lg max-w-md w-full mx-4'>
                <h3 className='text-xl font-semibold text-theme-primary mb-4'>
                  새 세션 추가
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-theme-secondary mb-1'>
                      카테고리
                    </label>
                    <select
                      value={newSessionForm.categoryId}
                      onChange={(e) =>
                        setNewSessionForm({
                          ...newSessionForm,
                          categoryId: e.target.value,
                          activityItemId: "",
                        })
                      }
                      className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                      style={{
                        colorScheme: "dark",
                      }}
                    >
                      <option value=''>카테고리 선택</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-theme-secondary mb-1'>
                      활동
                    </label>
                    <select
                      value={newSessionForm.activityItemId}
                      onChange={(e) =>
                        setNewSessionForm({
                          ...newSessionForm,
                          activityItemId: e.target.value,
                        })
                      }
                      disabled={!newSessionForm.categoryId}
                      className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary disabled:bg-gray-100 dark:disabled:bg-gray-800'
                      style={{
                        colorScheme: "dark",
                      }}
                    >
                      <option value=''>활동 선택</option>
                      {getItemsByCategory(newSessionForm.categoryId).map(
                        (item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-theme-secondary mb-1'>
                      시작 시간
                    </label>
                    <input
                      ref={addStartTimeRef}
                      type='time'
                      value={newSessionForm.startTime}
                      onChange={(e) =>
                        handleAddTimeChange("startTime", e.target.value)
                      }
                      onClick={() => handleTimeInputClick(addStartTimeRef)}
                      className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary cursor-pointer'
                      style={{
                        colorScheme: "dark",
                      }}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-theme-secondary mb-1'>
                      종료 시간
                    </label>
                    <input
                      ref={addEndTimeRef}
                      type='time'
                      value={newSessionForm.endTime}
                      onChange={(e) =>
                        handleAddTimeChange("endTime", e.target.value)
                      }
                      onClick={() => handleTimeInputClick(addEndTimeRef)}
                      className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary cursor-pointer'
                      style={{
                        colorScheme: "dark",
                      }}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-theme-secondary mb-1'>
                      집중 시간 (분)
                    </label>
                    <input
                      type='number'
                      value={newSessionForm.activeDuration || ""}
                      placeholder='0'
                      onChange={(e) =>
                        setNewSessionForm({
                          ...newSessionForm,
                          activeDuration: parseInt(e.target.value) || 0,
                        })
                      }
                      onFocus={(e) => {
                        if (e.target.value === "0") {
                          e.target.select()
                        }
                      }}
                      className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-theme-secondary mb-1'>
                      일시정지 횟수
                    </label>
                    <input
                      type='number'
                      value={newSessionForm.pauseCount || ""}
                      placeholder='0'
                      onChange={(e) =>
                        setNewSessionForm({
                          ...newSessionForm,
                          pauseCount: parseInt(e.target.value) || 0,
                        })
                      }
                      onFocus={(e) => {
                        if (e.target.value === "0") {
                          e.target.select()
                        }
                      }}
                      className='w-full px-3 py-2 border border-theme-primary/20 rounded-lg bg-theme-background text-theme-primary focus:outline-none focus:border-theme-primary'
                    />
                  </div>
                  <div className='flex gap-2 pt-4'>
                    <button
                      onClick={handleAddSessionCancel}
                      disabled={isActionLoading}
                      className='flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors'
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddSessionSave}
                      disabled={isActionLoading}
                      className='flex-1 bg-accent-theme hover:bg-accent-theme-secondary disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2'
                    >
                      {isActionLoading && (
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                      )}
                      추가
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 삭제 확인 모달 */}
          {isDeleteModalOpen && sessionToDelete && (
            <div className='fixed inset-0 bg-theme-backdrop flex items-center justify-center z-50'>
              <div className='bg-theme-secondary rounded-lg p-6 shadow-lg max-w-md w-full mx-4'>
                <div className='text-center'>
                  <div className='flex items-center justify-center mb-4'>
                    <div className='bg-red-100 dark:bg-red-900/20 p-3 rounded-full'>
                      <X className='h-8 w-8 text-red-500' />
                    </div>
                  </div>
                  <h3 className='text-xl font-semibold text-theme-primary mb-2'>
                    세션 삭제
                  </h3>
                  <p className='text-theme-secondary mb-6'>
                    이 세션을 정말로 삭제하시겠습니까?
                  </p>
                  <p className='text-sm text-theme-tertiary mb-6'>
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                  <div className='flex gap-3'>
                    <button
                      onClick={handleDeleteCancel}
                      disabled={isActionLoading}
                      className='flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors'
                    >
                      취소
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={isActionLoading}
                      className='flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2'
                    >
                      {isActionLoading && (
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                      )}
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
