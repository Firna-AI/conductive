import type { InvitationMailer } from './invitation-mailer'
import type { ProviderAccountConfigurations } from './sandbox/accounts'
import type { Workspace } from './workspace'

export interface AppEnv {
  DB: D1Database
  CHAT_ATTACHMENTS?: R2Bucket
  CHAT_ATTACHMENTS_S3_BUCKET_URL?: string
  CHAT_ATTACHMENTS_ACCESS_KEY_ID?: string
  CHAT_ATTACHMENTS_SECRET_ACCESS_KEY?: string
  APP_ORIGIN: string
  MARKETING_ORIGIN?: string
  MACHINE_ORIGIN?: string
  PREVIEW_DOMAIN?: string
  CONDUCTIVE_FRAME_SOURCES?: string
  ASSETS?: { fetch(request: Request): Promise<Response> }
  WORKSPACES?: DurableObjectNamespace<Workspace>
  AI?: Ai
  CONDUCTIVE_TITLE_MODEL?: string
  CONDUCTIVE_MODELS?: string
  CONDUCTIVE_DEFAULT_CHOICE?: string
  CONDUCTIVE_RUNNER_ARCHIVE_URL?: string
  CONDUCTIVE_RUNNER_ARCHIVE_SHA256?: string
  GITHUB_APP_PRIVATE_KEY?: string
  GITHUB_WEBHOOK_SECRET?: string
  GITHUB_CLIENT_ID: string
  GITHUB_APP_SLUG?: string
  GITHUB_CLIENT_SECRET: string
  SESSION_SIGNING_KEY: string
  BOAT_API_KEY: string
  BOAT_ORG_ID: string
  SANDBOX_PROVIDER_ACCOUNTS?: ProviderAccountConfigurations
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
