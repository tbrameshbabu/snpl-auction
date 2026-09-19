import type { PostgrestSingleResponse } from '@supabase/supabase-js'
import { ApiError, fromPostgrestError } from './errors'

// Throws a controlled ApiError on any database error; never leaks the message.
export function unwrap<T>(result: PostgrestSingleResponse<T>): T {
  if (result.error) {
    throw fromPostgrestError(result.error)
  }
  return result.data
}

export function unwrapRequired<T>(
  result: PostgrestSingleResponse<T>,
  notFoundMessage = 'Not found'
): NonNullable<T> {
  const data = unwrap(result)
  if (data === null || data === undefined) {
    throw new ApiError(404, notFoundMessage)
  }
  return data
}

export function unwrapList<T>(result: PostgrestSingleResponse<T[] | null>): T[] {
  return unwrap(result) ?? []
}
