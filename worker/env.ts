import type { InvitationMailer } from './invitation-mailer'
import type { Workspace } from './workspace'

export interface AppEnv {
  DB: D1Database
  APP_ORIGIN: string
  MARKETING_ORIGIN?: string
  MACHINE_ORIGIN?: string
  PREVIEW_DOMAIN?: string
  ASSETS?: { fetch(request: Request): Promise<Response> }
  WORKSPACES?: DurableObjectNamespace<Workspace>
  CONDUCTIVE_MODELS?: string
  CONDUCTIVE_DEFAULT_CHOICE?: string
  CONDUCTIVE_RUNNER_ARCHIVE_URL?: string
  CONDUCTIVE_RUNNER_ARCHIVE_SHA256?: string
  GITHUB_APP_PRIVATE_KEY?: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  SESSION_SIGNING_KEY: string
  BOAT_API_KEY: string
  BOAT_ORG_ID: string
  BOAT_KEY_ENCRYPTION_KEY: string
  RESEND_API_KEY?: string
  OPERATOR_GITHUB_IDS?: string
}

export type HttpFetch = (request: Request) => Promise<Response>

export interface AppDependencies {
  fetch: HttpFetch
  now: () => number
  randomToken: () => string
  invitationMailer?: InvitationMailer
}
