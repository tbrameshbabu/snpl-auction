import { NextResponse } from 'next/server'
import { PostgrestError } from '@supabase/supabase-js'
import { ZodError } from 'zod'

export type ApiErrorBody = {
  error: string
  code?: string
  issues?: { path: string; message: string }[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly issues?: ApiErrorBody['issues']

  constructor(status: number, message: string, options?: { code?: string; issues?: ApiErrorBody['issues'] }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = options?.code
    this.issues = options?.issues
  }
}

export function errorResponse(status: number, message: string, extra?: Omit<ApiErrorBody, 'error'>) {
  return NextResponse.json<ApiErrorBody>({ error: message, ...extra }, { status })
}

// Application SQLSTATEs raised by the auction RPCs (see supabase/migrations).
const RPC_STATUS: Record<string, number> = {
  SN400: 400,
  SN401: 401,
  SN403: 403,
  SN404: 404,
  SN409: 409,
}

// Generic Postgres error classes. Messages are ours, never the database's.
const PG_ERRORS: Record<string, { status: number; message: string }> = {
  '42501': { status: 403, message: 'You are not allowed to perform this action' },
  '23505': { status: 409, message: 'A matching record already exists' },
  '23503': { status: 400, message: 'Referenced record does not exist' },
  '23514': { status: 400, message: 'Invalid data' },
  '22P02': { status: 400, message: 'Invalid input' },
  PGRST116: { status: 404, message: 'Not found' },
}

export function fromPostgrestError(error: PostgrestError): ApiError {
  const rpcStatus = RPC_STATUS[error.code]
  if (rpcStatus) {
    return new ApiError(rpcStatus, error.message, { code: error.code })
  }
  const known = PG_ERRORS[error.code]
  if (known) {
    return new ApiError(known.status, known.message, { code: error.code })
  }
  console.error('Unexpected database error', { code: error.code, message: error.message })
  return new ApiError(500, 'Internal server error')
}

export function handleRouteError(error: unknown) {
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.message, { code: error.code, issues: error.issues })
  }
  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    return errorResponse(400, issues[0]?.message ?? 'Invalid request', { issues })
  }
  if (error instanceof PostgrestError) {
    const apiError = fromPostgrestError(error)
    return errorResponse(apiError.status, apiError.message, { code: apiError.code })
  }
  console.error('Unhandled API error', error)
  return errorResponse(500, 'Internal server error')
}
