import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { API_PATHS } from '../../src/shared/api.ts'
import { GITHUB_SETUP_PATH } from '../../src/shared/github-setup.ts'
import { escapeHtml } from './html.ts'
import { previewNames } from './names.ts'
import type { ExternalIO } from './operations.ts'
import { httpJson, record, text } from './remote-values.ts'

const EVENTS = [
  'push',
  'pull_request',
  'pull_request_review',
  'pull_request_review_thread',
  'check_run',
  'check_suite',
  'status',
] as const
const PERMISSIONS = {
  actions: 'write',
  checks: 'read',
  contents: 'write',
  deployments: 'read',
  issues: 'write',
  metadata: 'read',
  pull_requests: 'write',
  statuses: 'read',
  workflows: 'write',
  members: 'read',
  emails: 'read',
} as const

export function githubManifest(zone: string): Record<string, unknown> {
  previewNames(1, zone)
  const origin = `https://${zone}`
  const fullName = `Conductive ${zone}`
  const name =
    fullName.length <= 34
      ? fullName
      : `Conductive ${zone.slice(0, 14)}-${createHash('sha256').update(zone).digest('hex').slice(0, 8)}`
  return {
    name,
    url: origin,
    hook_attributes: { url: `${origin}/v1/github/webhooks`, active: true },
    redirect_url: `${origin}/`,
    callback_urls: [`${origin}${API_PATHS.githubCallback}`],
    setup_url: `${origin}${GITHUB_SETUP_PATH}`,
    public: false,
    request_oauth_on_install: false,
    setup_on_update: true,
    default_events: EVENTS,
    default_permissions: PERMISSIONS,
  }
}

export async function registrationForm(
  manifest: Record<string, unknown>,
  owner: string | undefined,
  io: ExternalIO,
): Promise<string> {
  let action = 'https://github.com/settings/apps/new'
  let label = 'your current GitHub account'
  if (owner !== undefined) {
    const profile = record(
      await httpJson(
        io.fetch,
        new Request(
          `https://api.github.com/users/${encodeURIComponent(owner)}`,
          {
            redirect: 'error',
            headers: {
              Accept: 'application/vnd.github+json',
              'User-Agent': 'conductive-pr-previews',
            },
          },
        ),
        'GitHub owner',
      ),
      'GitHub owner',
    )
    label = text(profile.login, 'GitHub owner login')
    if (profile.type === 'Organization')
      action = `https://github.com/organizations/${encodeURIComponent(label)}/settings/apps/new`
    else if (profile.type !== 'User')
      throw new Error('The GitHub owner must be a user or organization.')
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; form-action https://github.com; base-uri 'none'"><title>Register the preview GitHub App</title></head><body><h1>Register the preview GitHub App</h1><p>Owner: ${escapeHtml(label)}. For a personal app, sign in as that user before submitting.</p><form action="${escapeHtml(action)}" method="post"><input type="hidden" name="manifest" value="${escapeHtml(JSON.stringify(manifest))}"><button type="submit">Register GitHub App</button></form><p>GitHub returns a temporary code to the relay URL. Exchange that code for app credentials within one hour. This tool does not exchange or store credentials.</p><p>Then enable callback wildcard matching in the app settings.</p><a href="https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest">GitHub manifest registration instructions</a></body></html>`
}

export async function writeManifestForm(
  zone: string,
  owner: string | undefined,
  io: ExternalIO,
) {
  const manifest = githubManifest(zone)
  const form = await registrationForm(manifest, owner, io)
  const parent = resolve('.context/pr-previews')
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(join(parent, 'manifest-'))
  const formPath = join(directory, 'register.html')
  try {
    await writeFile(formPath, form, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    })
  } catch {
    await rm(directory, { recursive: true, force: true })
    throw new Error('Could not write the GitHub App registration form.')
  }
  return { manifest, formPath }
}
