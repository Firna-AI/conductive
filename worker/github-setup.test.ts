import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import { routes } from '../src/app/router'
import {
  GITHUB_INSTALL_PATH,
  GITHUB_SETUP_PATH,
  githubInstallLink,
} from '../src/shared/github-setup'
import { GITHUB_SETUP_PAGES, SITE_FOLDER } from '../src/shared/site-build'
import { createApp } from './application'
import { githubInstallResponse } from './github-setup'
import { GITHUB_RETURN_COOKIE } from './security/cookies'
import { fakeSite, FILE_LIST_PATH } from './test-support/fake-site'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from './test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})
afterEach(() => vi.restoreAllMocks())

const githubInstallPage =
  'https://github.com/apps/conductive-build/installations/new'
const previewOrigin = 'https://pr-79-app.example.dev'

/**
 * The cookie that a browser keeps from a reply, as a Cookie header, or
 * null when the reply sets none or deletes it.
 */
function keptCookie(response: Response): string | null {
  const header = response.headers.get('Set-Cookie')
  if (header === null || /Max-Age=0(;|$)/.test(header)) return null
  return header.split(';')[0]
}

/** Whether a reply deletes the cookie of the return screen. */
function deletesReturn(response: Response): boolean {
  const header = response.headers.get('Set-Cookie') ?? ''
  return header.startsWith(`${GITHUB_RETURN_COOKIE}=;`) && !keptCookie(response)
}

/**
 * A browser starts an install or a change of the GitHub App on `screen`.
 * The result is where the reply sends it, and the cookie that it keeps.
 */
async function startOn(screen: string) {
  const response = await createApp().fetch(
    new Request(
      new URL(githubInstallLink({ kind: 'browser', screen }), TEST_ORIGIN),
    ),
    { ...harness.env, GITHUB_APP_SLUG: 'conductive-build' },
  )
  return {
    status: response.status,
    location: response.headers.get('Location'),
    cookie: keptCookie(response),
  }
}

/**
 * The request of a browser that GitHub sends back after an install, with
 * the cookie that the browser keeps. It carries no session. The assets
 * binding records each file request.
 */
async function backFromGitHub(query: string, cookie: string | null = null) {
  const assets = fakeSite()
  const env = {
    ...harness.env,
    ASSETS: assets,
  }
  const response = await createApp().fetch(
    new Request(`${TEST_ORIGIN}${GITHUB_SETUP_PATH}?${query}`, {
      headers: cookie === null ? {} : { Cookie: cookie },
    }),
    env,
  )
  return {
    response,
    pages: assets.requests.map((request) => new URL(request.url).pathname),
  }
}

it('returns a browser to the screen where the install or the change started, also when GitHub drops the state, without the query of GitHub', async () => {
  const repositories = routes.settings('org-1', 'repositories')
  const firstOrg = routes.createOrg(true)
  const cases = [
    [repositories, 'installation_id=7&setup_action=update'],
    [firstOrg, 'installation_id=7&setup_action=install&state=other'],
  ] as const
  for (const [screen, query] of cases) {
    const start = await startOn(screen)
    const { response, pages } = await backFromGitHub(query, start.cookie)
    expect(
      {
        start: { status: start.status, location: start.location },
        status: response.status,
        location: response.headers.get('Location'),
        deleted: deletesReturn(response),
        pages,
      },
      screen,
    ).toEqual({
      start: { status: 302, location: githubInstallPage },
      status: 302,
      location: new URL(screen, TEST_ORIGIN).href,
      deleted: true,
      pages: [],
    })
  }
})

it('opens Home after a return that names no screen of the app', async () => {
  const elsewhere = 'https://elsewhere.test/'
  const starts = await Promise.all(
    [
      elsewhere,
      '//elsewhere.test/',
      '/\\elsewhere.test/',
      '/.//elsewhere.test/',
      '/..//elsewhere.test/',
      '/api/account',
      GITHUB_SETUP_PATH,
    ].map(startOn),
  )
  const forged = `${GITHUB_RETURN_COOKIE}=${encodeURIComponent('/.//elsewhere.test/')}`
  const cookies = [null, forged, ...starts.map((start) => start.cookie)]
  const returns = await Promise.all(
    cookies.map(async (cookie) => {
      const { response } = await backFromGitHub(
        'installation_id=7&setup_action=update',
        cookie,
      )
      return response.headers.get('Location')
    }),
  )
  const home = new URL(routes.home(), TEST_ORIGIN).href
  expect({
    starts: starts.map((start) => [start.location, start.cookie]),
    returns,
  }).toEqual({
    starts: Array.from({ length: 7 }, () => [githubInstallPage, null]),
    returns: Array.from({ length: 9 }, () => home),
  })
})

