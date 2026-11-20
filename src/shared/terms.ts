import { termsDocument } from '../marketing/terms'
import type { LegalDocument } from '../marketing/legal-text'
import { API_PATHS } from './api'
import { INVITE_CODE_PARAMETER } from './waitlist'

/**
 * The revision of a Terms text: `terms-` and a digest of the whole document.
 * A change to any word gives a new revision, so nobody sets it by hand.
 */
export function termsRevision(document: LegalDocument): string {
  return `terms-${textDigest(JSON.stringify(document))}`
}

export const TERMS_VERSION = termsRevision(termsDocument)
export const TERMS_VERSION_PARAMETER = 'terms_version'

export function acceptedTermsSignInPath(inviteCode?: string): string {
  const parameters = new URLSearchParams({
    [TERMS_VERSION_PARAMETER]: TERMS_VERSION,
  })
  if (inviteCode) parameters.set(INVITE_CODE_PARAMETER, inviteCode)
  return `${API_PATHS.githubSignIn}?${parameters}`
}

/**
 * A 53-bit digest of the text as 14 hex digits, with the public-domain
 * cyrb53 hash. It names a text and is no secret, so it needs no
 * cryptographic hash. It is synchronous, so the app and the Worker both get
 * the revision at import time.
 */
function textDigest(value: string): string {
  let first = 0xdeadbeef
  let second = 0x41c6ce57
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 2654435761)
    second = Math.imul(second ^ code, 1597334677)
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507)
  first ^= Math.imul(second ^ (second >>> 13), 3266489909)
  second = Math.imul(second ^ (second >>> 16), 2246822507)
  second ^= Math.imul(first ^ (first >>> 13), 3266489909)
  const digest = 4294967296 * (2097151 & second) + (first >>> 0)
  return digest.toString(16).padStart(14, '0')
}
