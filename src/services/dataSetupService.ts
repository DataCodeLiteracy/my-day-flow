import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { ActivityService } from "./activityService"

export interface CategoryData {
  id: string
  name: string
  description: string
  icon: string
  color: string
  order: number
  isActive: boolean
  userId: string
  created_at: Date
  updated_at: Date
}

export interface ActivityItemData {
  id: string
  categoryId: string
  name: string
  description: string
  icon: string
  estimatedDuration: number // 분 단위
  order: number
  isActive: boolean
  userId: string
  created_at: Date
  updated_at: Date
}

export class DataSetupService {
  // 기본 카테고리 데이터
  static getDefaultCategories(): Omit<
    CategoryData,
    "id" | "created_at" | "updated_at"
  >[] {
    return [
      {
        name: "씻기",
        description: "개인 위생 관리",
        icon: "🛁",
        color: "#3B82F6",
        order: 1,
        isActive: true,
        userId: "default",
      },
      {
        name: "식사하기",
        description: "음식 섭취 및 식사 준비",
        icon: "🍽️",
        color: "#10B981",
        order: 2,
        isActive: true,
        userId: "default",
      },
      {
        name: "공부하기",
        description: "학습 및 교육 활동",
        icon: "📚",
        color: "#8B5CF6",
        order: 3,
        isActive: true,
        userId: "default",
      },
      {
        name: "독서",
        description: "책 읽기 및 독서 활동",
        icon: "📖",
        color: "#F59E0B",
        order: 4,
        isActive: true,
        userId: "default",
      },
      {
        name: "운동",
        description: "신체 활동 및 운동",
        icon: "🏃",
        color: "#EF4444",
        order: 5,
        isActive: true,
        userId: "default",
      },
      {
        name: "자기계발",
        description: "개인 성장 및 개발 활동",
        icon: "💪",
        color: "#06B6D4",
        order: 6,
        isActive: true,
        userId: "default",
      },
      {
        name: "휴식",
        description: "쉬기 및 휴식 활동",
        icon: "😴",
        color: "#6B7280",
        order: 7,
        isActive: true,
        userId: "default",
      },
      {
        name: "기타",
        description: "기타 활동",
        icon: "⚡",
        color: "#9CA3AF",
        order: 8,
        isActive: true,
        userId: "default",
      },
    ]
  }

