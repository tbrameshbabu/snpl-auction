import { ApiError } from './errors'

// Must stay in sync with the bucket allowed_mime_types / file_size_limit
// configured in supabase/migrations/20260919000000_production_hardening.sql.
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const UPLOAD_LIMITS = {
  'player-profiles': 5 * 1024 * 1024,
  'team-logos': 2 * 1024 * 1024,
} as const

export type ImageBucket = keyof typeof UPLOAD_LIMITS

// The extension is derived from the validated MIME type, never from the
// client-supplied file name, so object paths cannot be influenced by input.
export function requireImageFile(value: FormDataEntryValue | null, bucket: ImageBucket): { file: File; extension: string } {
  if (!(value instanceof File) || value.size === 0) {
    throw new ApiError(400, 'No file provided')
  }
  const extension = IMAGE_MIME_EXTENSIONS[value.type]
  if (!extension) {
    throw new ApiError(400, 'Invalid file type. Only JPEG, PNG, and WebP images are allowed')
  }
  const limit = UPLOAD_LIMITS[bucket]
  if (value.size > limit) {
    throw new ApiError(400, `File too large. Maximum size is ${limit / (1024 * 1024)}MB`)
  }
  return { file: value, extension }
}
