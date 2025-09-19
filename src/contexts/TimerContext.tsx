"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react"
import { TimerState, TimerSession, PauseRecord } from "@/types/activity"
import { ActivityService } from "@/services/activityService"
import { StatisticsService } from "@/services/statisticsService"
import { useAuth } from "./AuthContext"

interface TimerContextType {
  timerState: TimerState
  startTimer: (
    activityItemId: string,
    categoryId: string,
    activityName?: string
  ) => Promise<void>
  pauseTimer: () => Promise<void>
  resumeTimer: () => Promise<void>
  stopTimer: (
    completed: boolean,
    notes?: string
  ) => Promise<TimerSession | null>
  cancelTimer: () => void
  resetTimer: () => void
  handleFocusCheck: (isFocused: boolean) => void
  showFocusCheckModal: () => void
  hideFocusCheckModal: () => void
}

const TimerContext = createContext<TimerContextType>({
  timerState: {
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    currentSession: null,
    pauseRecords: [],
  },
  startTimer: async () => {},
  pauseTimer: async () => {},
  resumeTimer: async () => {},
  stopTimer: async () => null,
  cancelTimer: () => {},
  resetTimer: () => {},
  handleFocusCheck: () => {},
  showFocusCheckModal: () => {},
  hideFocusCheckModal: () => {},
})

export const useTimer = () => {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider")
  }
  return context
}

interface TimerProviderProps {
  children: ReactNode
}

