"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"

interface Settings {
  theme: "light" | "dark"
  colorScheme: "blue" | "green" | "purple" | "orange"
  fontSize: "small" | "medium" | "large"
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  theme: "light",
  colorScheme: "blue",
  fontSize: "medium",
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
})

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    // 로컬 스토리지에서 설정 불러오기
    const savedSettings = localStorage.getItem("appSettings")
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings({ ...defaultSettings, ...parsed })
      } catch (error) {
        console.error("Error parsing saved settings:", error)
      }
    }
  }, [])

  useEffect(() => {
    // 설정이 변경될 때마다 로컬 스토리지에 저장
    localStorage.setItem("appSettings", JSON.stringify(settings))

    // HTML 요소에 테마 속성 적용
    const html = document.documentElement
    html.setAttribute("data-theme", settings.theme)
    html.setAttribute("data-color-scheme", settings.colorScheme)
    html.setAttribute("data-font-size", settings.fontSize)
  }, [settings])

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}
