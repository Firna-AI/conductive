export interface DirectoryCursor {
  createdAt: number
  id: string | number
}

export function directoryCursor(value: string | null): DirectoryCursor | null {
  if (!value) return null
  try {
    const cursor: unknown = JSON.parse(value)
    if (
      typeof cursor === 'object' &&
      cursor !== null &&
      'createdAt' in cursor &&
      typeof cursor.createdAt === 'number' &&
      Number.isSafeInteger(cursor.createdAt) &&
      'id' in cursor &&
      (typeof cursor.id === 'string' ||
        (typeof cursor.id === 'number' && Number.isSafeInteger(cursor.id)))
    )
      return { createdAt: cursor.createdAt, id: cursor.id }
  } catch {
    return null
  }
  return null
}

export function directoryPage<T>(
  rows: T[],
  cursorOf: (row: T) => DirectoryCursor,
): { entries: T[]; nextCursor: string | null } {
  const entries = rows.slice(0, 20)
  const last = entries.at(-1)
  return {
    entries,
    nextCursor:
      rows.length > 20 && last ? JSON.stringify(cursorOf(last)) : null,
  }
}

export function namePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, '\\$&')}%`
}

export function previewHostname(query: string): string | null {
  if (!query) return null
  try {
    return new URL(query.includes('://') ? query : `https://${query}`).hostname
  } catch {
    return null
  }
}

export function numericGitHubId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
