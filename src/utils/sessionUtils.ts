import { TimerSession } from "@/types/activity"

// 날짜 경계를 넘나드는 세션을 날짜별로 분할하는 함수
export function splitSessionByDate(session: TimerSession): TimerSession[] {
  if (!session.endTime) {
    // 아직 진행 중인 세션은 시작 날짜에만 기록
    return [session]
  }

  const startDate = new Date(session.startTime)
  const endDate = new Date(session.endTime)

  // 같은 날짜면 분할할 필요 없음
  if (startDate.toDateString() === endDate.toDateString()) {
    return [session]
  }

  const sessions: TimerSession[] = []
  let currentDate = new Date(startDate)
  currentDate.setHours(0, 0, 0, 0)

  let remainingDuration = session.activeDuration
  let currentStartTime = new Date(session.startTime)

  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    // 현재 날짜의 시작 시간과 끝 시간 계산
    const sessionStartTime = new Date(
      Math.max(currentStartTime.getTime(), dayStart.getTime())
    )
    const sessionEndTime = new Date(
      Math.min(session.endTime.getTime(), dayEnd.getTime())
    )

    // 이 날짜의 활동 시간 계산 (초)
    const dayDuration = Math.floor(
      (sessionEndTime.getTime() - sessionStartTime.getTime()) / 1000
    )

    if (dayDuration > 0) {
      // 이 날짜의 세션 생성
      const daySession: TimerSession = {
        ...session,
        id: `${session.id}_${currentDate.toISOString().split("T")[0]}`, // 날짜별 고유 ID
        startTime: sessionStartTime,
        endTime: sessionEndTime,
        totalDuration: dayDuration,
        activeDuration: dayDuration, // 일시정지 시간은 비례적으로 분배하지 않고 전체 시간으로 계산
        pauseCount: 0, // 일시정지 횟수는 원본 세션에만 기록
        pauseRecords: [], // 일시정지 기록도 원본 세션에만 기록
        notes: session.notes
          ? `${session.notes} (${currentDate.toDateString()})`
          : undefined,
      }

      sessions.push(daySession)
      remainingDuration -= dayDuration
    }

    // 다음 날로 이동
    currentDate.setDate(currentDate.getDate() + 1)
    currentDate.setHours(0, 0, 0, 0)
    currentStartTime = new Date(currentDate)
  }

  return sessions
}

// 특정 날짜의 세션들을 가져올 때 날짜 경계를 고려하는 함수
export function getSessionsForDate(
  allSessions: TimerSession[],
  targetDate: Date
): TimerSession[] {
  const targetDateString = targetDate.toDateString()
  const sessionsForDate: TimerSession[] = []

  for (const session of allSessions) {
    if (!session.endTime) {
      // 진행 중인 세션은 시작 날짜에만 표시
      if (session.startTime.toDateString() === targetDateString) {
        sessionsForDate.push(session)
      }
      continue
    }

    // 세션이 해당 날짜와 겹치는지 확인
    const sessionStartDate = session.startTime.toDateString()
    const sessionEndDate = session.endTime.toDateString()

    if (
      sessionStartDate === targetDateString ||
      sessionEndDate === targetDateString
    ) {
      // 날짜 경계를 넘나드는 세션인 경우 분할
      if (sessionStartDate !== sessionEndDate) {
        const splitSessions = splitSessionByDate(session)
        const daySession = splitSessions.find(
          (s) => s.startTime.toDateString() === targetDateString
        )
        if (daySession) {
          sessionsForDate.push(daySession)
        }
      } else {
        // 같은 날짜의 세션
        sessionsForDate.push(session)
      }
    }
  }

  return sessionsForDate.sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  )
}

// 날짜 범위의 모든 세션을 가져올 때 날짜 경계를 고려하는 함수
export function getSessionsForDateRange(
  allSessions: TimerSession[],
  startDate: Date,
  endDate: Date
): TimerSession[] {
  const sessionsForRange: TimerSession[] = []

  // 날짜 범위의 각 날짜에 대해 세션 수집
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const daySessions = getSessionsForDate(allSessions, currentDate)
    sessionsForRange.push(...daySessions)
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return sessionsForRange
}
