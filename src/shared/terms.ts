import { API_PATHS } from './api'

export const TERMS_VERSION = '2026-11-07'
export const TERMS_VERSION_PARAMETER = 'terms_version'

export function acceptedTermsSignInPath(): string {
  return `${API_PATHS.githubSignIn}?${new URLSearchParams({
    [TERMS_VERSION_PARAMETER]: TERMS_VERSION,
  })}`
}
