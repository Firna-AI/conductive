import { afterEach, beforeAll, expect, it } from 'vitest'

import { nested, record } from '../../src/app/api/parse'
import { readOrg } from '../../src/app/api/read-core'
import { ACCOUNT_PATHS } from '../../src/shared/account'
import { MODELS_PATH } from '../../src/shared/agents'
import { API_PATHS } from '../../src/shared/api'
import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import { shellGitHubCatalog } from '../app-api/feature-shell.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'
import {
  connectGetStartedGitHub,
  getStartedUser,
} from './get-started.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('marks the GitHub installation step complete before the first org exists', async () => {
  const active = (fixture = await featureFixture(bundle))
  await shellGitHubCatalog(active)
  const cookie = await getStartedUser(active)
  const request = () =>
    active.request(GET_STARTED_PATH, { headers: { Cookie: cookie } })
  const initial = await request()
  expect(initial.status).toBe(200)
  expect(await initial.json()).toEqual({
    orgId: null,
    steps: [
      { step: 'github-app', complete: false },
      { step: 'org', complete: false },
      { step: 'agent-login', complete: false },
    ],
  })
  await connectGetStartedGitHub(active)
  const installed = await request()
  expect(installed.status).toBe(200)
  expect(await installed.json()).toEqual({
    orgId: null,
    steps: [
      { step: 'github-app', complete: true },
      { step: 'org', complete: false },
      { step: 'agent-login', complete: false },
    ],
  })
  const created = await active.request(API_PATHS.orgs, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: JSON.stringify({ name: 'First empty org', repositoryIds: [] }),
  })
  expect(created.status).toBe(201)
  const org = nested(record(await created.json()), 'org', readOrg)
  const withOrg = await request()
  expect(withOrg.status).toBe(200)
  expect(await withOrg.json()).toEqual({
    orgId: org.id,
    steps: [
      { step: 'github-app', complete: true },
      { step: 'org', complete: true },
      { step: 'agent-login', complete: false },
    ],
  })
})

it('reads only installation pages and excludes suspended installations from Get started', async () => {
  const requests: Request[] = []
  let allSuspended = false
  const active = (fixture = await featureFixture(bundle, {
    outbound: async (request, fallback) => {
      requests.push(request.clone())
      const url = new URL(request.url)
      if (url.pathname !== '/user/installations')
        return url.pathname.endsWith('/repositories')
          ? new Response(null, { status: 503 })
          : fallback(request)
      const first = url.searchParams.get('page') === '1'
      return Response.json({
        total_count: 2,
        installations: [
          {
            id: first ? 92 : 91,
            account: { login: 'owner', type: 'User' },
            html_url: 'https://github.com/settings/installations/91',
            suspended_at: first || allSuspended ? '2026-11-08T00:00:00Z' : null,
          },
        ],
      })
    },
  }))
  const cookie = await getStartedUser(active)
  await connectGetStartedGitHub(active)
  const installed = await active.request(GET_STARTED_PATH, {
    headers: { Cookie: cookie },
  })
  expect(installed.status).toBe(200)
  expect(await installed.json()).toEqual({
    orgId: null,
    steps: [
      { step: 'github-app', complete: true },
      { step: 'org', complete: false },
      { step: 'agent-login', complete: false },
    ],
  })
  allSuspended = true
  const suspended = await active.request(GET_STARTED_PATH, {
    headers: { Cookie: cookie },
  })
  expect(suspended.status).toBe(200)
  expect(await suspended.json()).toEqual({
    orgId: null,
    steps: [
      { step: 'github-app', complete: false },
      { step: 'org', complete: false },
      { step: 'agent-login', complete: false },
    ],
  })
  expect(
    requests.map((request) => {
      const url = new URL(request.url)
      return `${url.pathname}${url.search}`
    }),
  ).toEqual([
    '/user/installations?per_page=100&page=1',
    '/user/installations?per_page=100&page=2',
    '/user/installations?per_page=100&page=1',
    '/user/installations?per_page=100&page=2',
  ])
  expect(
    requests.map((request) => request.headers.get('Authorization')),
  ).toEqual([
    'Bearer new-user-token',
    'Bearer new-user-token',
    'Bearer new-user-token',
    'Bearer new-user-token',
  ])
})

it('keeps boot routes available during a GitHub failure and reports the installation load failure separately', async () => {
  let receiveWarning: (message: string) => void = () => undefined
  const warning = new Promise<string>((resolve) => {
    receiveWarning = resolve
  })
  const warnings: string[] = []
  const active = (fixture = await featureFixture(bundle, {
    configuration: {
      CONDUCTIVE_MODELS: JSON.stringify([
        {
          agent: 'claude',
          model: 'operator-claude',
          label: 'Claude',
          efforts: ['high'],
        },
      ]),
      CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify({
        agent: 'claude',
        model: 'operator-claude',
        effort: 'high',
      }),
    },
    handleStructuredLogs: ({ level, message }) => {
      if (level === 'warn') {
        warnings.push(message)
        receiveWarning(message)
      }
    },
    outbound: async (request, fallback) =>
      new URL(request.url).pathname === '/user/installations'
        ? Response.json(
            { message: 'private-github-error-detail' },
            { status: 503 },
          )
        : fallback(request),
  }))
  const cookie = await getStartedUser(active)
  await connectGetStartedGitHub(active)
  const replies = await Promise.all(
    [
      API_PATHS.session,
      ACCOUNT_PATHS.account,
      API_PATHS.orgs,
      MODELS_PATH,
      GET_STARTED_PATH,
    ].map((path) => active.request(path, { headers: { Cookie: cookie } })),
  )
  expect(replies.map((reply) => reply.status)).toEqual([
    200, 200, 200, 200, 200,
  ])
  expect(await replies[4].json()).toEqual({
    orgId: null,
    steps: [
      { step: 'github-app', complete: false },
      { step: 'org', complete: false },
      { step: 'agent-login', complete: false },
    ],
  })
  const expectedWarning = `{
  kind: 'github_installation_status_failed',
  message: 'Could not read GitHub installation status for Get started.'
}`
  expect(await warning).toBe(expectedWarning)
  expect(warnings).toEqual([expectedWarning])
  const installations = await active.request(
    ACCOUNT_PATHS.githubInstallations,
    {
      headers: { Cookie: cookie },
    },
  )
  expect(installations.status).toBe(502)
  expect(await installations.json()).toEqual({
    error: {
      code: 'github_unavailable',
      message: 'GitHub is not available. Try again.',
    },
  })
})