  // 기본 활동 아이템 데이터
  static getDefaultActivityItems(): Omit<
    ActivityItemData,
    "id" | "created_at" | "updated_at"
  >[] {
    return [
      // 씻기 카테고리
      {
        categoryId: "hygiene",
        name: "양치하기",
        description: "치아 청결 관리",
        icon: "🦷",
        estimatedDuration: 5,
        order: 1,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "hygiene",
        name: "세수하기",
        description: "얼굴 세정",
        icon: "🧼",
        estimatedDuration: 3,
        order: 2,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "hygiene",
        name: "목욕하기",
        description: "전신 목욕",
        icon: "🛁",
        estimatedDuration: 30,
        order: 3,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "hygiene",
        name: "샤워하기",
        description: "전신 샤워",
        icon: "🚿",
        estimatedDuration: 15,
        order: 4,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "hygiene",
        name: "머리 감기",
        description: "두발 세정",
        icon: "💇",
        estimatedDuration: 10,
        order: 5,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "hygiene",
        name: "피부 관리",
        description: "스킨케어",
        icon: "✨",
        estimatedDuration: 20,
        order: 6,
        isActive: true,
        userId: "default",
      },

      // 식사하기 카테고리
      {
        categoryId: "meals",
        name: "아침식사",
        description: "아침 식사 준비 및 섭취",
        icon: "🌅",
        estimatedDuration: 30,
        order: 1,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "meals",
        name: "점심식사",
        description: "점심 식사 준비 및 섭취",
        icon: "☀️",
        estimatedDuration: 45,
        order: 2,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "meals",
        name: "저녁식사",
        description: "저녁 식사 준비 및 섭취",
        icon: "🌙",
        estimatedDuration: 60,
        order: 3,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "meals",
        name: "간식",
        description: "간식 섭취",
        icon: "🍪",
        estimatedDuration: 15,
        order: 4,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "meals",
        name: "요리하기",
        description: "음식 조리",
        icon: "👨‍🍳",
        estimatedDuration: 90,
        order: 5,
        isActive: true,
        userId: "default",
      },

      // 공부하기 카테고리
      {
        categoryId: "study",
        name: "독서",
        description: "책 읽기",
        icon: "📖",
        estimatedDuration: 60,
        order: 1,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "study",
        name: "과제하기",
        description: "학교 과제 수행",
        icon: "📝",
        estimatedDuration: 120,
        order: 2,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "study",
        name: "온라인 강의",
        description: "인터넷 강의 시청",
        icon: "💻",
        estimatedDuration: 90,
        order: 3,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "study",
        name: "언어 학습",
        description: "외국어 공부",
        icon: "🗣️",
        estimatedDuration: 45,
        order: 4,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "study",
        name: "시험 준비",
        description: "시험 공부",
        icon: "📚",
        estimatedDuration: 180,
        order: 5,
        isActive: true,
        userId: "default",
      },

      // 독서 카테고리
      {
        categoryId: "reading",
        name: "소설 읽기",
        description: "소설책 읽기",
        icon: "📚",
        estimatedDuration: 60,
        order: 1,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "reading",
        name: "전문서적",
        description: "전문 서적 읽기",
        icon: "📖",
        estimatedDuration: 90,
        order: 2,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "reading",
        name: "뉴스 읽기",
        description: "뉴스 기사 읽기",
        icon: "📰",
        estimatedDuration: 30,
        order: 3,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "reading",
        name: "잡지 읽기",
        description: "잡지 읽기",
        icon: "📄",
        estimatedDuration: 45,
        order: 4,
        isActive: true,
        userId: "default",
      },

      // 운동 카테고리
      {
        categoryId: "exercise",
        name: "걷기",
        description: "산책 및 걷기",
        icon: "🚶",
        estimatedDuration: 30,
        order: 1,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "exercise",
        name: "달리기",
        description: "조깅 및 달리기",
        icon: "🏃",
        estimatedDuration: 45,
        order: 2,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "exercise",
        name: "헬스장",
        description: "헬스장 운동",
        icon: "💪",
        estimatedDuration: 90,
        order: 3,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "exercise",
        name: "요가",
        description: "요가 및 스트레칭",
        icon: "🧘",
        estimatedDuration: 60,
        order: 4,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "exercise",
        name: "자전거",
        description: "자전거 타기",
        icon: "🚴",
        estimatedDuration: 60,
        order: 5,
        isActive: true,
        userId: "default",
      },

      // 자기계발 카테고리
      {
        categoryId: "self_development",
        name: "온라인 강의",
        description: "자기계발 강의 수강",
        icon: "💻",
        estimatedDuration: 60,
        order: 1,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "self_development",
        name: "언어 학습",
        description: "외국어 공부",
        icon: "🗣️",
        estimatedDuration: 45,
        order: 2,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "self_development",
        name: "기술 학습",
        description: "프로그래밍 등 기술 학습",
        icon: "💻",
        estimatedDuration: 120,
        order: 3,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "self_development",
        name: "취미 활동",
        description: "개인 취미 활동",
        icon: "🎨",
        estimatedDuration: 90,
        order: 4,
        isActive: true,
        userId: "default",
      },

      // 휴식 카테고리
      {
        categoryId: "rest",
        name: "낮잠",
        description: "낮잠 자기",
        icon: "😴",
        estimatedDuration: 30,
        order: 1,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "rest",
        name: "TV 시청",
        description: "텔레비전 시청",
        icon: "📺",
        estimatedDuration: 60,
        order: 2,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "rest",
        name: "음악 감상",
        description: "음악 듣기",
        icon: "🎵",
        estimatedDuration: 30,
        order: 3,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "rest",
        name: "게임",
        description: "게임하기",
        icon: "🎮",
        estimatedDuration: 60,
        order: 4,
        isActive: true,
        userId: "default",
      },

      // 기타 카테고리
      {
        categoryId: "others",
        name: "청소",
        description: "집안 청소",
        icon: "🧹",
        estimatedDuration: 60,
        order: 1,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "others",
        name: "쇼핑",
        description: "물건 구매",
        icon: "🛒",
        estimatedDuration: 90,
        order: 2,
        isActive: true,
        userId: "default",
      },
      {
        categoryId: "others",
        name: "약속",
        description: "사람들과의 약속",
        icon: "🤝",
        estimatedDuration: 120,
        order: 3,
        isActive: true,
        userId: "default",
      },
    ]
  }

  // 사용자별 기본 데이터 설정 - ActivityService 사용
  static async setupUserData(userId: string): Promise<void> {
    try {
      console.log("Setting up user data...")

      // ActivityService의 getCategories가 자동으로 초기화를 처리함
      await ActivityService.getCategories(userId)

      console.log("기본 데이터가 성공적으로 생성되었습니다.")
    } catch (error) {
      console.error("사용자 데이터 설정 중 오류:", error)
      throw error
    }
  }
}
