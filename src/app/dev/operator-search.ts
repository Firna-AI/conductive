import type {
  OperatorOrgMatch,
  OperatorOrgsResponse,
  OperatorUsersResponse,
} from '../../shared/operator'
import {
  orgRow,
  sampleOrgDetail,
  sampleUserDetail,
  userRow,
  type OperatorRecords,
} from '../../test-support/fixtures/operator'
import {
  sampleOrgs,
  sampleUsers,
  type SampleOrg,
} from '../../test-support/fixtures/operator-samples'

/** The rows of one page, as the Worker gives them. */
const PAGE_SIZE = 20

/** The hostname of a preview address, from a full address or a bare one. */
function hostnameOf(search: string): string | null {
  try {
    const address = search.includes('://') ? search : `https://${search}`
    return new URL(address).hostname
  } catch {
    return null
  }
}

/**
 * What an org search found that is not a name, as the Worker says: the
 * org ID, a cloud computer ID, or a preview address.
 */
function matchOf(org: SampleOrg, search: string): OperatorOrgMatch | null {
  if (org.id === search) return 'org-id'
  if (org.computers.includes(search)) return 'cloud-computer-id'
  const hostname = hostnameOf(search)
  if (hostname && org.previews.includes(hostname)) return 'preview-address'
  return null
}

function contains(text: string | null, search: string): boolean {
  return text !== null && text.toLowerCase().includes(search.toLowerCase())
}

/** One page of rows, and the cursor of the next: the offset of its first row. */
function pageOf<Row>(rows: readonly Row[], cursor: string | null) {
  const start = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0
  const end = start + PAGE_SIZE
  return {
    rows: rows.slice(start, end),
    total: rows.length,
    nextCursor: end < rows.length ? String(end) : null,
  }
}

/** The search of the Orgs tab over the sample orgs, newest first. */
export function searchOrgs(
  records: OperatorRecords,
  base: number,
  query: URLSearchParams,
): OperatorOrgsResponse {
  const search = query.get('q')?.trim() ?? ''
  const found = sampleOrgs.flatMap((org) => {
    const match = search === '' ? null : matchOf(org, search)
    if (search !== '' && match === null && !contains(org.name, search)) {
      return []
    }
    return [orgRow(sampleOrgDetail(org, records, base), match)]
  })
  const { rows, total, nextCursor } = pageOf(found, query.get('cursor'))
  return { orgs: rows, total, nextCursor }
}

/** The search of the Users tab over the sample users, newest first. */
export function searchUsers(
  records: OperatorRecords,
  base: number,
  query: URLSearchParams,
): OperatorUsersResponse {
  const search = query.get('q')?.trim() ?? ''
  const found = sampleUsers.flatMap((user) => {
    const hit =
      search === '' ||
      contains(user.login, search) ||
      contains(user.name, search) ||
      String(user.githubId) === search
    return hit ? [userRow(sampleUserDetail(user, records, base))] : []
  })
  const { rows, total, nextCursor } = pageOf(found, query.get('cursor'))
  return { users: rows, total, nextCursor }
}
