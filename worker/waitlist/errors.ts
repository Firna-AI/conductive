import { HttpError } from '../http'

export type InviteCodeFailure =
  | 'invite_code_not_found'
  | 'invite_code_disabled'
  | 'invite_code_used_up'
  | 'signups_paused'

export function inviteCodeError(code: InviteCodeFailure): HttpError {
  const replies = {
    invite_code_not_found: [404, 'This invite code was not found.'],
    invite_code_disabled: [409, 'This invite code is disabled.'],
    invite_code_used_up: [409, 'This invite code has no uses left.'],
    signups_paused: [403, 'Sign-ups are paused. Try again later.'],
  } as const
  const [status, message] = replies[code]
  return new HttpError(status, code, message)
}
