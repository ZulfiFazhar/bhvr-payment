export type ApiResponse<T> = {
  success: true
  data: T
}

export type ApiError = {
  success: false
  error: string
  details?: unknown
}

export type ApiResult<T> = ApiResponse<T> | ApiError
