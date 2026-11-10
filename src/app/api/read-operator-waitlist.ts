import type {
  OperatorAccessCode,
  OperatorApprovalEmail,
  OperatorApprovalResponse,
  OperatorSignupPause,
  OperatorWaitlistEntry,
} from '../../shared/operator-waitlist'
import {
  choice,
  count,
  flag,
  items,
  maybeCount,
  maybeNested,
  maybeText,
  nested,
  record,
  text,
} from './parse'
import type { DirectoryReply } from './read-operator'

/** A GitHub account as an operator reply names it: its numeric ID and login. */
export function readIdentity(value: unknown) {
  const user = record(value, 'user')
  return { githubId: count(user, 'githubId'), login: text(user, 'login') }
}

/** The state of the approval email of a user, and the time of its last change. */
export function readApprovalEmail(value: unknown): OperatorApprovalEmail {
  const email = record(value, 'approvalEmail')
  return {
    state: choice(email, 'state', ['none', 'pending', 'sent', 'failed']),
    updatedAt: maybeCount(email, 'updatedAt'),
  }
}

/** An invite code or a referral code, with its uses, its state, and its disable. */
export function readAccessCode(value: unknown): OperatorAccessCode {
  const code = record(value, 'code')
  return {
    code: text(code, 'code'),
    kind: choice(code, 'kind', ['invite', 'referral']),
    label: maybeText(code, 'label'),
    owner: maybeNested(code, 'owner', readIdentity),
    createdBy: maybeNested(code, 'createdBy', readIdentity),
    createdAt: count(code, 'createdAt'),
    useLimit: count(code, 'useLimit'),
    uses: count(code, 'uses'),
    state: choice(code, 'state', ['active', 'used_up', 'disabled']),
    disabledAt: maybeCount(code, 'disabledAt'),
    disabledBy: maybeNested(code, 'disabledBy', readIdentity),
  }
}

function readWaitlistEntry(value: unknown): OperatorWaitlistEntry {
  const entry = record(value, 'user')
  return {
    ...readIdentity(entry),
    name: maybeText(entry, 'name'),
    joinedAt: count(entry, 'joinedAt'),
    githubCreatedAt: maybeCount(entry, 'githubCreatedAt'),
    hasVerifiedEmail: flag(entry, 'hasVerifiedEmail'),
  }
}

/** A page of the Waitlist tab: the people who wait, oldest first. */
export function readWaitlistPage(
  value: unknown,
): DirectoryReply<OperatorWaitlistEntry> {
  const page = record(value, 'waitlist')
  return {
    rows: items(page, 'users', readWaitlistEntry),
    total: count(page, 'total'),
    nextCursor: maybeText(page, 'nextCursor'),
  }
}

/** A page of the Invite codes tab, newest first. */
export function readCodesPage(
  value: unknown,
): DirectoryReply<OperatorAccessCode> {
  const page = record(value, 'codes')
  return {
    rows: items(page, 'codes', readAccessCode),
    total: count(page, 'total'),
    nextCursor: maybeText(page, 'nextCursor'),
  }
}

/**
 * The reply of an approval: whether it changed anything, and the state of
 * the approval email after the first send.
 */
export function readApproval(value: unknown): OperatorApprovalResponse {
  const reply = record(value, 'approval')
  return {
    githubId: count(reply, 'githubId'),
    changed: flag(reply, 'changed'),
    approvalEmail: nested(reply, 'approvalEmail', readApprovalEmail),
    emailFailed: flag(reply, 'emailFailed'),
  }
}

/** The pause of sign-ups, with the time and the operator of its last change. */
export function readSignupPause(value: unknown): OperatorSignupPause {
  const pause = record(value, 'pause')
  return {
    paused: flag(pause, 'paused'),
    updatedAt: maybeCount(pause, 'updatedAt'),
    operator: maybeNested(pause, 'operator', readIdentity),
  }
}
