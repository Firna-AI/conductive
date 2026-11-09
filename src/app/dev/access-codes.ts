/**
 * The codes of the dev fake. The waitlist routes and the operator routes
 * share one set of codes, in the records of the operator samples, as the
 * Worker keeps one table of codes.
 */
import { inviteLimit } from '../../../docs/mockups/src/fixtures/waitlist'
import type {
  AccessRecords,
  CodeRecord,
} from '../../test-support/fixtures/operator-access'
import type { SampleIdentity } from '../../test-support/fixtures/operator-access-samples'

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'

/** A code as the Worker finds it: in capitals, with or without its hyphen. */
function codeKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/^(.{5})-(.{5})$/, '$1$2')
}

/** The code of the records that a typed code or a path names, or `undefined`. */
export function findCode(
  records: AccessRecords,
  value: string,
): CodeRecord | undefined {
  const key = codeKey(value)
  return [...records.codes.values()].find((code) => codeKey(code.code) === key)
}

/**
 * A code that no other code has, in two groups of five, as the Worker
 * makes it. It comes from `seed`, so a run of the dev fake can repeat it.
 */
export function freshCode(
  taken: ReadonlyMap<string, unknown>,
  seed: number,
): string {
  let value = (Math.abs(Math.trunc(seed)) % 2_147_483_646) + 1
  for (;;) {
    let text = ''
    for (let index = 0; index < 10; index += 1) {
      value = (value * 48_271) % 2_147_483_647
      text += ALPHABET[value % ALPHABET.length]
    }
    const code = `${text.slice(0, 5)}-${text.slice(5)}`
    if (!taken.has(code)) return code
  }
}

/** The referral code of a user, or `undefined` while the user has none. */
export function referralCodeOf(
  records: AccessRecords,
  githubId: number,
): CodeRecord | undefined {
  return [...records.codes.values()].find(
    (code) => code.kind === 'referral' && code.owner?.githubId === githubId,
  )
}

/**
 * Gives a user who gets app access a referral code with 5 unused uses, as
 * the grant of the Worker does. A user who has a referral code keeps it.
 */
export function addReferralCode(
  records: AccessRecords,
  owner: SampleIdentity,
  at: number,
): void {
  if (referralCodeOf(records, owner.githubId)) return
  const code = freshCode(records.codes, owner.githubId)
  records.codes.set(code, {
    code,
    kind: 'referral',
    label: null,
    owner,
    createdBy: null,
    createdAt: at,
    useLimit: inviteLimit,
    uses: 0,
    disabledAt: null,
    disabledBy: null,
  })
}
