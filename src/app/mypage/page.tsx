"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  User,
  BarChart3,
  Settings,
  LogOut,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { ActivityService } from "@/services/activityService"
import { TimerSession } from "@/types/activity"

export default function MyPage() {
  const router = useRouter()
  const { user, userUid, signOut, deleteAccount, loading, isLoggedIn } =
    useAuth()
  const [userStats, setUserStats] = useState({
    todayTotal: { sessions: 0, time: 0, date: "" },
    thisWeekTotal: { sessions: 0, time: 0, weekRange: "" },
    thisMonthTotal: { sessions: 0, time: 0, month: "" },
    joinDate: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false)
  const [isInitModalOpen, setIsInitModalOpen] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [loading, isLoggedIn, router])

  // 관리자 권한 확인 (한 번만)
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (userUid) {
        // localStorage에서 먼저 확인
        const storedAdminStatus = localStorage.getItem("isAdmin")
        if (storedAdminStatus !== null) {
          setIsAdmin(storedAdminStatus === "true")
          console.log(
            "Admin status from localStorage:",
            storedAdminStatus === "true"
          )
          return
        }

        // localStorage에 없으면 서버에서 조회
        try {
          const adminStatus = await ActivityService.isAdmin(userUid)
          setIsAdmin(adminStatus)
          localStorage.setItem("isAdmin", adminStatus.toString())
          console.log("Admin status from server:", adminStatus)
        } catch (error) {
          console.error("Error checking admin status:", error)
        }
      }
    }
    checkAdminStatus()
  }, [userUid])

  useEffect(() => {
    if (isLoggedIn && user?.uid) {
      loadUserStats()
    }
  }, [isLoggedIn, user?.uid])

  const loadUserStats = async () => {
    try {
      setIsLoading(true)
      const sessions = await ActivityService.getTodaySessions(user!.uid)

      const now = new Date()

      // 오늘 총합
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)

      const todaySessions = sessions.filter((session) => {
        const sessionDate = new Date(session.startTime)
        return sessionDate >= todayStart && sessionDate <= todayEnd
      })
      const todayTotal = {
        sessions: todaySessions.length,
        time: todaySessions.reduce(
          (sum, session) => sum + session.activeDuration,
          0
        ),
        date: now.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        }),
      }

      // 이번 주 총합 (월요일부터 일요일까지)
      const currentWeekStart = new Date(now)
      const dayOfWeek = currentWeekStart.getDay()
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday)
      currentWeekStart.setHours(0, 0, 0, 0)

      const currentWeekEnd = new Date(currentWeekStart)
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6)
      currentWeekEnd.setHours(23, 59, 59, 999)

      const thisWeekSessions = sessions.filter((session) => {
        const sessionDate = new Date(session.startTime)
        return sessionDate >= currentWeekStart && sessionDate <= currentWeekEnd
      })
      const thisWeekTotal = {
        sessions: thisWeekSessions.length,
        time: thisWeekSessions.reduce(
          (sum, session) => sum + session.activeDuration,
          0
        ),
        weekRange: `${currentWeekStart.toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        })} ~ ${currentWeekEnd.toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        })}`,
      }

      // 이번 달 총합
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      )

      const thisMonthSessions = sessions.filter((session) => {
        const sessionDate = new Date(session.startTime)
        return (
          sessionDate >= currentMonthStart && sessionDate <= currentMonthEnd
        )
      })
      const thisMonthTotal = {
        sessions: thisMonthSessions.length,
        time: thisMonthSessions.reduce(
          (sum, session) => sum + session.activeDuration,
          0
        ),
        month: now.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
        }),
      }

      setUserStats({
        todayTotal,
        thisWeekTotal,
        thisMonthTotal,
        joinDate: user?.metadata?.creationTime
          ? new Date(user.metadata.creationTime).toLocaleDateString("ko-KR")
          : "알 수 없음",
      })
    } catch (error) {
      console.error("Error loading user stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      setIsAdmin(false) // 관리자 상태 초기화
      localStorage.removeItem("isAdmin") // localStorage에서도 제거
      setIsLogoutModalOpen(false)
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount()
      setIsDeleteModalOpen(false)
      router.push("/login")
    } catch (error) {
      console.error("Error deleting account:", error)
      alert("계정 삭제 중 오류가 발생했습니다.")
    }
  }

  // 관리자용: 아이템 강제 초기화 (기존 데이터 삭제 후 재생성)
  const handleForceInitialize = async () => {
    if (!userUid) return

    if (!isAdmin) {
      alert("관리자 권한이 필요합니다.")
      return
    }

    try {
      setIsInitializing(true)
      await ActivityService.forceInitializeItems(userUid)
      alert("아이템 초기화가 완료되었습니다! (기존 데이터 삭제됨)")
      setIsInitModalOpen(false)
      window.location.reload()
    } catch (error) {
      console.error("Error force initializing:", error)
      alert("초기화 중 오류가 발생했습니다.")
    } finally {
      setIsInitializing(false)
    }
  }

  // 관리자용: 아이템 안전 초기화 (기존 데이터 유지)
  const handleSafeInitialize = async () => {
    if (!userUid) return

    if (!isAdmin) {
      alert("관리자 권한이 필요합니다.")
      return
    }

    try {
      setIsInitializing(true)
      await ActivityService.initializeUserItemsOnly(userUid)
      alert("아이템 초기화가 완료되었습니다! (기존 데이터 유지)")
      setIsInitModalOpen(false)
      window.location.reload()
    } catch (error) {
      console.error("Error safe initializing:", error)
      alert(
        error instanceof Error
          ? error.message
          : "초기화 중 오류가 발생했습니다."
      )
    } finally {
      setIsInitializing(false)
    }
  }

  // 관리자용: 모든 컬렉션 삭제
  const handleDeleteAllCollections = async () => {
    if (!isAdmin) {
      alert("관리자 권한이 필요합니다.")
      return
    }

    try {
      setIsDeletingAll(true)
      await ActivityService.deleteAllCollections()
      alert("모든 컬렉션이 삭제되었습니다!")
      setIsDeleteAllModalOpen(false)
      // 로그아웃 후 로그인 페이지로 이동
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error deleting all collections:", error)
      alert("삭제 중 오류가 발생했습니다.")
    } finally {
      setIsDeletingAll(false)
    }
  }

  const formatTime = (seconds: number) => {
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
              마이페이지
            </h1>
            <div className='w-9' />
          </div>
        </div>
      </div>

      <div className='max-w-md mx-auto px-4 py-6 pb-12'>
        {/* 사용자 프로필 */}
        <div className='text-center mb-8'>
          <div className='w-20 h-20 bg-accent-theme rounded-full flex items-center justify-center mx-auto mb-4'>
            <User className='h-10 w-10 text-white' />
          </div>
          <h2 className='text-2xl font-bold text-theme-primary mb-1'>
            {user?.displayName || user?.email?.split("@")[0] || "사용자"}
          </h2>
          <p className='text-theme-tertiary text-sm'>
            {userStats.joinDate} 가입
          </p>
        </div>

        {/* 통계 카드 */}
        {isLoading ? (
          <div className='bg-theme-secondary rounded-2xl p-6 mb-6 shadow-lg text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-accent-theme mx-auto'></div>
            <p className='text-theme-tertiary mt-2 text-sm'>통계 로딩 중...</p>
          </div>
        ) : (
          <div className='space-y-4 mb-6'>
            {/* 오늘 총합 */}
            <div className='bg-theme-secondary rounded-2xl p-4 shadow-lg'>
              <div className='flex items-center justify-between mb-3'>
                <h4 className='text-sm font-semibold text-theme-primary'>
                  오늘 총합
                </h4>
                <span className='text-xs text-theme-tertiary'>
                  {userStats.todayTotal.date}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center'>
                  <div className='text-xl font-bold text-accent-theme'>
                    {userStats.todayTotal.sessions}
                  </div>
                  <div className='text-xs text-theme-tertiary'>세션</div>
                </div>
                <div className='text-center'>
                  <div className='text-xl font-bold text-accent-theme'>
                    {formatTime(userStats.todayTotal.time)}
                  </div>
                  <div className='text-xs text-theme-tertiary'>집중시간</div>
                </div>
              </div>
            </div>

            {/* 이번 주 총합 */}
            <div className='bg-theme-secondary rounded-2xl p-4 shadow-lg'>
              <div className='flex items-center justify-between mb-3'>
                <h4 className='text-sm font-semibold text-theme-primary'>
                  이번 주 총합
                </h4>
                <span className='text-xs text-theme-tertiary'>
                  {userStats.thisWeekTotal.weekRange}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center'>
                  <div className='text-xl font-bold text-accent-theme'>
                    {userStats.thisWeekTotal.sessions}
                  </div>
                  <div className='text-xs text-theme-tertiary'>세션</div>
                </div>
                <div className='text-center'>
                  <div className='text-xl font-bold text-accent-theme'>
                    {formatTime(userStats.thisWeekTotal.time)}
                  </div>
                  <div className='text-xs text-theme-tertiary'>집중시간</div>
                </div>
              </div>
            </div>

            {/* 이번 달 총합 */}
            <div className='bg-theme-secondary rounded-2xl p-4 shadow-lg'>
              <div className='flex items-center justify-between mb-3'>
                <h4 className='text-sm font-semibold text-theme-primary'>
                  이번 달 총합
                </h4>
                <span className='text-xs text-theme-tertiary'>
                  {userStats.thisMonthTotal.month}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='text-center'>
                  <div className='text-xl font-bold text-accent-theme'>
                    {userStats.thisMonthTotal.sessions}
                  </div>
                  <div className='text-xs text-theme-tertiary'>세션</div>
                </div>
                <div className='text-center'>
                  <div className='text-xl font-bold text-accent-theme'>
                    {formatTime(userStats.thisMonthTotal.time)}
                  </div>
                  <div className='text-xs text-theme-tertiary'>집중시간</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 */}
        <div className='space-y-3'>
          <button
            onClick={() => router.push("/analytics")}
            className='w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg border border-blue-200 dark:border-blue-800'
          >
            <BarChart3 className='h-5 w-5 text-blue-600 dark:text-blue-400' />
            <span className='text-blue-700 dark:text-blue-300 font-medium'>
              분석 페이지
            </span>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className='w-full bg-gray-50 dark:bg-gray-800/20 hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg border border-gray-200 dark:border-gray-700'
          >
            <Settings className='h-5 w-5 text-gray-600 dark:text-gray-400' />
            <span className='text-gray-700 dark:text-gray-300 font-medium'>
              설정
            </span>
          </button>

          {/* 관리자용: 아이템 초기화 버튼 */}
          {isAdmin && (
            <button
              onClick={() => setIsInitModalOpen(true)}
              disabled={isInitializing}
              className='w-full bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg border border-orange-200 dark:border-orange-800'
            >
              {isInitializing ? (
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600'></div>
              ) : (
                <Settings className='h-5 w-5 text-orange-600 dark:text-orange-400' />
              )}
              <span className='text-orange-700 dark:text-orange-300 font-medium'>
                {isInitializing ? "초기화 중..." : "아이템 초기화 (관리자)"}
              </span>
            </button>
          )}

          {/* 관리자용: 모든 컬렉션 삭제 버튼 */}
          {isAdmin && (
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              disabled={isDeletingAll}
              className='w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg border border-red-200 dark:border-red-800'
            >
              {isDeletingAll ? (
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-red-600'></div>
              ) : (
                <Trash2 className='h-5 w-5 text-red-600 dark:text-red-400' />
              )}
              <span className='text-red-700 dark:text-red-300 font-medium'>
                {isDeletingAll ? "삭제 중..." : "모든 컬렉션 삭제 (관리자)"}
              </span>
            </button>
          )}

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className='w-full bg-accent-theme hover:bg-accent-theme-secondary transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg'
          >
            <LogOut className='h-5 w-5 text-white' />
            <span className='text-white font-medium'>로그아웃</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className='w-full bg-red-500 hover:bg-red-600 transition-colors rounded-xl p-4 flex items-center gap-3 shadow-lg'
          >
            <Trash2 className='h-5 w-5 text-white' />
            <span className='text-white font-medium'>탈퇴하기</span>
          </button>
        </div>
      </div>

      {/* 로그아웃 모달 */}
      {isLogoutModalOpen && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-theme-secondary rounded-2xl p-6 max-w-sm w-full shadow-xl'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-theme-primary'>
                로그아웃
              </h3>
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className='p-1 text-theme-tertiary hover:text-theme-primary transition-colors'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <p className='text-theme-secondary mb-6'>
              정말로 로그아웃하시겠습니까?
            </p>
            <div className='flex gap-3'>
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className='flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors'
              >
                취소
              </button>
              <button
                onClick={handleLogout}
                className='flex-1 py-2 px-4 bg-accent-theme text-white rounded-lg font-medium transition-colors'
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 탈퇴하기 모달 */}
      {isDeleteModalOpen && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-theme-secondary rounded-2xl p-6 max-w-sm w-full shadow-xl'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-theme-primary'>
                탈퇴하기
              </h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className='p-1 text-theme-tertiary hover:text-theme-primary transition-colors'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='flex items-center gap-3 mb-4'>
              <AlertTriangle className='h-5 w-5 text-red-500' />
              <p className='text-theme-secondary'>
                정말로 계정을 삭제하시겠습니까?
              </p>
            </div>
            <p className='text-sm text-theme-tertiary mb-6'>
              이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
            </p>
            <div className='flex gap-3'>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className='flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors'
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                className='flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium transition-colors'
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 설정 모달 */}
      {isSettingsModalOpen && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-theme-secondary rounded-2xl p-6 max-w-sm w-full shadow-xl'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-theme-primary'>설정</h3>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className='p-1 text-theme-tertiary hover:text-theme-primary transition-colors'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='text-center py-8'>
              <Settings className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <p className='text-theme-secondary mb-2'>설정 기능 준비 중</p>
              <p className='text-sm text-theme-tertiary'>
                곧 다양한 설정 옵션을 제공할 예정입니다.
              </p>
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className='w-full py-2 px-4 bg-accent-theme text-white rounded-lg font-medium transition-colors'
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 관리자용: 아이템 초기화 옵션 모달 */}
      {isInitModalOpen && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-theme-secondary rounded-2xl p-6 max-w-sm w-full shadow-xl'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-orange-600 dark:text-orange-400'>
                🔧 아이템 초기화
              </h3>
              <button
                onClick={() => setIsInitModalOpen(false)}
                className='p-1 text-theme-tertiary hover:text-theme-primary transition-colors'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='mb-6'>
              <p className='text-theme-secondary mb-4'>
                사용자의 기본 카테고리와 아이템을 초기화합니다.
              </p>
              <div className='space-y-3'>
                <button
                  onClick={handleSafeInitialize}
                  disabled={isInitializing}
                  className='w-full bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors rounded-lg p-4 flex items-center gap-3 border border-green-200 dark:border-green-800'
                >
                  <div className='w-3 h-3 bg-green-500 rounded-full'></div>
                  <div className='text-left'>
                    <div className='font-medium text-green-700 dark:text-green-300'>
                      안전 초기화
                    </div>
                    <div className='text-sm text-green-600 dark:text-green-400'>
                      기존 데이터 유지, 아이템이 없을 때만 생성
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleForceInitialize}
                  disabled={isInitializing}
                  className='w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors rounded-lg p-4 flex items-center gap-3 border border-red-200 dark:border-red-800'
                >
                  <div className='w-3 h-3 bg-red-500 rounded-full'></div>
                  <div className='text-left'>
                    <div className='font-medium text-red-700 dark:text-red-300'>
                      강제 초기화
                    </div>
                    <div className='text-sm text-red-600 dark:text-red-400'>
                      기존 데이터 삭제 후 새로 생성
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsInitModalOpen(false)}
              className='w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors'
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 관리자용: 모든 컬렉션 삭제 모달 */}
      {isDeleteAllModalOpen && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-theme-secondary rounded-2xl p-6 max-w-sm w-full shadow-xl'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-red-600 dark:text-red-400'>
                ⚠️ 모든 컬렉션 삭제
              </h3>
              <button
                onClick={() => setIsDeleteAllModalOpen(false)}
                className='p-1 text-theme-tertiary hover:text-theme-primary transition-colors'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='flex items-center gap-3 mb-4'>
              <AlertTriangle className='h-8 w-8 text-red-500' />
              <div>
                <p className='text-theme-secondary font-medium'>
                  모든 데이터를 삭제하시겠습니까?
                </p>
                <p className='text-sm text-theme-tertiary'>
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6'>
              <p className='text-sm text-red-700 dark:text-red-300'>
                <strong>삭제될 컬렉션:</strong>
                <br />
                • users
                <br />
                • userCategories
                <br />
                • userActivityItems
                <br />
                • timerSessions
                <br />
                • pauseRecords
                <br />
                • activityCategories
                <br />• activityItems
              </p>
            </div>
            <div className='flex gap-3'>
              <button
                onClick={() => setIsDeleteAllModalOpen(false)}
                disabled={isDeletingAll}
                className='flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50'
              >
                취소
              </button>
              <button
                onClick={handleDeleteAllCollections}
                disabled={isDeletingAll}
                className='flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2'
              >
                {isDeletingAll && (
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                )}
                {isDeletingAll ? "삭제 중..." : "모두 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
