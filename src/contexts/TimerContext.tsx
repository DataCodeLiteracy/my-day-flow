"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
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
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}
