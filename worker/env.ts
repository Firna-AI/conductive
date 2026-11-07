import type { InvitationMailer } from './invitation-mailer'

export interface AppEnv {
  DB: D1Database
  APP_ORIGIN: string
  MARKETING_ORIGIN?: string
  MACHINE_ORIGIN?: string
  PREVIEW_DOMAIN?: string
  ASSETS?: { fetch(request: Request): Promise<Response> }
  WORKSPACES?: DurableObjectNamespace
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  SESSION_SIGNING_KEY: string
  BOAT_API_KEY: string
  BOAT_ORG_ID: string
  BOAT_KEY_ENCRYPTION_KEY: string
  RESEND_API_KEY?: string
}

export type HttpFetch = (request: Request) => Promise<Response>

export interface AppDependencies {
  fetch: HttpFetch
  now: () => number
  randomToken: () => string
  invitationMailer?: InvitationMailer
}
