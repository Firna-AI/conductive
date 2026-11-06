export const API_PATHS = {
  githubSignIn: '/api/auth/github',
  githubCallback: '/api/auth/github/callback',
  signOut: '/api/auth/logout',
  session: '/api/session',
  orgs: '/api/orgs',
} as const

export function orgPath(orgId: string): string {
  return `${API_PATHS.orgs}/${encodeURIComponent(orgId)}`
}

export function boatKeyPath(orgId: string): string {
  return `${orgPath(orgId)}/boat-key`
}

export interface User {
  id: string
  githubId: number
  githubLogin: string
  displayName: string | null
  avatarUrl: string | null
}

export type OrgRole = 'admin' | 'member'

export interface Org {
  id: string
  name: string
  role: OrgRole
}

export type BoatKeyStatus =
  { configured: false } | { configured: true; updatedAt: number }

export interface ApiErrorBody {
  error: { code: string; message: string }
}
