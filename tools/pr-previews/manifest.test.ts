import { afterEach, expect, it, vi } from 'vitest'
import { fakeContext } from './operations.test-support.ts'
import {
  githubManifest,
  registrationForm,
  writeManifestForm,
} from './manifest.ts'

const files = vi.hoisted(() => ({
  mkdir: vi.fn(),
  mkdtemp: vi.fn<() => Promise<string>>(),
  writeFile: vi.fn(),
  rm: vi.fn(),
}))
vi.mock('node:fs/promises', () => files)
afterEach(() => vi.resetAllMocks())

const expected = {
  name: 'Conductive preview.example',
  url: 'https://preview.example',
  hook_attributes: {
    url: 'https://preview.example/v1/github/webhooks',
    active: true,
  },
  redirect_url: 'https://preview.example/',
  callback_urls: ['https://preview.example/api/auth/github/callback'],
  setup_url: 'https://preview.example/github/setup',
  public: false,
  request_oauth_on_install: false,
  setup_on_update: true,
  default_events: [
    'push',
    'pull_request',
    'pull_request_review',
    'pull_request_review_thread',
    'check_run',
    'check_suite',
    'status',
  ],
  default_permissions: {
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
  },
}

function manifestFromForm(form: string): unknown {
  const entities: Record<string, string> = {
    quot: '"',
    amp: '&',
    lt: '<',
    gt: '>',
    '#39': "'",
  }
  const encoded = /name="manifest" value="([^"]*)"/.exec(form)?.[1] ?? 'null'
  return JSON.parse(
    encoded.replace(
      /&(quot|amp|lt|gt|#39);/g,
      (_, name: string) => entities[name],
    ),
  )
}

it('generates every supported manifest field with exactly the documented preview permissions and events', () => {
  expect(githubManifest('preview.example')).toEqual(expected)
})

it.each(['User', 'Organization'])(
  'posts the JSON manifest to the documented form for owner type %s',
  async (type) => {
    const { ctx, http } = fakeContext()
    http.mockResolvedValueOnce(Response.json({ login: 'sample-owner', type }))
    const form = await registrationForm(expected, 'sample-owner', ctx.io)
    const action =
      type === 'User'
        ? 'https://github.com/settings/apps/new'
        : 'https://github.com/organizations/sample-owner/settings/apps/new'
    expect(form).toContain(`<form action="${action}" method="post">`)
    expect(manifestFromForm(form)).toEqual(expected)
    expect(form).not.toContain('<script')
    expect(http.mock.calls[0][0].url).toBe(
      'https://api.github.com/users/sample-owner',
    )
    expect(http.mock.calls[0][0].headers.get('Authorization')).toBeNull()
  },
)

it('escapes owner labels and writes a local personal registration form without cloud settings', async () => {
  const { ctx, http } = fakeContext()
  http.mockResolvedValueOnce(
    Response.json({ login: 'owner<&"', type: 'Organization' }),
  )
  const form = await registrationForm(expected, 'sample-owner', ctx.io)
  expect(form).toContain('owner&lt;&amp;&quot;')
  expect(form).not.toContain('owner<&"')
  files.mkdtemp.mockResolvedValue(
    '/workspace/.context/pr-previews/manifest-abc',
  )
  const result = await writeManifestForm('preview.example', undefined, ctx.io)
  expect(result).toEqual({
    manifest: expected,
    formPath: '/workspace/.context/pr-previews/manifest-abc/register.html',
  })
  expect(files.writeFile).toHaveBeenCalledExactlyOnceWith(
    result.formPath,
    expect.stringContaining(
      '<form action="https://github.com/settings/apps/new" method="post">',
    ),
    { encoding: 'utf8', mode: 0o600, flag: 'wx' },
  )
  expect(http).toHaveBeenCalledTimes(1)
})
