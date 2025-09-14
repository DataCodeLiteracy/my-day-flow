"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  deleteUser as firebaseDeleteUser,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { User } from "@/types/user"
import { UserService } from "@/services/userService"
import { ActivityService } from "@/services/activityService"

interface AuthContextType {
  user: FirebaseUser | null
  userData: User | null
  loading: boolean
  isLoggedIn: boolean
  userUid: string | null
  userDocId: string | null // Firestore 문서 ID
  isAdmin: boolean
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isLoggedIn: false,
  userUid: null,
  userDocId: null,
  isAdmin: false,
  signOut: async () => {},
  deleteAccount: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userUid, setUserUid] = useState<string | null>(null)
  const [userDocId, setUserDocId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    const storedUserUid = localStorage.getItem("userUid")
    const storedIsAdmin = localStorage.getItem("isAdmin") === "true"

    setIsLoggedIn(storedIsLoggedIn)
    setUserUid(storedUserUid)
    setIsAdmin(storedIsAdmin)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        setIsLoggedIn(true)
        setUserUid(firebaseUser.uid)
        localStorage.setItem("isLoggedIn", "true")
        localStorage.setItem("userUid", firebaseUser.uid)

        // Firestore에서 사용자 데이터 생성 또는 업데이트
        try {
          const userData = await UserService.createOrUpdateUser(firebaseUser)
          setUserData(userData)

          // 사용자 문서 ID 조회 및 저장
          const docId = await ActivityService.getUserDocId(firebaseUser.uid)
          setUserDocId(docId)
          localStorage.setItem("userDocId", docId)

          // 처음 로그인할 때만 isAdmin 조회
          const storedAdminStatus = localStorage.getItem("isAdmin")
          if (storedAdminStatus === null) {
            // localStorage에 없으면 서버에서 조회
            try {
              const adminStatus = await ActivityService.isAdmin(
                firebaseUser.uid
              )
              setIsAdmin(adminStatus)
              localStorage.setItem("isAdmin", adminStatus.toString())
              console.log("Admin status fetched from server:", adminStatus)
            } catch (error) {
              console.error("Error checking admin status:", error)
              setIsAdmin(false)
            }
          } else {
            // localStorage에 있으면 그 값 사용
            setIsAdmin(storedAdminStatus === "true")
            console.log(
              "Admin status from localStorage:",
              storedAdminStatus === "true"
            )
          }
        } catch (error) {
          console.error("Error creating or updating user data:", error)
          setUserData(null)
          setUserDocId(null)
        }
      } else {
        setIsLoggedIn(false)
        setUserUid(null)
        setUserData(null)
        setUserDocId(null)
        setIsAdmin(false)
        localStorage.removeItem("isLoggedIn")
        localStorage.removeItem("userUid")
        localStorage.removeItem("userDocId")
        localStorage.removeItem("isAdmin")
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
    setIsLoggedIn(false)
    setUserUid(null)
    setUserDocId(null)
    setIsAdmin(false)
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userUid")
    localStorage.removeItem("userDocId")
    localStorage.removeItem("isAdmin")
  }

  const deleteAccount = async () => {
    if (!user) {
      throw new Error("사용자가 로그인되어 있지 않습니다.")
    }

    try {
      // 1. Firestore에서 사용자 데이터 삭제
      await ActivityService.deleteUserData(user.uid)

      // 2. Firebase Auth에서 사용자 계정 삭제 (재인증 필요)
      try {
        await firebaseDeleteUser(user)
      } catch (authError: any) {
        if (authError.code === "auth/requires-recent-login") {
          // 재인증이 필요한 경우 사용자에게 알림
          throw new Error(
            "계정 삭제를 위해 다시 로그인해주세요. 로그아웃 후 다시 로그인한 다음 탈퇴를 시도해주세요."
          )
        }
        throw authError
      }

      // 3. 로컬 상태 초기화
      setIsLoggedIn(false)
      setUserUid(null)
      setUserData(null)
      setUserDocId(null)
      setIsAdmin(false)
      localStorage.removeItem("isLoggedIn")
      localStorage.removeItem("userUid")
      localStorage.removeItem("userDocId")
      localStorage.removeItem("isAdmin")

      console.log("Account deleted successfully")
    } catch (error) {
      console.error("Error deleting account:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        isLoggedIn,
        userUid,
        userDocId,
        isAdmin,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
