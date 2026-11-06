import { HttpError, isRecord } from '../http'

export function githubFailure(): HttpError {
  return new HttpError(
    502,
    'github_unavailable',
    'GitHub is not available. Try again.',
  )
}

export function object(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw githubFailure()
  return value
}

export function text(value: unknown): string {
  if (typeof value !== 'string') throw githubFailure()
  return value
}

export function choice<const T extends readonly string[]>(
  value: unknown,
  values: T,
): T[number] {
  for (const candidate of values) {
    if (value === candidate) return candidate
  }
  throw githubFailure()
}

export function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw githubFailure()
  return value
}

export function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw githubFailure()
  return value
}

export function date(value: unknown): number | null {
  if (value === null) return null
  const result = Date.parse(text(value))
  if (!Number.isFinite(result)) throw githubFailure()
  return result
}

export function nodes(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw githubFailure()
  return value
}

export function nextPage(
  value: unknown,
  previous: string | null,
): string | null {
  const page = object(value)
  if (!flag(page.hasNextPage)) return null
  const cursor = text(page.endCursor)
  if (!cursor || cursor === previous) throw githubFailure()
  return cursor
}

export function githubUrl(value: unknown): string | null {
  if (value === null) return null
  try {
    const url = new URL(text(value))
    return url.origin === 'https://github.com' && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}
