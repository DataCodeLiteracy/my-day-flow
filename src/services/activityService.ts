import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  ActivityCategory,
  ActivityItem,
  TimerSession,
  PauseRecord,
} from "@/types/activity"
import { ApiError } from "@/lib/apiClient"

export class ActivityService {
  // 초기화 중인 유저들 추적
  private static initializingUsers = new Set<string>()

  // 사용자 문서 ID 조회
  static async getUserDocId(userUid: string): Promise<string> {
    try {
      const usersRef = collection(db, "users")
      const userQuery = query(usersRef, where("uid", "==", userUid))
      const userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        throw new Error("User not found in users collection")
      }

      return userSnapshot.docs[0].id
    } catch (error) {
      console.error("Error getting user document ID:", error)
      throw error
    }
  }

  // 카테고리 관련
  static async getCategories(userId: string): Promise<ActivityCategory[]> {
    try {
      // 사용자 카테고리 가져오기
      const categoriesRef = collection(db, "userCategories")
      const q = query(
        categoriesRef,
        where("userId", "==", userId),
        where("isActive", "==", true)
      )
      const snapshot = await getDocs(q)

      const userCategories = snapshot.docs.map((doc) => {
        const data = doc.data()
        console.log("Category document:", {
          docId: doc.id,
          dataId: data.id,
          name: data.name,
          isHardcoded: doc.id.startsWith("default_"),
        })
        const { id, ...dataWithoutId } = doc.data()
        return {
          id: doc.id, // 실제 Firestore ID 사용 (하드코딩된 ID 덮어쓰기)
          ...dataWithoutId,
          created_at: doc.data().created_at?.toDate() || new Date(),
          updated_at: doc.data().updated_at?.toDate() || new Date(),
        }
      }) as ActivityCategory[]

      // 중복 제거 (같은 name을 가진 카테고리 중 하나만 유지)
      const uniqueCategories = userCategories.reduce((acc, category) => {
        const existing = acc.find((c) => c.name === category.name)
        if (!existing) {
          acc.push(category)
        }
        return acc
      }, [] as ActivityCategory[])

      console.log(
        "User categories found:",
        userCategories.length,
        "Unique:",
        uniqueCategories.length,
        uniqueCategories.map((c) => ({
          id: c.id,
          name: c.name,
          isHardcoded: c.id.startsWith("default_"),
        }))
      )

      // 각 카테고리의 ID와 name 출력
      uniqueCategories.forEach((cat) => {
        console.log("📂 Category:", {
          id: cat.id,
          name: cat.name,
          userId: cat.userId,
        })
      })

      // 카테고리가 없으면 기본 데이터로 초기화 (한 번만)
      if (userCategories.length === 0) {
        // 이미 초기화 중인 유저는 대기
        if (this.initializingUsers.has(userId)) {
          console.log("User is already being initialized, waiting...")
          // 초기화 완료까지 대기 (최대 5초)
          let attempts = 0
          while (this.initializingUsers.has(userId) && attempts < 50) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            attempts++
          }
          // 대기 후 다시 데이터 가져오기
          const retrySnapshot = await getDocs(q)
          const retryCategories = retrySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate() || new Date(),
            updated_at: doc.data().updated_at?.toDate() || new Date(),
          })) as ActivityCategory[]
          return retryCategories
        }

        console.log("No categories found, initializing...")
        this.initializingUsers.add(userId)

        try {
          await this.initializeUserCategories(userId)
          // 초기화 후 다시 데이터베이스에서 가져오기
          const newSnapshot = await getDocs(q)
          const newCategories = newSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate() || new Date(),
            updated_at: doc.data().updated_at?.toDate() || new Date(),
          })) as ActivityCategory[]
          console.log(
            "After initialization:",
            newCategories.length,
            newCategories.map((c) => c.id)
          )
          return newCategories
        } finally {
          this.initializingUsers.delete(userId)
        }
      }

      return uniqueCategories
    } catch (error) {
      console.error("Error getting categories:", error)
      // 오류 시 기본 카테고리 반환
      return this.getDefaultCategories()
    }
  }

  // 사용자 카테고리 초기화 (기본 데이터를 유저별로 복사)
  private static async initializeUserCategories(userId: string): Promise<void> {
    try {
      console.log("🚀 Starting user categories initialization for:", userId)

      const categoriesRef = collection(db, "userCategories")
      const itemsRef = collection(db, "userActivityItems")
      const defaultCategories = this.getDefaultCategories()
      const defaultItems = this.getDefaultItems()

      console.log("📋 Default categories:", defaultCategories.length)
      console.log("📋 Default items:", defaultItems.length)

      // 기본 카테고리들을 해당 유저의 데이터로 복사
      const categoryIdMap = new Map<string, string>()
      for (const category of defaultCategories) {
        console.log("📂 Creating category:", {
          originalId: category.id,
          name: category.name,
        })
        const docRef = await addDoc(categoriesRef, {
          ...category,
          userId,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        })
        console.log("✅ Category created with new ID:", docRef.id)
        console.log("🔗 ID mapping:", { original: category.id, new: docRef.id })
        categoryIdMap.set(category.id, docRef.id)
      }

      console.log("🗺️ Category ID mapping:", Object.fromEntries(categoryIdMap))

      // 기본 아이템들을 해당 유저의 데이터로 복사
      let itemsCreated = 0
      for (const item of defaultItems) {
        const newCategoryId = categoryIdMap.get(item.categoryId)
        console.log("📄 Processing item:", {
          name: item.name,
          originalCategoryId: item.categoryId,
          newCategoryId,
        })

        if (newCategoryId) {
          const itemData = {
            ...item,
            categoryId: newCategoryId,
            userId,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          }
          console.log("📝 Item data to be saved:", itemData)

          const docRef = await addDoc(itemsRef, itemData)
          itemsCreated++
          console.log("✅ Item created:", item.name, "with ID:", docRef.id)
        } else {
          console.error("❌ No mapping found for category:", item.categoryId)
        }
      }

      console.log("🎉 User categories and items initialized successfully")
      console.log("📊 Summary:", {
        categoriesCreated: categoryIdMap.size,
        itemsCreated,
      })
    } catch (error) {
      console.error("❌ Error initializing user categories:", error)
      throw error
    }
  }

  // 기본 아이템 반환 (하드코딩된 데이터)
  private static getDefaultItems(): ActivityItem[] {
    return [
      // 씻기 카테고리
      {
        id: "default_item_1",
        categoryId: "default_hygiene",
        name: "양치하기",
        description: "치아 청결 관리",
        estimatedDuration: 5,
        isActive: true,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_2",
        categoryId: "default_hygiene",
        name: "세수하기",
        description: "얼굴 세정",
        estimatedDuration: 3,
        isActive: true,
        order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_3",
        categoryId: "default_hygiene",
        name: "목욕하기",
        description: "전신 세정",
        estimatedDuration: 20,
        isActive: true,
        order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_4",
        categoryId: "default_hygiene",
        name: "샤워하기",
        description: "빠른 전신 세정",
        estimatedDuration: 10,
        isActive: true,
        order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 공부하기 카테고리
      {
        id: "default_item_5",
        categoryId: "default_study",
        name: "수학 공부",
        description: "수학 문제 풀이 및 학습",
        estimatedDuration: 60,
        isActive: true,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_6",
        categoryId: "default_study",
        name: "영어 공부",
        description: "영어 학습 및 연습",
        estimatedDuration: 45,
        isActive: true,
        order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_7",
        categoryId: "default_study",
        name: "코딩 공부",
        description: "프로그래밍 학습",
        estimatedDuration: 90,
        isActive: true,
        order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_8",
        categoryId: "default_study",
        name: "시험 준비",
        description: "시험 대비 학습",
        estimatedDuration: 120,
        isActive: true,
        order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 식사하기 카테고리
      {
        id: "default_item_9",
        categoryId: "default_meals",
        name: "아침 식사",
        description: "아침 식사 준비 및 섭취",
        estimatedDuration: 20,
        isActive: true,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_10",
        categoryId: "default_meals",
        name: "점심 식사",
        description: "점심 식사 준비 및 섭취",
        estimatedDuration: 30,
        isActive: true,
        order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_11",
        categoryId: "default_meals",
        name: "저녁 식사",
        description: "저녁 식사 준비 및 섭취",
        estimatedDuration: 40,
        isActive: true,
        order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_12",
        categoryId: "default_meals",
        name: "간식",
        description: "간식 섭취",
        estimatedDuration: 10,
        isActive: true,
        order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 독서 카테고리
      {
        id: "default_item_13",
        categoryId: "default_reading",
        name: "소설 읽기",
        description: "소설 및 문학 작품 읽기",
        estimatedDuration: 60,
        isActive: true,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_14",
        categoryId: "default_reading",
        name: "전문서 읽기",
        description: "전문서 및 기술서 읽기",
        estimatedDuration: 90,
        isActive: true,
        order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_15",
        categoryId: "default_reading",
        name: "뉴스 읽기",
        description: "뉴스 및 시사 읽기",
        estimatedDuration: 20,
        isActive: true,
        order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_16",
        categoryId: "default_reading",
        name: "잡지 읽기",
        description: "잡지 및 기타 읽기",
        estimatedDuration: 30,
        isActive: true,
        order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 자기계발 카테고리
      {
        id: "default_item_17",
        categoryId: "default_self_dev",
        name: "언어 학습",
        description: "외국어 학습",
        estimatedDuration: 45,
        isActive: true,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_18",
        categoryId: "default_self_dev",
        name: "스킬 학습",
        description: "새로운 기술 학습",
        estimatedDuration: 60,
        isActive: true,
        order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_19",
        categoryId: "default_self_dev",
        name: "인강 시청",
        description: "온라인 강의 시청",
        estimatedDuration: 90,
        isActive: true,
        order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_20",
        categoryId: "default_self_dev",
        name: "독서",
        description: "자기계발서 읽기",
        estimatedDuration: 45,
        isActive: true,
        order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 운동 카테고리
      {
        id: "default_item_21",
        categoryId: "default_exercise",
        name: "조깅",
        description: "달리기 및 조깅",
        estimatedDuration: 30,
        isActive: true,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_22",
        categoryId: "default_exercise",
        name: "헬스장",
        description: "헬스장 운동",
        estimatedDuration: 60,
        isActive: true,
        order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_23",
        categoryId: "default_exercise",
        name: "홈트레이닝",
        description: "집에서 하는 운동",
        estimatedDuration: 30,
        isActive: true,
        order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_24",
        categoryId: "default_exercise",
        name: "산책",
        description: "걷기 및 산책",
        estimatedDuration: 20,
        isActive: true,
        order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 휴식 카테고리
      {
        id: "default_item_25",
        categoryId: "default_rest",
        name: "낮잠",
        description: "낮잠 및 휴식",
        estimatedDuration: 30,
        isActive: true,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_26",
        categoryId: "default_rest",
        name: "TV 시청",
        description: "TV 및 영상 시청",
        estimatedDuration: 60,
        isActive: true,
        order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_27",
        categoryId: "default_rest",
        name: "음악 감상",
        description: "음악 듣기",
        estimatedDuration: 20,
        isActive: true,
        order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_item_28",
        categoryId: "default_rest",
        name: "게임",
        description: "게임 및 오락",
        estimatedDuration: 45,
        isActive: true,
        order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]
  }

  // 기본 카테고리 반환 (하드코딩된 데이터)
  private static getDefaultCategories(): ActivityCategory[] {
    return [
      {
        id: "default_hygiene",
        name: "씻기",
        description: "개인 위생 관리",
        icon: "🛁",
        color: "blue",
        isActive: true,
        order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_study",
        name: "공부하기",
        description: "학습 및 교육 활동",
        icon: "📚",
        color: "green",
        isActive: true,
        order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_meals",
        name: "식사하기",
        description: "음식 섭취 및 식사 준비",
        icon: "🍽️",
        color: "orange",
        isActive: true,
        order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_reading",
        name: "독서",
        description: "책 읽기 및 독서 활동",
        icon: "📖",
        color: "purple",
        isActive: true,
        order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_self_dev",
        name: "자기계발",
        description: "개인 성장 및 개발 활동",
        icon: "💪",
        color: "red",
        isActive: true,
        order: 5,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_exercise",
        name: "운동",
        description: "신체 활동 및 운동",
        icon: "🏃",
        color: "yellow",
        isActive: true,
        order: 6,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_rest",
        name: "휴식",
        description: "쉬기 및 휴식 활동",
        icon: "😴",
        color: "gray",
        isActive: true,
        order: 7,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "default_others",
        name: "기타",
        description: "기타 활동",
        icon: "⚡",
        color: "indigo",
        isActive: true,
        order: 8,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]
  }

  static async createCategory(
    userId: string,
    categoryData: Omit<ActivityCategory, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    try {
      // 커스텀 카테고리만 저장
      const categoriesRef = collection(db, "userCategories")
      const docRef = await addDoc(categoriesRef, {
        ...categoryData,
        userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      return docRef.id
    } catch (error) {
      console.error("Error creating category:", error)
      throw new ApiError("카테고리 생성 중 오류가 발생했습니다.")
    }
  }

  static async updateCategory(
    categoryId: string,
    updateData: Partial<Omit<ActivityCategory, "id" | "created_at">>
  ): Promise<void> {
    try {
      const categoryRef = doc(db, "userCategories", categoryId)
      await updateDoc(categoryRef, {
        ...updateData,
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error updating category:", error)
      throw new ApiError("카테고리 수정 중 오류가 발생했습니다.")
    }
  }

  static async deleteCategory(categoryId: string): Promise<void> {
    try {
      // 1. 해당 카테고리의 모든 아이템들을 soft delete
      const itemsRef = collection(db, "userActivityItems")
      const itemsQuery = query(
        itemsRef,
        where("categoryId", "==", categoryId),
        where("isActive", "==", true)
      )
      const itemsSnapshot = await getDocs(itemsQuery)

      // 모든 아이템을 soft delete
      const itemUpdatePromises = itemsSnapshot.docs.map((itemDoc) =>
        updateDoc(doc(db, "userActivityItems", itemDoc.id), {
          isActive: false,
          updated_at: serverTimestamp(),
        })
      )
      await Promise.all(itemUpdatePromises)

      // 2. 카테고리 자체를 soft delete
      const categoryRef = doc(db, "userCategories", categoryId)
      await updateDoc(categoryRef, {
        isActive: false,
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error deleting category:", error)
      throw new ApiError("카테고리 삭제 중 오류가 발생했습니다.")
    }
  }

  // 활동 아이템 관련
  static async getActivityItems(
    categoryId: string,
    userDocId: string // Firestore 문서 ID
  ): Promise<ActivityItem[]> {
    try {
      console.log("🔍 getActivityItems called with:", { categoryId, userDocId })

      // 색인이 있으므로 바로 아이템 조회
      const itemsRef = collection(db, "userActivityItems")
      const q = query(
        itemsRef,
        where("categoryId", "==", categoryId),
        where("userId", "==", userDocId)
      )

      const snapshot = await getDocs(q)
      console.log("📊 Snapshot result:", {
        size: snapshot.size,
        empty: snapshot.empty,
        docs: snapshot.docs.length,
      })

      console.log("📋 Query created for userActivityItems:", {
        categoryId: categoryId,
        userId: userDocId,
      })

      // 쿼리 실행 전에 실제 데이터 확인
      console.log("🔍 Debug: Checking all items for this user...")
      const allItemsRef = collection(db, "userActivityItems")
      const allItemsQuery = query(
        allItemsRef,
        where("userId", "==", userDocId),
        where("isActive", "==", true)
      )
      const allItemsSnapshot = await getDocs(allItemsQuery)
      console.log("📊 All items for user:", {
        total: allItemsSnapshot.docs.length,
        items: allItemsSnapshot.docs.map((doc) => ({
          id: doc.id,
          categoryId: doc.data().categoryId,
          name: doc.data().name,
          userId: doc.data().userId,
        })),
      })

      const items = snapshot.docs.map((doc) => {
        const data = doc.data()
        console.log("📄 Document data:", {
          id: doc.id,
          categoryId: data.categoryId,
          userId: data.userId,
          name: data.name,
          isActive: data.isActive,
        })
        return {
          id: doc.id,
          ...data,
          order: data.order || 0,
          isActive: data.isActive || true,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        }
      }) as ActivityItem[]

      console.log(
        "✅ Final items:",
        items.length,
        items.map((i) => ({ id: i.id, name: i.name, categoryId: i.categoryId }))
      )

      // 클라이언트 사이드에서 정렬
      return items.sort((a, b) => a.order - b.order)
    } catch (error) {
      console.error("❌ Error getting activity items:", error)
      throw new ApiError("활동 아이템을 가져오는 중 오류가 발생했습니다.")
    }
  }

  // 하드코딩된 ID로 카테고리 이름 찾기
  private static getCategoryNameById(categoryId: string): string {
    const defaultCategories = this.getDefaultCategories()
    const category = defaultCategories.find((cat) => cat.id === categoryId)
    return category?.name || ""
  }

  static async createActivityItem(
    itemData: Omit<ActivityItem, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    try {
      const itemsRef = collection(db, "userActivityItems")
      const docRef = await addDoc(itemsRef, {
        ...itemData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      return docRef.id
    } catch (error) {
      console.error("Error creating activity item:", error)
      throw new ApiError("활동 아이템 생성 중 오류가 발생했습니다.")
    }
  }

  static async updateActivityItem(
    itemId: string,
    updateData: Partial<Omit<ActivityItem, "id" | "created_at">>
  ): Promise<void> {
    try {
      const itemRef = doc(db, "userActivityItems", itemId)
      await updateDoc(itemRef, {
        ...updateData,
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error updating activity item:", error)
      throw new ApiError("활동 아이템 수정 중 오류가 발생했습니다.")
    }
  }

  static async deleteActivityItem(itemId: string): Promise<void> {
    try {
      const itemRef = doc(db, "userActivityItems", itemId)
      await updateDoc(itemRef, {
        isActive: false,
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error deleting activity item:", error)
      throw new ApiError("활동 아이템 삭제 중 오류가 발생했습니다.")
    }
  }

  // 타이머 세션 관련
  static async createTimerSession(
    sessionData: Omit<TimerSession, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    try {
      const sessionsRef = collection(db, "timerSessions")
      const docRef = await addDoc(sessionsRef, {
        ...sessionData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      return docRef.id
    } catch (error) {
      console.error("Error creating timer session:", error)
      throw new ApiError("타이머 세션 생성 중 오류가 발생했습니다.")
    }
  }

  static async updateTimerSession(
    sessionId: string,
    updateData: Partial<Omit<TimerSession, "id" | "created_at">>
  ): Promise<void> {
    try {
      const sessionRef = doc(db, "timerSessions", sessionId)
      await updateDoc(sessionRef, {
        ...updateData,
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error updating timer session:", error)
      throw new ApiError("타이머 세션 업데이트 중 오류가 발생했습니다.")
    }
  }

  static async getTodaySessions(userId: string): Promise<TimerSession[]> {
    try {
      const today = new Date()
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      )
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      )

      const sessionsRef = collection(db, "timerSessions")
      const q = query(sessionsRef, where("userId", "==", userId))
      const snapshot = await getDocs(q)

      const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || undefined,
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as TimerSession[]

      // 각 세션에 대해 pauseRecords 가져오기
      const sessionsWithPauseRecords = await Promise.all(
        sessions.map(async (session) => {
          try {
            const pauseRecordsRef = collection(db, "pauseRecords")
            const pauseQuery = query(
              pauseRecordsRef,
              where("sessionId", "==", session.id)
            )
            const pauseSnapshot = await getDocs(pauseQuery)

            const pauseRecords = pauseSnapshot.docs.map((pauseDoc) => ({
              id: pauseDoc.id,
              ...pauseDoc.data(),
              pauseTime: pauseDoc.data().pauseTime?.toDate() || new Date(),
              resumeTime: pauseDoc.data().resumeTime?.toDate() || undefined,
              created_at: pauseDoc.data().created_at?.toDate() || new Date(),
            })) as PauseRecord[]

            return {
              ...session,
              pauseRecords,
            }
          } catch (error) {
            console.error(
              `Error fetching pause records for session ${session.id}:`,
              error
            )
            return {
              ...session,
              pauseRecords: [],
            }
          }
        })
      )

      // 클라이언트 사이드에서 오늘 날짜 필터링 및 시간순 정렬 (최신순)
      const todaySessions = sessionsWithPauseRecords.filter((session) => {
        const sessionDate = session.startTime
        return sessionDate >= startOfDay && sessionDate < endOfDay
      })

      return todaySessions.sort(
        (a, b) => b.startTime.getTime() - a.startTime.getTime()
      )
    } catch (error) {
      console.error("Error getting today sessions:", error)
      // 데이터가 없을 때는 빈 배열 반환, 실제 오류일 때만 에러 던지기
      if (error instanceof Error && error.message.includes("permission")) {
        throw new ApiError("세션에 접근할 권한이 없습니다.")
      }
      return [] // 데이터가 없을 때는 빈 배열 반환
    }
  }

  // 특정 날짜의 세션 데이터 가져오기 (상세 기록용)
  static async getSessionsByDate(
    userId: string,
    targetDate: Date
  ): Promise<TimerSession[]> {
    try {
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      const sessionsRef = collection(db, "timerSessions")
      const q = query(
        sessionsRef,
        where("userId", "==", userId),
        where("startTime", ">=", startOfDay),
        where("startTime", "<=", endOfDay),
        orderBy("startTime", "asc")
      )
      const snapshot = await getDocs(q)

      const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || undefined,
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as TimerSession[]

      // 각 세션에 대해 pauseRecords 가져오기
      const sessionsWithPauseRecords = await Promise.all(
        sessions.map(async (session) => {
          try {
            const pauseRecordsRef = collection(db, "pauseRecords")
            const pauseQuery = query(
              pauseRecordsRef,
              where("sessionId", "==", session.id)
            )
            const pauseSnapshot = await getDocs(pauseQuery)

            const pauseRecords = pauseSnapshot.docs.map((pauseDoc) => ({
              id: pauseDoc.id,
              ...pauseDoc.data(),
              pauseTime: pauseDoc.data().pauseTime?.toDate() || new Date(),
              resumeTime: pauseDoc.data().resumeTime?.toDate() || undefined,
              created_at: pauseDoc.data().created_at?.toDate() || new Date(),
            })) as PauseRecord[]

            return {
              ...session,
              pauseRecords,
            }
          } catch (error) {
            console.error(
              `Error fetching pause records for session ${session.id}:`,
              error
            )
            return {
              ...session,
              pauseRecords: [],
            }
          }
        })
      )

      return sessionsWithPauseRecords
    } catch (error) {
      console.error("Error getting sessions by date:", error)
      if (error instanceof Error && error.message.includes("permission")) {
        throw new ApiError("세션에 접근할 권한이 없습니다.")
      }
      return []
    }
  }

  // 일시정지 기록 관련
  static async createPauseRecord(
    pauseData: Omit<PauseRecord, "id" | "created_at">
  ): Promise<string> {
    try {
      const pausesRef = collection(db, "pauseRecords")
      const docRef = await addDoc(pausesRef, {
        ...pauseData,
        created_at: serverTimestamp(),
      })
      return docRef.id
    } catch (error) {
      console.error("Error creating pause record:", error)
      throw new ApiError("일시정지 기록 생성 중 오류가 발생했습니다.")
    }
  }

  static async updatePauseRecord(
    pauseId: string,
    updateData: Partial<Omit<PauseRecord, "id" | "created_at">>
  ): Promise<void> {
    try {
      const pauseRef = doc(db, "pauseRecords", pauseId)
      await updateDoc(pauseRef, updateData)
    } catch (error) {
      console.error("Error updating pause record:", error)
      throw new ApiError("일시정지 기록 업데이트 중 오류가 발생했습니다.")
    }
  }

  static async getPauseRecords(sessionId: string): Promise<PauseRecord[]> {
    try {
      const pausesRef = collection(db, "pauseRecords")
      const q = query(pausesRef, where("sessionId", "==", sessionId))
      const snapshot = await getDocs(q)

      const pauses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        pauseTime: doc.data().pauseTime?.toDate() || new Date(),
        resumeTime: doc.data().resumeTime?.toDate() || undefined,
        created_at: doc.data().created_at?.toDate() || new Date(),
      })) as PauseRecord[]

      // 클라이언트 사이드에서 시간순 정렬
      return pauses.sort(
        (a, b) => a.pauseTime.getTime() - b.pauseTime.getTime()
      )
    } catch (error) {
      console.error("Error getting pause records:", error)
      throw new ApiError("일시정지 기록을 가져오는 중 오류가 발생했습니다.")
    }
  }

  // 피드백 관련
  static async updateSessionFeedback(
    sessionId: string,
    feedback: string,
    rating: number
  ): Promise<void> {
    try {
      const sessionRef = doc(db, "timerSessions", sessionId)
      await updateDoc(sessionRef, {
        feedback,
        rating,
        updated_at: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error updating session feedback:", error)
      throw new ApiError("피드백 업데이트 중 오류가 발생했습니다.")
    }
  }

  // 타이머 세션 삭제
  static async deleteTimerSession(sessionId: string): Promise<void> {
    try {
      const sessionRef = doc(db, "timerSessions", sessionId)
      await deleteDoc(sessionRef)
    } catch (error) {
      console.error("Error deleting timer session:", error)
      throw new ApiError("세션 삭제 중 오류가 발생했습니다.")
    }
  }

  // 관리자용: 특정 사용자 아이템 초기화 (기존 데이터 삭제 후 재생성)
  static async forceInitializeItems(userId: string): Promise<void> {
    try {
      console.log("🔧 Force initializing items for user:", userId)

      // 1. 기존 사용자 데이터 삭제
      await this.deleteUserData(userId)
      console.log("🗑️ Existing user data deleted")

      // 2. 새로 초기화
      await this.initializeUserCategories(userId)
      console.log("✅ User items reinitialized successfully")
    } catch (error) {
      console.error("Error force initializing items:", error)
      throw error
    }
  }

  // 관리자용: 특정 사용자 아이템만 초기화 (기존 데이터 유지)
  static async initializeUserItemsOnly(userId: string): Promise<void> {
    try {
      console.log(
        "🔧 Initializing items for user (preserving existing):",
        userId
      )

      // 기존 아이템이 있는지 확인
      const itemsRef = collection(db, "userActivityItems")
      const itemsQuery = query(
        itemsRef,
        where("userId", "==", userId),
        where("isActive", "==", true)
      )
      const itemsSnapshot = await getDocs(itemsQuery)

      if (itemsSnapshot.docs.length > 0) {
        console.log("⚠️ User already has items:", itemsSnapshot.docs.length)
        throw new Error(
          "사용자에게 이미 아이템이 존재합니다. 기존 데이터를 유지하려면 '아이템 추가 초기화'를 사용하세요."
        )
      }

      // 아이템이 없으면 초기화
      await this.initializeUserCategories(userId)
      console.log("✅ User items initialized successfully")
    } catch (error) {
      console.error("Error initializing user items:", error)
      throw error
    }
  }

  // 관리자 권한 확인
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      const usersRef = collection(db, "users")
      const userQuery = query(usersRef, where("uid", "==", userId))
      const userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        return false
      }

      const userData = userSnapshot.docs[0].data()
      return userData.isAdmin === true
    } catch (error) {
      console.error("Error checking admin status:", error)
      return false
    }
  }

  // 관리자 계정 설정 (임시 디버깅용)
  static async setUserAsAdmin(userId: string): Promise<void> {
    try {
      const usersRef = collection(db, "users")
      const userQuery = query(usersRef, where("uid", "==", userId))
      const userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        throw new Error("User not found")
      }

      const userDoc = userSnapshot.docs[0]
      await updateDoc(userDoc.ref, {
        isAdmin: true,
        updated_at: serverTimestamp(),
      })

      console.log("✅ User set as admin:", userId)
    } catch (error) {
      console.error("Error setting user as admin:", error)
      throw error
    }
  }

  // 관리자용: 모든 컬렉션 삭제
  static async deleteAllCollections(): Promise<void> {
    try {
      console.log("🗑️ Starting deletion of all collections...")

      // 삭제할 컬렉션 목록
      const collections = [
        "users",
        "userCategories",
        "userActivityItems",
        "timerSessions",
        "pauseRecords",
        "activityCategories", // 기존 데이터
        "activityItems", // 기존 데이터
      ]

      const deletePromises = collections.map(async (collectionName) => {
        try {
          const collectionRef = collection(db, collectionName)
          const snapshot = await getDocs(collectionRef)

          console.log(
            `📊 ${collectionName}: ${snapshot.docs.length} documents found`
          )

          const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))
          await Promise.all(deletePromises)

          console.log(`✅ ${collectionName}: All documents deleted`)
        } catch (error) {
          console.error(`❌ Error deleting ${collectionName}:`, error)
          throw error
        }
      })

      await Promise.all(deletePromises)
      console.log("🎉 All collections deleted successfully!")
    } catch (error) {
      console.error("❌ Error deleting all collections:", error)
      throw new ApiError("모든 컬렉션 삭제 중 오류가 발생했습니다.")
    }
  }

  // 사용자 데이터 완전 삭제 (탈퇴)
  static async deleteUserData(userId: string): Promise<void> {
    try {
      // 1. users 컬렉션에서 사용자 데이터 삭제
      const usersRef = collection(db, "users")
      const userQuery = query(usersRef, where("uid", "==", userId))
      const userSnapshot = await getDocs(userQuery)

      const userDeletePromises = userSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      )
      await Promise.all(userDeletePromises)

      // 2. 사용자의 모든 카테고리 삭제
      const categoriesRef = collection(db, "userCategories")
      const categoriesQuery = query(
        categoriesRef,
        where("userId", "==", userId)
      )
      const categoriesSnapshot = await getDocs(categoriesQuery)

      const categoryDeletePromises = categoriesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      )
      await Promise.all(categoryDeletePromises)

      // 3. 사용자의 모든 활동 아이템 삭제
      const itemsRef = collection(db, "userActivityItems")
      const itemsQuery = query(itemsRef, where("userId", "==", userId))
      const itemsSnapshot = await getDocs(itemsQuery)

      const itemDeletePromises = itemsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      )
      await Promise.all(itemDeletePromises)

      // 4. 사용자의 모든 타이머 세션 삭제
      const sessionsRef = collection(db, "timerSessions")
      const sessionsQuery = query(sessionsRef, where("userId", "==", userId))
      const sessionsSnapshot = await getDocs(sessionsQuery)

      const sessionDeletePromises = sessionsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      )
      await Promise.all(sessionDeletePromises)

      // 5. 사용자의 모든 일시정지 기록 삭제
      const pauseRecordsRef = collection(db, "pauseRecords")
      const pauseQuery = query(pauseRecordsRef, where("userId", "==", userId))
      const pauseSnapshot = await getDocs(pauseQuery)

      const pauseDeletePromises = pauseSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      )
      await Promise.all(pauseDeletePromises)

      // 6. 기존 activityCategories에서 사용자 데이터 삭제 (만약 있다면)
      const oldCategoriesRef = collection(db, "activityCategories")
      const oldCategoriesQuery = query(
        oldCategoriesRef,
        where("userId", "==", userId)
      )
      const oldCategoriesSnapshot = await getDocs(oldCategoriesQuery)

      const oldCategoryDeletePromises = oldCategoriesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      )
      await Promise.all(oldCategoryDeletePromises)

      // 7. 기존 activityItems에서 사용자 데이터 삭제 (만약 있다면)
      const oldItemsRef = collection(db, "activityItems")
      const oldItemsQuery = query(oldItemsRef, where("userId", "==", userId))
      const oldItemsSnapshot = await getDocs(oldItemsQuery)

      const oldItemDeletePromises = oldItemsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      )
      await Promise.all(oldItemDeletePromises)

      console.log("User data deleted successfully")
    } catch (error) {
      console.error("Error deleting user data:", error)
      throw new ApiError("사용자 데이터 삭제 중 오류가 발생했습니다.")
    }
  }
}
