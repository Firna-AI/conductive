export const WAITLIST_PATHS = {
  state: '/api/waitlist',
  useCode: '/api/waitlist/code',
} as const

export const INVITE_CODE_PARAMETER = 'invite_code'
export const INVITE_CODE_ERROR_PARAMETER = 'invite_code_error'

export function joinPath(code: string): string {
  return `/join/${encodeURIComponent(code)}`
}

interface ReferralCode {
  code: string
  useLimit: number
  uses: number
  disabled: boolean
}

export interface WaitlistStateResponse {
  appAccess: boolean
  signupsPaused: boolean
  waitlistOn: boolean
  approvalEmail: string | null
  referralCode: ReferralCode | null
}

export interface UseInviteCodeRequest {
  code: string
}

export type UseInviteCodeResponse = WaitlistStateResponse
