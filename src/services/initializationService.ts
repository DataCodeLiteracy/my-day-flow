import { ActivityService } from "./activityService"
import {
  defaultCategories,
  defaultActivityItems,
} from "@/data/defaultActivities"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

export class InitializationService {
  // 초기화 중인 사용자 추적
  private static initializingUsers = new Set<string>()

  // 모든 카테고리 가져오기 (isActive 조건 없이)
  private static async getAllCategories(userId: string) {
    try {
      const categoriesRef = collection(db, "activityCategories")
      const q = query(categoriesRef, where("userId", "==", userId))
      const snapshot = await getDocs(q)
      return snapshot.docs
    } catch (error) {
      console.error("Error getting all categories:", error)
      return []
    }
  }

  // 사용자 초기화 - 기본 카테고리와 아이템들 생성
  static async initializeUser(userId: string): Promise<void> {
    try {
      // 이미 초기화 중인 사용자인 경우 스킵
      if (this.initializingUsers.has(userId)) {
        console.log("User initialization already in progress, skipping...")
        return
      }

      // 기존 카테고리가 있는지 확인 (isActive 조건 없이)
      const existingCategories = await this.getAllCategories(userId)

      // 이미 초기화된 사용자인 경우 스킵
      if (existingCategories.length > 0) {
        console.log("User already initialized, skipping...")
        return
      }

      // 초기화 시작 표시
      this.initializingUsers.add(userId)
      console.log("Initializing user with default categories...")

      // 기본 카테고리들 생성
      const categoryIdMap = new Map<string, string>()

      for (const categoryData of defaultCategories) {
        const categoryId = await ActivityService.createCategory(
          userId,
          categoryData
        )
        categoryIdMap.set(categoryData.name, categoryId)
      }

      // 기본 활동 아이템들 생성 (카테고리 ID 매핑)
      const categoryNameToId = new Map([
        ["씻기", categoryIdMap.get("씻기")],
        ["공부하기", categoryIdMap.get("공부하기")],
        ["식사하기", categoryIdMap.get("식사하기")],
        ["독서", categoryIdMap.get("독서")],
        ["자기계발", categoryIdMap.get("자기계발")],
        ["운동", categoryIdMap.get("운동")],
        ["휴식", categoryIdMap.get("휴식")],
        ["기타", categoryIdMap.get("기타")],
      ])

      // 카테고리별로 아이템들 생성
      const categoryItems = new Map<string, typeof defaultActivityItems>()

      for (const item of defaultActivityItems) {
        const categoryName = this.getCategoryNameFromId(item.categoryId)
        const realCategoryId = categoryNameToId.get(categoryName)

        if (realCategoryId) {
          if (!categoryItems.has(realCategoryId)) {
            categoryItems.set(realCategoryId, [])
          }
          categoryItems.get(realCategoryId)!.push({
            ...item,
            categoryId: realCategoryId,
          })
        }
      }

      // 각 카테고리의 아이템들 생성
      for (const [categoryId, items] of categoryItems) {
        for (const item of items) {
          await ActivityService.createActivityItem(item)
        }
      }

      console.log("User initialization completed successfully")
    } catch (error) {
      console.error("Error initializing user:", error)
      throw error
    } finally {
      // 초기화 완료 후 Set에서 제거
      this.initializingUsers.delete(userId)
    }
  }

  // 카테고리 ID에서 카테고리 이름 추출
  private static getCategoryNameFromId(categoryId: string): string {
    const idToName = new Map([
      ["category_1", "씻기"],
      ["category_2", "공부하기"],
      ["category_3", "식사하기"],
      ["category_4", "독서"],
      ["category_5", "자기계발"],
      ["category_6", "운동"],
      ["category_7", "휴식"],
      ["category_8", "기타"],
    ])

    return idToName.get(categoryId) || "기타"
  }
}
