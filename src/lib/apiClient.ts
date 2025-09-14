export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof Error) {
    return new ApiError(error.message)
  }

  return new ApiError("알 수 없는 오류가 발생했습니다.")
}

