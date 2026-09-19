import { z } from 'zod'
import { ApiError } from './errors'

const uuidSchema = z.string().uuid()

export function parseUuid(value: string, label = 'id'): string {
  const parsed = uuidSchema.safeParse(value)
  if (!parsed.success) {
    throw new ApiError(400, `Invalid ${label}`)
  }
  return parsed.data
}

export async function parseJsonBody<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON')
  }
  return schema.parse(body)
}

// Public origin of the request, honouring the reverse proxy in front of Next.
export function requestOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    return `${proto}://${forwardedHost}`
  }
  return new URL(request.url).origin
}

export async function parseFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    throw new ApiError(400, 'Request body must be multipart form data')
  }
}