export const TimerProvider = ({ children }: TimerProviderProps) => {
  const { userUid } = useAuth()
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    currentSession: null,
    pauseRecords: [],
  })

  // 최신 상태를 참조하기 위한 ref
  const timerStateRef = useRef(timerState)
  timerStateRef.current = timerState

  // 알림 소리 재생 함수
  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // 알람 소리 패턴 (시계 알람처럼)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3)

      gainNode.gain.setValueAtTime(0.8, audioContext.currentTime) // 볼륨 대폭 증가
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.4
      )

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)
    } catch (error) {
      console.error("알림 소리 재생 실패:", error)
    }
  }

  // 반복 알림 소리 재생
  const startRepeatingAlert = () => {
    if (timerState.alertInterval) {
      clearInterval(timerState.alertInterval)
    }

    // 즉시 첫 알림 재생
    playAlertSound()

    // 2초마다 반복 재생
    const interval = setInterval(() => {
      const currentState = timerStateRef.current
      if (currentState.isRunning && !currentState.isPaused) {
        playAlertSound()
      }
    }, 2000)

    setTimerState((prev) => ({
      ...prev,
      alertInterval: interval,
    }))
  }

  // 주기적 집중 상태 확인 알림 (30분마다)
  const startFocusAlert = () => {
    if (timerState.alertInterval) {
      clearInterval(timerState.alertInterval)
    }

    const interval = setInterval(() => {
      const currentState = timerStateRef.current
      if (
        currentState.isRunning &&
        !currentState.isPaused &&
        currentState.startTime
      ) {
        // 타이머 시작 시간부터 경과된 시간 계산 (초 단위)
        const elapsedSeconds = Math.floor(
          (new Date().getTime() - currentState.startTime.getTime()) / 1000
        )

        // 30분 = 1800초
        const thirtyMinutes = 30 * 60

        // 30분 단위로 나누어떨어지는지 확인 (30분, 1시간, 1시간 30분, 2시간...)
        // 마지막 알림 시간과 비교하여 중복 방지
        const lastAlertTime = currentState.lastAlertTime
        const shouldAlert =
          elapsedSeconds > 0 &&
          elapsedSeconds % thirtyMinutes === 0 &&
          (!lastAlertTime ||
            Math.floor(
              (new Date().getTime() - lastAlertTime.getTime()) / 1000
            ) >= thirtyMinutes)

        if (shouldAlert) {
          console.log(`🔔 ${elapsedSeconds / 60}분 경과 알림 트리거!`)

          // 집중 상태 확인 모달 표시
          showFocusCheckModal()

          // 브라우저 알림 요청
          if (Notification.permission === "granted") {
            new Notification("집중 상태 확인", {
              body: "지금도 집중하고 계신가요? 앱으로 돌아가서 집중 상태를 확인해주세요.",
              icon: "/favicon.ico",
              requireInteraction: true,
            })

            // 반복 알림 소리 시작
            startRepeatingAlert()
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                new Notification("집중 상태 확인", {
                  body: "지금도 집중하고 계신가요? 앱으로 돌아가서 집중 상태를 확인해주세요.",
                  icon: "/favicon.ico",
                  requireInteraction: true,
                })

                // 반복 알림 소리 시작
                startRepeatingAlert()
              }
            })
          }

          // 알림 시간 업데이트
          setTimerState((prev) => ({
            ...prev,
            lastAlertTime: new Date(),
          }))
        }
      }
    }, 1000) // 1초마다 체크

    setTimerState((prev) => ({
      ...prev,
      alertInterval: interval,
    }))
  }

  // 알림 소리 중지
  const stopAlertSound = () => {
    if (timerState.alertInterval) {
      clearInterval(timerState.alertInterval)
      setTimerState((prev) => ({
        ...prev,
        alertInterval: undefined,
      }))
    }
  }

  // 집중 상태 확인 모달 표시
  const showFocusCheckModal = () => {
    const startTime = new Date()
    setTimerState((prev) => ({
      ...prev,
      showFocusCheckModal: true,
      focusCheckStartTime: startTime,
    }))

    // 3분 무응답 시 자동 완료
    const timeout = setTimeout(() => {
      console.log("⏰ 3분 경과, 자동 완료")
      const currentState = timerStateRef.current
      if (currentState.isRunning && !currentState.isPaused) {
        console.log("🚫 3분 무응답으로 인한 자동 완료 실행")
        stopTimer(true) // 완료로 처리
      }
    }, 3 * 60 * 1000) // 3분

    setTimerState((prev) => ({
      ...prev,
      focusCheckTimeout: timeout,
    }))
  }

  // 집중 상태 확인 모달 숨기기
  const hideFocusCheckModal = () => {
    setTimerState((prev) => {
      // 3분 타이머 정리
      if (prev.focusCheckTimeout) {
        clearTimeout(prev.focusCheckTimeout)
      }

      return {
        ...prev,
        showFocusCheckModal: false,
        focusCheckStartTime: undefined,
        focusCheckTimeout: undefined,
      }
    })
  }

  // 집중 상태 확인 핸들러
  const handleFocusCheck = (isFocused: boolean) => {
    // 알림 소리 중지
    stopAlertSound()

    // 집중 상태 확인 모달 숨기기
    hideFocusCheckModal()

    const currentState = timerStateRef.current

    if (!isFocused) {
      // 집중하지 않고 있다면 타이머 완료
      console.log("🚫 User not focused, completing timer")
      stopTimer(true) // 완료로 처리
    } else if (isFocused && currentState.isPaused) {
      // 집중하고 있다면 타이머 재개
      console.log("✅ User focused, resuming timer")
      resumeTimer()
    } else if (isFocused && currentState.isRunning && !currentState.isPaused) {
      // 집중 중이면 계속 진행
      console.log("✅ User focused, continuing timer")
    }
  }

  const startTimer = async (
    activityItemId: string,
    categoryId: string,
    activityName?: string
  ) => {
    if (!userUid) {
      throw new Error("사용자 정보를 찾을 수 없습니다.")
    }

    try {
      const startTime = new Date()
      const sessionData: Omit<
        TimerSession,
        "id" | "created_at" | "updated_at"
      > = {
        userId: userUid,
        activityItemId,
        categoryId,
        startTime,
        totalDuration: 0,
        activeDuration: 0,
        pauseCount: 0,
        status: "active",
      }

      const sessionId = await ActivityService.createTimerSession(sessionData)

      setTimerState({
        isRunning: true,
        isPaused: false,
        startTime,
        pausedTime: 0,
        currentSession: {
          id: sessionId,
          ...sessionData,
          created_at: new Date(),
          updated_at: new Date(),
        },
        pauseRecords: [],
        activityName,
      })

      // 집중 상태 확인 알림 시작
      startFocusAlert()
    } catch (error) {
      console.error("Error starting timer:", error)
      throw error
    }
  }

  const pauseTimer = async () => {
    if (
      !timerState.isRunning ||
      timerState.isPaused ||
      !timerState.currentSession
    )
      return

    try {
      const pauseTime = new Date()
      const pauseRecord: Omit<PauseRecord, "id" | "created_at"> = {
        sessionId: timerState.currentSession.id,
        pauseTime,
        duration: 0,
      }

      const pauseId = await ActivityService.createPauseRecord(pauseRecord)

      setTimerState((prev) => ({
        ...prev,
        isPaused: true,
        pauseRecords: [
          ...prev.pauseRecords,
          {
            id: pauseId,
            ...pauseRecord,
            created_at: new Date(),
          },
        ],
      }))
    } catch (error) {
      console.error("Error pausing timer:", error)
      throw error
    }
  }

  const resumeTimer = async () => {
    if (
      !timerState.isRunning ||
      !timerState.isPaused ||
      !timerState.currentSession
    )
      return

    try {
      const resumeTime = new Date()
      const lastPauseRecord =
        timerState.pauseRecords[timerState.pauseRecords.length - 1]

      if (lastPauseRecord) {
        const pauseDuration = Math.floor(
          (resumeTime.getTime() - lastPauseRecord.pauseTime.getTime()) / 1000
        )

        await ActivityService.updatePauseRecord(lastPauseRecord.id, {
          resumeTime,
          duration: pauseDuration,
        })

        setTimerState((prev) => ({
          ...prev,
          isPaused: false,
          pausedTime: prev.pausedTime + pauseDuration,
          pauseRecords: prev.pauseRecords.map((record) =>
            record.id === lastPauseRecord.id
              ? { ...record, resumeTime, duration: pauseDuration }
              : record
          ),
        }))
      }
    } catch (error) {
      console.error("Error resuming timer:", error)
      throw error
    }
  }

  const stopTimer = async (
    completed: boolean,
    notes?: string
  ): Promise<TimerSession | null> => {
    if (!timerState.isRunning || !timerState.currentSession) return null

    try {
      const endTime = new Date()
      const totalDuration = Math.floor(
        (endTime.getTime() - timerState.startTime!.getTime()) / 1000
      )
      const activeDuration = totalDuration - timerState.pausedTime

      const updatedSession: TimerSession = {
        ...timerState.currentSession,
        activityName: timerState.activityName,
        endTime,
        totalDuration,
        activeDuration,
        pauseCount: timerState.pauseRecords.length,
        status: completed ? "completed" : "cancelled",
        notes: notes || "",
      }

      await ActivityService.updateTimerSession(timerState.currentSession.id, {
        endTime,
        totalDuration,
        activeDuration,
        pauseCount: timerState.pauseRecords.length,
        status: completed ? "completed" : "cancelled",
        notes: notes || "",
      })

      // 통계 업데이트 (백그라운드에서)
      if (completed && timerState.currentSession.userId) {
        StatisticsService.updateUserStatistics(
          timerState.currentSession.userId
        ).catch((error) => console.error("Error updating statistics:", error))
      }

      resetTimer()
      return updatedSession
    } catch (error) {
      console.error("Error stopping timer:", error)
      throw error
    }
  }

  const cancelTimer = () => {
    resetTimer()
  }

  const resetTimer = () => {
    // 알림 소리 중지
    stopAlertSound()

    setTimerState({
      isRunning: false,
      isPaused: false,
      startTime: null,
      pausedTime: 0,
      currentSession: null,
      pauseRecords: [],
    })
  }

  return (
    <TimerContext.Provider
      value={{
        timerState,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        cancelTimer,
        resetTimer,
        handleFocusCheck,
        showFocusCheckModal,
        hideFocusCheckModal,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}
