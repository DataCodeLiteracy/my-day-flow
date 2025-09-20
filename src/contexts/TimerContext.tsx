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

  // 주기적 집중 상태 확인 알림 (30분마다) - 완전히 새로운 간단한 버전
  const startFocusAlert = () => {
    console.log("🔔 startFocusAlert 호출됨 - 간단한 버전")

    // 기존 인터벌 정리
    if (timerState.alertInterval) {
      clearInterval(timerState.alertInterval)
    }

    // 1초마다 체크
    const interval = setInterval(() => {
      const currentState = timerStateRef.current

      // 타이머가 실행 중이 아니면 중단
      if (
        !currentState.isRunning ||
        currentState.isPaused ||
        !currentState.startTime
      ) {
        return
      }

      // 경과 시간 계산
      const elapsedSeconds = Math.floor(
        (new Date().getTime() - currentState.startTime.getTime()) / 1000
      )

      // 30분마다 알림 (30분 = 1800초)
      if (elapsedSeconds > 0 && elapsedSeconds % 1800 === 0) {
        console.log(`🔔 ${elapsedSeconds / 60}분 경과 - 모달 표시!`)

        // 모달 표시
        setTimerState((prev) => ({
          ...prev,
          showFocusCheckModal: true,
        }))

        // 알림 소리
        startRepeatingAlert()

        // 브라우저 알림
        if (Notification.permission === "granted") {
          new Notification("집중 상태 확인", {
            body: "30분이 지났습니다. 지금도 집중하고 계신가요?",
            icon: "/favicon.ico",
          })
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("집중 상태 확인", {
                body: "30분이 지났습니다. 지금도 집중하고 계신가요?",
                icon: "/favicon.ico",
              })
            }
          })
        }
      }
    }, 1000)

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

  // 집중 상태 확인 핸들러
  const handleFocusCheck = (isFocused: boolean) => {
    console.log(`🎯 집중 상태 선택: ${isFocused}`)

    // 알림 소리 중지
    stopAlertSound()

    // 모달 닫기
    setTimerState((prev) => ({
      ...prev,
      showFocusCheckModal: false,
    }))

    if (!isFocused) {
      // 집중하지 않음 → 타이머 완료
      console.log("🚫 집중하지 않음 - 타이머 완료")
      stopTimer(true)
    } else {
      // 집중함 → 계속 진행
      console.log("✅ 집중함 - 타이머 계속")
      // 아무것도 하지 않음 (타이머는 계속 실행)
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
        alertInterval: undefined,
        lastAlertTime: undefined,
        showFocusCheckModal: false,
      })

      // 집중 상태 확인 알림 시작
      console.log("🚀 타이머 시작, 집중 상태 확인 알림 시작")
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
    console.log("🛑 stopTimer 호출됨:", { completed, notes })
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
    console.log("🔄 resetTimer 호출됨")
    // 알림 소리 중지
    stopAlertSound()

    setTimerState({
      isRunning: false,
      isPaused: false,
      startTime: null,
      pausedTime: 0,
      currentSession: null,
      pauseRecords: [],
      alertInterval: undefined,
      lastAlertTime: undefined,
      showFocusCheckModal: false,
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
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}
