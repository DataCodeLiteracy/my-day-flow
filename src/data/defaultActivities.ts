import { ActivityCategory, ActivityItem } from "@/types/activity"

export const defaultCategories: Omit<
  ActivityCategory,
  "id" | "created_at" | "updated_at"
>[] = [
  {
    name: "씻기",
    description: "개인 위생 관리",
    icon: "🛁",
    color: "blue",
    isActive: true,
    order: 1,
  },
  {
    name: "공부하기",
    description: "학습 및 교육 활동",
    icon: "📚",
    color: "green",
    isActive: true,
    order: 2,
  },
  {
    name: "식사하기",
    description: "음식 섭취 및 식사 준비",
    icon: "🍽️",
    color: "orange",
    isActive: true,
    order: 3,
  },
  {
    name: "독서",
    description: "책 읽기 및 독서 활동",
    icon: "📖",
    color: "purple",
    isActive: true,
    order: 4,
  },
  {
    name: "자기계발",
    description: "개인 성장 및 개발 활동",
    icon: "💪",
    color: "red",
    isActive: true,
    order: 5,
  },
  {
    name: "운동",
    description: "신체 활동 및 운동",
    icon: "🏃",
    color: "yellow",
    isActive: true,
    order: 6,
  },
  {
    name: "휴식",
    description: "쉬기 및 휴식 활동",
    icon: "😴",
    color: "gray",
    isActive: true,
    order: 7,
  },
  {
    name: "기타",
    description: "기타 활동",
    icon: "⚡",
    color: "indigo",
    isActive: true,
    order: 8,
  },
]

export const defaultActivityItems: Omit<
  ActivityItem,
  "id" | "created_at" | "updated_at"
>[] = [
  // 씻기 카테고리
  {
    categoryId: "category_1", // 씻기
    name: "양치하기",
    description: "치아 청결 관리",
    estimatedDuration: 5,
    isActive: true,
    order: 1,
  },
  {
    categoryId: "category_1",
    name: "세수하기",
    description: "얼굴 세정",
    estimatedDuration: 3,
    isActive: true,
    order: 2,
  },
  {
    categoryId: "category_1",
    name: "목욕하기",
    description: "전신 세정",
    estimatedDuration: 20,
    isActive: true,
    order: 3,
  },
  {
    categoryId: "category_1",
    name: "샤워하기",
    description: "빠른 전신 세정",
    estimatedDuration: 10,
    isActive: true,
    order: 4,
  },

  // 공부하기 카테고리
  {
    categoryId: "category_2", // 공부하기
    name: "수학 공부",
    description: "수학 문제 풀이 및 학습",
    estimatedDuration: 60,
    isActive: true,
    order: 1,
  },
  {
    categoryId: "category_2",
    name: "영어 공부",
    description: "영어 학습 및 연습",
    estimatedDuration: 45,
    isActive: true,
    order: 2,
  },
  {
    categoryId: "category_2",
    name: "코딩 공부",
    description: "프로그래밍 학습",
    estimatedDuration: 90,
    isActive: true,
    order: 3,
  },
  {
    categoryId: "category_2",
    name: "시험 준비",
    description: "시험 대비 학습",
    estimatedDuration: 120,
    isActive: true,
    order: 4,
  },

  // 식사하기 카테고리
  {
    categoryId: "category_3", // 식사하기
    name: "아침 식사",
    description: "아침 식사 준비 및 섭취",
    estimatedDuration: 20,
    isActive: true,
    order: 1,
  },
  {
    categoryId: "category_3",
    name: "점심 식사",
    description: "점심 식사 준비 및 섭취",
    estimatedDuration: 30,
    isActive: true,
    order: 2,
  },
  {
    categoryId: "category_3",
    name: "저녁 식사",
    description: "저녁 식사 준비 및 섭취",
    estimatedDuration: 40,
    isActive: true,
    order: 3,
  },
  {
    categoryId: "category_3",
    name: "간식",
    description: "간식 섭취",
    estimatedDuration: 10,
    isActive: true,
    order: 4,
  },

  // 독서 카테고리
  {
    categoryId: "category_4", // 독서
    name: "소설 읽기",
    description: "소설 및 문학 작품 읽기",
    estimatedDuration: 60,
    isActive: true,
    order: 1,
  },
  {
    categoryId: "category_4",
    name: "전문서 읽기",
    description: "전문서 및 기술서 읽기",
    estimatedDuration: 90,
    isActive: true,
    order: 2,
  },
  {
    categoryId: "category_4",
    name: "뉴스 읽기",
    description: "뉴스 및 시사 읽기",
    estimatedDuration: 20,
    isActive: true,
    order: 3,
  },
  {
    categoryId: "category_4",
    name: "잡지 읽기",
    description: "잡지 및 기타 읽기",
    estimatedDuration: 30,
    isActive: true,
    order: 4,
  },

  // 자기계발 카테고리
  {
    categoryId: "category_5", // 자기계발
    name: "언어 학습",
    description: "외국어 학습",
    estimatedDuration: 45,
    isActive: true,
    order: 1,
  },
  {
    categoryId: "category_5",
    name: "스킬 학습",
    description: "새로운 기술 학습",
    estimatedDuration: 60,
    isActive: true,
    order: 2,
  },
  {
    categoryId: "category_5",
    name: "인강 시청",
    description: "온라인 강의 시청",
    estimatedDuration: 90,
    isActive: true,
    order: 3,
  },
  {
    categoryId: "category_5",
    name: "독서",
    description: "자기계발서 읽기",
    estimatedDuration: 45,
    isActive: true,
    order: 4,
  },

  // 운동 카테고리
  {
    categoryId: "category_6", // 운동
    name: "조깅",
    description: "달리기 및 조깅",
    estimatedDuration: 30,
    isActive: true,
    order: 1,
  },
  {
    categoryId: "category_6",
    name: "헬스장",
    description: "헬스장 운동",
    estimatedDuration: 60,
    isActive: true,
    order: 2,
  },
  {
    categoryId: "category_6",
    name: "홈트레이닝",
    description: "집에서 하는 운동",
    estimatedDuration: 30,
    isActive: true,
    order: 3,
  },
  {
    categoryId: "category_6",
    name: "산책",
    description: "걷기 및 산책",
    estimatedDuration: 20,
    isActive: true,
    order: 4,
  },

  // 휴식 카테고리
  {
    categoryId: "category_7", // 휴식
    name: "낮잠",
    description: "낮잠 및 휴식",
    estimatedDuration: 30,
    isActive: true,
    order: 1,
  },
  {
    categoryId: "category_7",
    name: "TV 시청",
    description: "TV 및 영상 시청",
    estimatedDuration: 60,
    isActive: true,
    order: 2,
  },
  {
    categoryId: "category_7",
    name: "음악 감상",
    description: "음악 듣기",
    estimatedDuration: 20,
    isActive: true,
    order: 3,
  },
  {
    categoryId: "category_7",
    name: "게임",
    description: "게임 및 오락",
    estimatedDuration: 45,
    isActive: true,
    order: 4,
  },
]
