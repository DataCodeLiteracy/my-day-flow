import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { User } from "@/types/user"
import { ApiError } from "@/lib/apiClient"

export class UserService {
  static async createUser(
    userData: Omit<User, "created_at" | "updated_at">
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userData.uid)
      const now = new Date()

      await setDoc(userRef, {
        ...userData,
        created_at: now,
        updated_at: now,
      })
    } catch (error) {
      console.error("Error creating user:", error)
      throw new ApiError("사용자 생성 중 오류가 발생했습니다.")
    }
  }

  static async getUser(uid: string): Promise<User | null> {
    try {
      const userRef = doc(db, "users", uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const data = userSnap.data()
        return {
          ...data,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        } as User
      }
      return null
    } catch (error) {
      console.error("Error getting user:", error)
      throw new ApiError("사용자 정보를 가져오는 중 오류가 발생했습니다.")
    }
  }

  static async updateUser(
    uid: string,
    userData: Partial<Omit<User, "uid" | "created_at">>
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", uid)
      await updateDoc(userRef, {
        ...userData,
        updated_at: new Date(),
      })
    } catch (error) {
      console.error("Error updating user:", error)
      throw new ApiError("사용자 정보를 업데이트하는 중 오류가 발생했습니다.")
    }
  }

  static async createOrUpdateUser(firebaseUser: any): Promise<User> {
    try {
      const existingUser = await this.getUser(firebaseUser.uid)

      if (existingUser) {
        // 기존 사용자 정보 업데이트
        await this.updateUser(firebaseUser.uid, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          phoneNumber: firebaseUser.phoneNumber,
          lastLoginAt: new Date(),
        })

        return {
          ...existingUser,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          phoneNumber: firebaseUser.phoneNumber,
          lastLoginAt: new Date(),
          updated_at: new Date(),
        }
      } else {
        // 새 사용자 생성
        const newUser: Omit<User, "created_at" | "updated_at"> = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          phoneNumber: firebaseUser.phoneNumber,
          lastLoginAt: new Date(),
          isActive: true,
          isAdmin: false,
        }

        await this.createUser(newUser)

        return {
          ...newUser,
          created_at: new Date(),
          updated_at: new Date(),
        }
      }
    } catch (error) {
      console.error("Error creating or updating user:", error)
      throw new ApiError("사용자 정보를 처리하는 중 오류가 발생했습니다.")
    }
  }
}
