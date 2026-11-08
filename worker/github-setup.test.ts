import { afterAll, beforeAll, expect, it } from 'vitest'

import { routes } from '../src/app/router'
import { GITHUB_SETUP_PATH } from '../src/shared/github-setup'
import { createApp } from './application'
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

/**
 * The request of a browser that GitHub sends back after an install. It
 * carries no session. The pages of the app record each request that
 * reaches them.
 */
async function backFromGitHub(query: string) {
  const pages: string[] = []
  const env = {
    ...harness.env,
    ASSETS: {
      fetch: async (request: Request) => {
        pages.push(request.url)
        return new Response('<main>Conductive</main>')
      },
    },
  }
  const response = await createApp().fetch(
    new Request(`${TEST_ORIGIN}${GITHUB_SETUP_PATH}?${query}`),
    env,
  )
  return { response, pages }
}

it('returns an install from a browser to the screen where it started, without the query of GitHub', async () => {
  const cases = [
    [
      'installation_id=7&setup_action=install&state=get-started',
      routes.getStarted(),
    ],
    ['installation_id=7&setup_action=update&state=account', routes.account()],
    ['installation_id=7&setup_action=install', routes.home()],
    ['setup_action=install&state=https://elsewhere.test/', routes.home()],
  ] as const
  for (const [query, screen] of cases) {
    const { response, pages } = await backFromGitHub(query)
    expect(
      {
        status: response.status,
        location: response.headers.get('Location'),
        pages,
      },
      query,
    ).toEqual({
      status: 302,
      location: new URL(screen, TEST_ORIGIN).href,
      pages: [],
    })
  }
})

it('sends an install from the Mac app back to the Mac app, on a page with no script and no cookie', async () => {
  const cases = [
    [
      'installation_id=7&setup_action=install&state=mac',
      'The GitHub App is installed',
    ],
    [
      'installation_id=7&setup_action=update&state=mac',
      'The GitHub App is installed',
    ],
    ['setup_action=request&state=mac', 'Install request sent'],
  ] as const
  for (const [query, title] of cases) {
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
      pages: [],
    })
  }
})
