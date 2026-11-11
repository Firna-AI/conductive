export const SECRET_NAMES = [
  'GITHUB_CLIENT_SECRET',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_WEBHOOK_SECRET',
  'SESSION_SIGNING_KEY',
  'BOAT_KEY_ENCRYPTION_KEY',
  'BOAT_API_KEY',
] as const

export type PreviewSecrets = Record<(typeof SECRET_NAMES)[number], string>

interface PreviewVariables {
  GITHUB_CLIENT_ID: string
  GITHUB_APP_SLUG: string
  BOAT_ORG_ID: string
  OPERATOR_GITHUB_IDS: string
  CONDUCTIVE_FRAME_SOURCES?: string
}

export interface PreviewSettings {
  accountId: string
  apiToken: string
  zone: string
  variables: PreviewVariables
  secrets: PreviewSecrets
}

type SettingsResult =
  | { kind: 'skip'; warning: string }
  | { kind: 'error'; missing: string[]; message: string }
  | { kind: 'ready'; settings: PreviewSettings }

const REQUIRED_NAMES = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'PREVIEW_ZONE',
  'GITHUB_CLIENT_ID',
  'GITHUB_APP_SLUG',
  'BOAT_ORG_ID',
  'OPERATOR_GITHUB_IDS',
  ...SECRET_NAMES,
] as const

export function checkSettings(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SettingsResult {
  const missing = REQUIRED_NAMES.filter((name) => !environment[name]?.trim())
  if (missing.length === REQUIRED_NAMES.length)
    return {
      kind: 'skip',
      warning: 'Preview settings are absent. Skipping preview configuration.',
    }
  if (missing.length)
    return {
      kind: 'error',
      missing,
      message: `Missing preview settings: ${missing.join(', ')}.`,
    }
  const value = (name: (typeof REQUIRED_NAMES)[number]) =>
    environment[name] ?? ''
  const frames = environment.CONDUCTIVE_FRAME_SOURCES
  return {
    kind: 'ready',
    settings: {
      accountId: value('CLOUDFLARE_ACCOUNT_ID'),
      apiToken: value('CLOUDFLARE_API_TOKEN'),
      zone: value('PREVIEW_ZONE'),
      variables: {
        GITHUB_CLIENT_ID: value('GITHUB_CLIENT_ID'),
        GITHUB_APP_SLUG: value('GITHUB_APP_SLUG'),
        BOAT_ORG_ID: value('BOAT_ORG_ID'),
        OPERATOR_GITHUB_IDS: value('OPERATOR_GITHUB_IDS'),
        ...(frames?.trim() ? { CONDUCTIVE_FRAME_SOURCES: frames } : {}),
      },
      secrets: {
        GITHUB_CLIENT_SECRET: value('GITHUB_CLIENT_SECRET'),
        GITHUB_APP_PRIVATE_KEY: value('GITHUB_APP_PRIVATE_KEY'),
        GITHUB_WEBHOOK_SECRET: value('GITHUB_WEBHOOK_SECRET'),
        SESSION_SIGNING_KEY: value('SESSION_SIGNING_KEY'),
        BOAT_KEY_ENCRYPTION_KEY: value('BOAT_KEY_ENCRYPTION_KEY'),
        BOAT_API_KEY: value('BOAT_API_KEY'),
      },
    },
  }
}
