import { ActivityService } from "./activityService"

export class InitializationService {
  // 사용자 초기화 - ActivityService의 initializeUserCategories 사용
  static async initializeUser(userId: string): Promise<void> {
    try {
      console.log("Initializing user with default categories...")

      // ActivityService의 getCategories가 자동으로 초기화를 처리함
      await ActivityService.getCategories(userId)

      console.log("User initialization completed successfully")
    } catch (error) {
      console.error("Error initializing user:", error)
      throw error
    }
  }
}
