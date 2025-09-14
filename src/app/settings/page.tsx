"use client"

import { useSettings } from "@/contexts/SettingsContext"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const { isLoggedIn, loading } = useAuth()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-background flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary'></div>
      </div>
    )
  }

  if (!isLoggedIn) {
    router.push("/login")
    return null
  }

  const handleThemeChange = (theme: "light" | "dark") => {
    updateSettings({ theme })
  }

  const handleColorSchemeChange = (
    colorScheme: "blue" | "green" | "purple" | "orange"
  ) => {
    updateSettings({ colorScheme })
  }

  const handleFontSizeChange = (fontSize: "small" | "medium" | "large") => {
    updateSettings({ fontSize })
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className='min-h-screen bg-theme-background'>
      {/* Header */}
      <div className='bg-theme-secondary border-b border-theme-primary/20'>
        <div className='max-w-md mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <button
              onClick={handleBack}
              className='p-2 text-theme-primary hover:text-theme-primary/80 transition-colors rounded-lg hover:bg-theme-primary/10'
            >
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
            </button>
            <h1 className='text-lg font-semibold text-theme-primary'>설정</h1>
            <div className='w-9' />
          </div>
        </div>
      </div>

      <div className='max-w-md mx-auto p-4 space-y-6'>
        {/* 테마 설정 */}
        <div className='bg-theme-secondary dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
          <h2 className='text-lg font-semibold text-theme-primary mb-4'>
            테마
          </h2>

          <div className='space-y-3'>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='radio'
                name='theme'
                value='light'
                checked={settings.theme === "light"}
                onChange={() => handleThemeChange("light")}
                className='w-4 h-4 text-theme-primary'
              />
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center'>
                  <svg
                    className='w-4 h-4 text-white'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <span className='text-theme-text'>라이트 모드</span>
              </div>
            </label>

            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='radio'
                name='theme'
                value='dark'
                checked={settings.theme === "dark"}
                onChange={() => handleThemeChange("dark")}
                className='w-4 h-4 text-theme-primary'
              />
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center'>
                  <svg
                    className='w-4 h-4 text-white'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path d='M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z' />
                  </svg>
                </div>
                <span className='text-theme-text'>다크 모드</span>
              </div>
            </label>
          </div>
        </div>

        {/* 컬러 스킴 설정 */}
        <div className='bg-theme-secondary dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
          <h2 className='text-lg font-semibold text-theme-primary mb-4'>
            컬러 스킴
          </h2>

          <div className='grid grid-cols-2 gap-3'>
            {[
              { value: "blue", name: "파란색", color: "bg-blue-500" },
              { value: "green", name: "초록색", color: "bg-green-500" },
              { value: "purple", name: "보라색", color: "bg-purple-500" },
              { value: "orange", name: "주황색", color: "bg-orange-500" },
            ].map((scheme) => (
              <label
                key={scheme.value}
                className='flex items-center gap-3 cursor-pointer'
              >
                <input
                  type='radio'
                  name='colorScheme'
                  value={scheme.value}
                  checked={settings.colorScheme === scheme.value}
                  onChange={() => handleColorSchemeChange(scheme.value as any)}
                  className='w-4 h-4 text-theme-primary'
                />
                <div className='flex items-center gap-2'>
                  <div className={`w-4 h-4 ${scheme.color} rounded-full`}></div>
                  <span className='text-theme-text text-sm'>{scheme.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 폰트 크기 설정 */}
        <div className='bg-theme-secondary dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
          <h2 className='text-lg font-semibold text-theme-primary mb-4'>
            폰트 크기
          </h2>

          <div className='space-y-3'>
            {[
              { value: "small", name: "작게", size: "text-sm" },
              { value: "medium", name: "보통", size: "text-base" },
              { value: "large", name: "크게", size: "text-lg" },
            ].map((font) => (
              <label
                key={font.value}
                className='flex items-center gap-3 cursor-pointer'
              >
                <input
                  type='radio'
                  name='fontSize'
                  value={font.value}
                  checked={settings.fontSize === font.value}
                  onChange={() => handleFontSizeChange(font.value as any)}
                  className='w-4 h-4 text-theme-primary'
                />
                <span className={`text-theme-text ${font.size}`}>
                  {font.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 설정 초기화 */}
        <div className='bg-theme-secondary dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
          <h2 className='text-lg font-semibold text-theme-primary mb-4'>
            설정 초기화
          </h2>

          <button
            onClick={() => setIsModalOpen(true)}
            className='w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors'
          >
            모든 설정 초기화
          </button>
        </div>
      </div>

      {/* 초기화 확인 모달 */}
      {isModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-theme-secondary dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full'>
            <h3 className='text-lg font-semibold text-theme-primary mb-4'>
              설정 초기화
            </h3>
            <p className='text-theme-text mb-6'>
              모든 설정을 기본값으로 초기화하시겠습니까?
            </p>
            <div className='flex gap-3'>
              <button
                onClick={() => setIsModalOpen(false)}
                className='flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors'
              >
                취소
              </button>
              <button
                onClick={() => {
                  updateSettings({
                    theme: "light",
                    colorScheme: "blue",
                    fontSize: "medium",
                  })
                  setIsModalOpen(false)
                }}
                className='flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors'
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
