import type { OperatorDirectoryQuery } from './operator'

interface OperatorIdentity {
  githubId: number
  login: string
}

export type OperatorAccessSource =
  | { kind: 'approval' | 'open_signup'; operator: OperatorIdentity | null }
  | { kind: 'invite_code'; code: string; label: string | null }
  | { kind: 'referral_code'; code: string; owner: OperatorIdentity | null }
  | {
      kind: 'org_invitation'
      org: { id: string; name: string | null }
      invitedBy: OperatorIdentity | null
    }
  | { kind: 'operator' | 'existing' }

type OperatorAppAccess =
  | { state: 'waiting'; waitingSince: number }
  | { state: 'granted'; grantedAt: number; source: OperatorAccessSource }

export interface OperatorApprovalEmail {
  state: 'none' | 'pending' | 'sent' | 'failed'
  updatedAt: number | null
}

export interface OperatorAccessCode {
  code: string
  kind: 'invite' | 'referral'
  label: string | null
  owner: OperatorIdentity | null
  createdBy: OperatorIdentity | null
  createdAt: number
  useLimit: number
  uses: number
  state: 'active' | 'used_up' | 'disabled'
  disabledAt: number | null
  disabledBy: OperatorIdentity | null
}

/** A person who came in with a referral code: the name on GitHub, or `null`, and the time of the use. */
interface OperatorReferralUse extends OperatorIdentity {
  name: string | null
  usedAt: number
}

export interface OperatorUserAccess {
  appAccess: OperatorAppAccess
  approvalEmail: OperatorApprovalEmail
  hasVerifiedEmail: boolean
  githubCreatedAt: number | null
  referralCode:
    | (OperatorAccessCode & {
        recipients: readonly OperatorReferralUse[]
      })
    | null
}

export interface OperatorWaitlistEntry extends OperatorIdentity {
  name: string | null
  joinedAt: number
  githubCreatedAt: number | null
  hasVerifiedEmail: boolean
}

export interface OperatorWaitlistResponse {
  users: readonly OperatorWaitlistEntry[]
  total: number
  nextCursor: string | null
}

export interface OperatorApprovalResponse {
  githubId: number
  changed: boolean
  approvalEmail: OperatorApprovalEmail
  emailFailed: boolean
}

export interface OperatorCodesResponse {
  codes: readonly OperatorAccessCode[]
  total: number
  nextCursor: string | null
}

export interface CreateOperatorCodeRequest {
  label: string
  useLimit: number
}

export interface OperatorSignupPause {
  paused: boolean
  updatedAt: number | null
  operator: OperatorIdentity | null
}

export interface OperatorWaitlistSwitch {
  waitlistOn: boolean
  updatedAt: number | null
  operator: OperatorIdentity | null
  waiting: number
}

function listPath(kind: string, query: OperatorDirectoryQuery): string {
  const params = new URLSearchParams()
  if (query.q !== undefined) params.set('q', query.q)
  if (query.cursor !== undefined) params.set('cursor', query.cursor)
  return `/api/operator/${kind}${params.size ? `?${params}` : ''}`
}

export function operatorWaitlistPath(
  query: OperatorDirectoryQuery = {},
): string {
  return listPath('waitlist', query)
}

export function operatorApprovalPath(githubId: number): string {
  return `/api/operator/users/${githubId}/approval`
}

export function operatorCodesPath(query: OperatorDirectoryQuery = {}): string {
  return listPath('invite-codes', query)
}

export function operatorCodeDisablePath(code: string): string {
  return `/api/operator/invite-codes/${encodeURIComponent(code)}/disable`
}

export function operatorSignupPausePath(): string {
  return '/api/operator/signup-pause'
}

export function operatorWaitlistSwitchPath(): string {
  return '/api/operator/waitlist-switch'
}
