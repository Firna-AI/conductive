import { API_PATHS } from './api'
import { INVITE_CODE_PARAMETER } from './waitlist'

export const TERMS_VERSION = '2026-11-10-legal-profile-transport'
export const TERMS_VERSION_PARAMETER = 'terms_version'

export function acceptedTermsSignInPath(inviteCode?: string): string {
  const parameters = new URLSearchParams({
    [TERMS_VERSION_PARAMETER]: TERMS_VERSION,
  })
  if (inviteCode) parameters.set(INVITE_CODE_PARAMETER, inviteCode)
  return `${API_PATHS.githubSignIn}?${parameters}`
}
