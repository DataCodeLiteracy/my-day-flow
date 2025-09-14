const { initializeApp } = require("firebase/app")
const {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} = require("firebase/firestore")

// Firebase 설정 (환경변수에서 가져오거나 직접 설정)
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "my-day-flow.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "my-day-flow",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "my-day-flow.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:123456789:web:xxxxxxxxxxxxxxxx",
}

// 환경변수가 없으면 사용자에게 알림
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.log(
    "⚠️  환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요."
  )
  console.log("📝 .env.local 파일에 다음 내용을 추가하세요:")
  console.log(`
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
  `)
  console.log(
    "🔧 또는 Firebase 콘솔에서 프로젝트 설정 > 일반 > 웹 앱에서 설정을 복사하세요."
  )
}

// Firebase 초기화
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// 기본 카테고리 데이터
const defaultCategories = [
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

// 기본 활동 아이템 데이터
const defaultActivityItems = [
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

async function seedData() {
  try {
    console.log("🌱 데이터 시딩을 시작합니다...")

    // 1. 기존 데이터 확인
    console.log("🔍 기존 데이터를 확인하는 중...")
    const categoriesRef = collection(db, "activityCategories")
    const existingCategoriesQuery = query(
      categoriesRef,
      where("userId", "==", "default")
    )
    const existingCategoriesSnapshot = await getDocs(existingCategoriesQuery)

    if (!existingCategoriesSnapshot.empty) {
      console.log(
        "⚠️  기존 데이터가 발견되었습니다. 삭제 후 다시 생성합니다..."
      )

      // 기존 데이터 삭제
      const batch = []
      existingCategoriesSnapshot.docs.forEach((doc) => {
        batch.push(doc.ref.delete())
      })
      await Promise.all(batch)
      console.log("🗑️  기존 카테고리 데이터가 삭제되었습니다.")
    }

    // 2. 카테고리 데이터 삽입
    console.log("📁 카테고리 데이터를 삽입하는 중...")
    const categoryMap = {}

    for (const categoryData of defaultCategories) {
      const categoryRef = await addDoc(categoriesRef, {
        ...categoryData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      categoryMap[categoryData.name] = categoryRef.id
      console.log(
        `✅ 카테고리 추가: ${categoryData.name} (ID: ${categoryRef.id})`
      )
    }

    // 3. 기존 활동 아이템 삭제
    const activityItemsRef = collection(db, "activityItems")
    const existingItemsQuery = query(
      activityItemsRef,
      where("userId", "==", "default")
    )
    const existingItemsSnapshot = await getDocs(existingItemsQuery)

    if (!existingItemsSnapshot.empty) {
      console.log("🗑️  기존 활동 아이템 데이터를 삭제하는 중...")
      const batch = []
      existingItemsSnapshot.docs.forEach((doc) => {
        batch.push(doc.ref.delete())
      })
      await Promise.all(batch)
      console.log("✅ 기존 활동 아이템 데이터가 삭제되었습니다.")
    }

    // 4. 활동 아이템 데이터 삽입
    console.log("📝 활동 아이템 데이터를 삽입하는 중...")

    // 카테고리 이름을 ID로 매핑
    const categoryNameMap = {
      hygiene: "씻기",
      meals: "식사하기",
      study: "공부하기",
      reading: "독서",
      exercise: "운동",
      self_development: "자기계발",
      rest: "휴식",
      others: "기타",
    }

    for (const itemData of defaultActivityItems) {
      const categoryName = categoryNameMap[itemData.categoryId]
      const categoryId = categoryMap[categoryName]

      if (categoryId) {
        const itemRef = await addDoc(activityItemsRef, {
          ...itemData,
          categoryId, // 실제 Firebase 카테고리 ID로 연결
          created_at: new Date(),
          updated_at: new Date(),
        })
        console.log(
          `✅ 활동 아이템 추가: ${itemData.name} (카테고리: ${categoryName}, ID: ${categoryId})`
        )
      } else {
        console.log(
          `❌ 카테고리를 찾을 수 없음: ${itemData.categoryId} -> ${categoryName}`
        )
      }
    }

    console.log("🎉 데이터 시딩이 완료되었습니다!")
    console.log(
      `📊 총 ${defaultCategories.length}개 카테고리, ${defaultActivityItems.length}개 활동 아이템이 추가되었습니다.`
    )
  } catch (error) {
    console.error("❌ 데이터 시딩 중 오류 발생:", error)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  seedData().then(() => {
    console.log("✅ 스크립트 실행 완료")
    process.exit(0)
  })
}

module.exports = { seedData }
