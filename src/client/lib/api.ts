import type { ApiResult } from '@/shared/types/api'

const BASE_URL = '/api'

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  const json: ApiResult<T> = await res.json()

  if (!json.success) {
    throw new Error(json.error)
  }

  return json.data
}
