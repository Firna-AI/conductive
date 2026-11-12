import type {
  OperatorOrgDetail,
  OperatorOrgMatch,
  OperatorOrgsResponse,
  OperatorUsersResponse,
} from '../../shared/operator'
import type {
  OperatorCodesResponse,
  OperatorWaitlistResponse,
} from '../../shared/operator-waitlist'
import {
  sampleCodes,
  sampleWaitlist,
} from '../../test-support/fixtures/operator-access'
import {
  orgRow,
  sampleUserDetail,
  userRow,
  type OperatorRecords,
} from '../../test-support/fixtures/operator'
import {
  sampleOrgs,
  sampleUsers,
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
 * org ID, a cloud computer ID, or a preview address. Only the samples have
 * cloud computer IDs and preview addresses.
 */
function matchOf(orgId: string, search: string): OperatorOrgMatch | null {
  if (orgId === search) return 'org-id'
  const sample = sampleOrgs.find((item) => item.id === orgId)
  if (!sample) return null
  if (sample.computers.includes(search)) return 'cloud-computer-id'
  const hostname = hostnameOf(search)
  if (hostname && sample.previews.includes(hostname)) return 'preview-address'
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

/** The search of the Orgs tab over the orgs of the operator, newest first. */
export function searchOrgs(
  orgs: readonly OperatorOrgDetail[],
  query: URLSearchParams,
): OperatorOrgsResponse {
  const search = query.get('q')?.trim() ?? ''
  const found = orgs.flatMap((org) => {
    const match = search === '' ? null : matchOf(org.id, search)
    if (search !== '' && match === null && !contains(org.name, search)) {
      return []
    }
    return [orgRow(org, match)]
  })
  const { rows, total, nextCursor } = pageOf(found, query.get('cursor'))
  return { orgs: rows, total, nextCursor }
}

/** Whether a user search finds a person: a part of the login or the name, or the GitHub ID. */
function findsUser(
  person: { login: string; name: string | null; githubId: number },
  search: string,
): boolean {
  return (
    search === '' ||
    contains(person.login, search) ||
    contains(person.name, search) ||
    String(person.githubId) === search
  )
}

/** The search of the Users tab over the sample users, newest first. */
export function searchUsers(
  records: OperatorRecords,
  base: number,
  query: URLSearchParams,
): OperatorUsersResponse {
  const search = query.get('q')?.trim() ?? ''
  const found = sampleUsers.flatMap((user) =>
    findsUser(user, search)
      ? [userRow(sampleUserDetail(user, records, base))]
      : [],
  )
  const { rows, total, nextCursor } = pageOf(found, query.get('cursor'))
  return { users: rows, total, nextCursor }
}

/**
 * The search of the Waitlist tab, oldest first, with the keys of the
 * Users tab. It leaves out suspended people, as the Worker does.
 */
export function searchWaitlist(
  records: OperatorRecords,
  base: number,
  query: URLSearchParams,
): OperatorWaitlistResponse {
  const search = query.get('q')?.trim() ?? ''
  const found = sampleWaitlist(records, records.userSuspensions, base).filter(
    (person) => findsUser(person, search),
  )
  const { rows, total, nextCursor } = pageOf(found, query.get('cursor'))
  return { users: rows, total, nextCursor }
}

/** A code as a search compares it: in capitals, without its hyphen. */
function codeKey(value: string): string {
  return value.trim().toUpperCase().replace('-', '')
}

/**
 * The search of the Invite codes tab, newest first. With no search it
 * lists the invite codes. A search finds any code by its text, an invite
 * code by its label, and a referral code by the login of its owner.
 */
export function searchCodes(
  records: OperatorRecords,
  query: URLSearchParams,
): OperatorCodesResponse {
  const search = query.get('q')?.trim() ?? ''
  const found = sampleCodes(records).filter((code) =>
    search === ''
      ? code.kind === 'invite'
      : codeKey(code.code).includes(codeKey(search)) ||
        (code.kind === 'invite' && contains(code.label, search)) ||
        (code.kind === 'referral' &&
          contains(code.owner?.login ?? null, search)),
  )
  const { rows, total, nextCursor } = pageOf(found, query.get('cursor'))
  return { codes: rows, total, nextCursor }
}
