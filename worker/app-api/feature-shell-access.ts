import { HttpError } from '../http'
import { requireActiveOrg } from '../data/user-access'
import { requireOrgMember } from '../members/permissions'

export async function requireShellWriter(
  db: D1Database,
  orgId: string,
  userId: string,
) {
  const org = await requireOrgMember(db, orgId, userId)
  await requireActiveOrg(db, orgId)
  return org
}

export function shellChildId(path: string, parent: string): string | null {
  if (!path.startsWith(`${parent}/`)) return null
  const suffix = path.slice(parent.length + 1)
  if (!suffix || suffix.includes('/')) return null
  try {
    return decodeURIComponent(suffix)
  } catch {
    throw new HttpError(404, 'not_found', 'The page is not available.')
  }
}

export function optionalShellString(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw invalidShellInput()
  return value
}

export function optionalShellPosition(value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw invalidShellInput()
  return Math.max(0, Math.round(value))
}

export function invalidShellInput(): HttpError {
  return new HttpError(400, 'invalid_input', 'Complete the required fields.')
}
