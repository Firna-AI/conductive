import type {
  OperatorApprovalResponse,
  OperatorWaitlistEntry,
  OperatorWaitlistResponse,
} from '../../shared/operator-waitlist'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { textOf } from '../test-render'

/** The text of the box of the rows: its line, and its rows. */
export function waitlistBox(view: HTMLElement): string {
  return textOf(view.querySelector('main section')?.innerHTML ?? '')
}

/** A page of the Waitlist tab. */
export function waitlistPage(
  users: readonly OperatorWaitlistEntry[],
  total = users.length,
  nextCursor: string | null = null,
): OperatorWaitlistResponse {
  return { users, total, nextCursor }
}

/** The reply of an approval, with the state of its email. */
export function approvalReply(
  githubId: number,
  state: OperatorApprovalResponse['approvalEmail']['state'],
  emailFailed = false,
): OperatorApprovalResponse {
  return {
    githubId,
    changed: true,
    approvalEmail: { state, updatedAt: FAKE_TIME },
    emailFailed,
  }
}

/** The rows of the samples, oldest first. */
export const waitlistRows = [
  'SO @sam-okafor Sam Okafor 9 years 1 Jan Approve',
  'JM @jules-m Jules Martin 4 years 2 Jan Approve',
  'P @pkwan 3 weeks 3 Jan Approve',
  'KW @kenji-w Kenji Watanabe 4 years 4 Jan Approve',
  'NQ @nadia-q Nadia Qureshi 7 years 5 Jan Approve',
  'OP @ovi-dev Ovidiu Pop 2 years 6 Jan Approve',
  'LH @lena-h Lena Hart 11 years 7 Jan Approve',
  'SH @samir-h Samir Haddad 1 year 8 Jan Approve',
  'BV @bram-v Bram Visser 5 months 11 Jan Approve',
  'Z @zed-k 2 days 15 Jan Approve',
]