it('sends an install from the Mac app back to the Mac app, on a page with no script and no cookie', async () => {
  const cases = [
    [
      'installation_id=7&setup_action=install&state=mac',
      'The GitHub App is installed',
      GITHUB_SETUP_PAGES.installed,
    ],
    [
      'installation_id=7&setup_action=update&state=mac',
      'The GitHub App is installed',
      GITHUB_SETUP_PAGES.installed,
    ],
    [
      'setup_action=request&state=mac',
      'Install request sent',
      GITHUB_SETUP_PAGES.requested,
    ],
  ] as const
  for (const [query, title, page] of cases) {
    const { response, pages } = await backFromGitHub(query)
    const body = await response.text()
    expect(
      {
        status: response.status,
        type: response.headers.get('Content-Type'),
        title: /<h1 class="text-title">([^<]*)<\/h1>/.exec(body)?.[1],
        script: body.includes('<script'),
        cookie: response.headers.get('Set-Cookie'),
        pages,
      },
      query,
    ).toEqual({
      status: 200,
      type: 'text/html; charset=utf-8',
      title,
      script: false,
      cookie: null,
      pages: [
        FILE_LIST_PATH,
        `/${SITE_FOLDER}/${page.slice(0, -'.html'.length)}`,
      ],
    })
  }
})

const installScreens = [
  [
    null,
    '__Host-conductive-github-return=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  ],
  [
    routes.createOrg(true),
    '__Host-conductive-github-return=%2Forgs%2Fnew%3Ffirst%3D1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600',
  ],
] as const

function installStart(
  domain: string | undefined,
  screen: string | null,
  appOrigin = previewOrigin,
) {
  const env = {
    APP_ORIGIN: appOrigin,
    GITHUB_APP_SLUG: 'conductive-build',
    GITHUB_SETUP_RELAY_DOMAIN: domain,
  }
  const path =
    screen === null
      ? GITHUB_INSTALL_PATH
      : githubInstallLink({ kind: 'browser', screen })
  return githubInstallResponse(new Request(new URL(path, previewOrigin)), env)
}

it('keeps install responses unchanged when the relay domain is unset', () => {
  for (const [screen, returnCookie] of installScreens) {
    const response = installStart(undefined, screen)
    expect({
      status: response.status,
      statusText: response.statusText,
      headers: [...response.headers],
      body: response.body,
    }).toEqual({
      status: 302,
      statusText: '',
      headers: [
        ['location', githubInstallPage],
        ['set-cookie', returnCookie],
      ],
      body: null,
    })
  }
})

it('adds the exact domain relay cookie with and without a screen', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  for (const [screen, returnCookie] of installScreens) {
    const response = installStart('example.dev', screen)
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(githubInstallPage)
    expect(response.headers.getSetCookie()).toEqual([
      returnCookie,
      '__Secure-conductive-github-relay=https%3A%2F%2Fpr-79-app.example.dev; Domain=example.dev; Path=/github/setup; HttpOnly; Secure; SameSite=Lax; Max-Age=3600',
    ])
  }
  expect(warn.mock.calls).toEqual([])
})

it('warns once and continues without a relay cookie for invalid configuration', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const longLabel = 'a'.repeat(64)
  const configurations = [
    [''],
    ['localhost', 'https://pr-79-app.localhost'],
    ['Example.dev'],
    ['https://example.dev'],
    ['example.dev:443'],
    ['example.dev/path'],
    ['*.example.dev', 'https://pr-79-app.*.example.dev'],
    ['.example.dev', 'https://pr-79-app..example.dev'],
    ['example.dev.', 'https://pr-79-app.example.dev.'],
    ['example..dev', 'https://pr-79-app.example..dev'],
    ['-example.dev', 'https://pr-79-app.-example.dev'],
    ['example-.dev', 'https://pr-79-app.example-.dev'],
    ['exam_ple.dev', 'https://pr-79-app.exam_ple.dev'],
    ['example.dev\n'],
    ['elsewhere.dev'],
    ['app.example.dev'],
    ['pr-79-app.example.dev'],
    ['example.dev', 'not an origin'],
    [`${longLabel}.dev`, `https://pr.${longLabel}.dev`],
  ]
  for (const [domain, origin] of configurations) {
    warn.mockClear()
    const response = installStart(domain, routes.createOrg(true), origin)
    expect(response.status, domain).toBe(302)
    expect(response.headers.get('Location'), domain).toBe(githubInstallPage)
    expect(response.headers.getSetCookie(), domain).toEqual([
      installScreens[1][1],
    ])
    expect(warn, domain).toHaveBeenCalledExactlyOnceWith({
      kind: 'github_setup_relay_domain_invalid',
      message:
        'GITHUB_SETUP_RELAY_DOMAIN is invalid for APP_ORIGIN. The install continues without a relay cookie.',
    })
  }
})
