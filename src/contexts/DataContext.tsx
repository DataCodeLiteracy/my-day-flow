"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { UserStatistics } from "@/types/user"

interface DataContextType {
  userStatistics: UserStatistics | null
  isLoading: boolean
  updateStatistics: (stats: UserStatistics) => void
}

const DataContext = createContext<DataContextType>({
  userStatistics: null,
  isLoading: false,
  updateStatistics: () => {},
})

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

interface DataProviderProps {
  children: ReactNode
}

export const DataProvider = ({ children }: DataProviderProps) => {
  const [userStatistics, setUserStatistics] = useState<UserStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const updateStatistics = (stats: UserStatistics) => {
    setUserStatistics(stats)
  }

  return (
    <DataContext.Provider value={{ userStatistics, isLoading, updateStatistics }}>
      {children}
    </DataContext.Provider>
  )
}

