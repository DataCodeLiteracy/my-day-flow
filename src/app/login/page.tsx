"use client"

import { useState, useEffect } from "react"
import { signInWithPopup } from "firebase/auth"
import { useRouter } from "next/navigation"
import { auth, googleProvider } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { Calendar, AlertCircle, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { isLoggedIn, loading } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push("/")
    }
  }, [isLoggedIn, loading, router])

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true)
      setError(null)
      await signInWithPopup(auth, googleProvider)
      // 로그인 성공 시 홈페이지로 리다이렉트
      router.push("/")
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
        <div className='text-center'>
          <Calendar className='h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse' />
          <p className='text-theme-secondary'>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (isLoggedIn) {
    return null
  }

  return (
    <div className='min-h-screen bg-theme-gradient flex items-center justify-center'>
      <div className='max-w-md w-full mx-4'>
        <div className='bg-theme-secondary rounded-lg shadow-lg p-8'>
          <div className='text-center mb-8'>
            <Calendar className='h-16 w-16 text-accent-theme mx-auto mb-4' />
            <h1 className='text-3xl font-bold text-theme-primary mb-2'>
              My Day Flow
            </h1>
            <p className='text-theme-secondary'>
              나만의 하루 흐름을 기록하고 관리해보세요
            </p>
          </div>

          {error && (
            <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
              <div className='flex items-center gap-2'>
                <AlertCircle className='h-5 w-5 text-red-500' />
                <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className='w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-lg border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isSigningIn ? (
              <Loader2 className='h-5 w-5 animate-spin' />
            ) : (
              <svg className='h-5 w-5' viewBox='0 0 24 24'>
                <path
                  fill='#4285F4'
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                />
                <path
                  fill='#34A853'
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                />
                <path
                  fill='#FBBC05'
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                />
                <path
                  fill='#EA4335'
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                />
              </svg>
            )}
            <span>
              {isSigningIn ? "로그인 중..." : "Google로 계속하기"}
            </span>
          </button>

          <div className='mt-6 text-center'>
            <p className='text-xs text-theme-tertiary'>
              로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하는 것으로
              간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

