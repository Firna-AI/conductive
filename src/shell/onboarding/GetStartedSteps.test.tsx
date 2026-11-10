// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { AppModel } from '../../app/app-model'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { requestLines, testServices } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import { API_PATHS } from '../../shared/api'
import { GET_STARTED_PATH } from '../../shared/onboarding'
import { orgSettingsPaths, type ImageBuild } from '../../shared/org-settings'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { click, mountScreen, settle, typeText } from '../test-mount'
import type { Viewport } from '../ui/viewport'
import { fieldNamed } from '../workspace/kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/**
 * The whole app in a tab at `start`, on a memory address bar. The shell
 * starts the app once, as in the browser, so the steps load once.
 */
async function mountApp(
  server: FakeApiServer,
  start: string,
  viewport: Viewport,
) {
  const app = new AppModel(testServices(server))
  const navigation = memoryNavigation(start)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
    { viewport },
  )
  await settle()
  return { view, navigation }
}

/** Whether a button with this name shows, and a press would act. */
function pressable(view: HTMLElement, name: string): boolean {
  const button = queryByRole('button', name, view)
  return (
    button !== null &&
    !button.hasAttribute('disabled') &&
    button.getAttribute('aria-disabled') !== 'true'
  )
}

/** The texts of the elements that match `selector`, in their order. */
function textsOf(view: HTMLElement, selector: string): string[] {
  return Array.from(view.querySelectorAll(selector), (item) =>
    (item.textContent ?? '').trim(),
  )
}

describe('the steps of Get started', () => {
  test('a member who leaves their last org on a phone gets Create org again, in words that claim no first use', async () => {
    const server = new FakeApiServer({ role: 'member' })
    const acme = coreFixtures('member').orgs.orgs.find(
      (org) => org.id === FAKE_IDS.org,
    )
    if (!acme) throw new Error('The fake org is missing.')
    // Acme is the only org of the user. Leave shows in a suspended org.
    server.json('GET', API_PATHS.orgs, {
      orgs: [{ ...acme, suspension: { suspendedAt: FAKE_TIME } }],
    })
    const { view, navigation } = await mountApp(
      server,
      routes.settings(FAKE_IDS.org),
      'phone',
    )
    click(byRole('button', 'Leave org', view))
    await settle()
    click(byRole('button', 'Leave org', byRole('dialog', 'Leave Acme?')))
    await settle()
    expect({
      address: navigation.history.at(-1),
      createOrg: pressable(view, 'Create org'),
      created: (view.textContent ?? '').includes('Created'),
      intro: textsOf(view, 'p').find((text) => text.startsWith('Welcome,')),
      orgStep: textsOf(view, 'h2').find((text) => text.startsWith('2. ')),
    }).toEqual({
      address: routes.getStarted(),
      createOrg: true,
      created: false,
      intro: 'Welcome, Priya Raman. Finish these steps to create a workspace.',
      orgStep: '2. Create an org',
    })
  })

  test('Open the log of a failed first build opens the Cloud computer tab, and Try again starts a build that the step and the finish follow', async () => {
    const server = new FakeApiServer()
    const failed: ImageBuild = {
      id: 'first',
      orgId: FAKE_IDS.org,
      kind: 'build',
      state: 'failed',
      startedAt: FAKE_TIME - 720_000,
      completedAt: FAKE_TIME - 582_000,
      durationMs: 138_000,
      error: 'The cloud computer image could not build.',
    }
    const started: ImageBuild = {
      ...failed,
      id: 'second',
      state: 'running',
      startedAt: FAKE_TIME,
      completedAt: null,
      durationMs: null,
      error: null,
    }
    const buildsPath = orgSettingsPaths.builds(FAKE_IDS.org)
    server.json('GET', buildsPath, {
      builds: [failed],
      currentImageBuildId: null,
      changes: {
        installScript: false,
        addedRepositories: [],
        removedRepositories: [],
      },
    })
    server.json('POST', buildsPath, { build: started, log: [] }, 202)
    // The spinners of the tab and of the running build stay on one frame.
    holdAnimationFrames()
    const { view, navigation } = await mountApp(
      server,
      routes.getStarted(),
      'desktop',
    )
    click(byRole('button', 'Open the log', view))
    await settle()
    const log = navigation.history.at(-1)
    act(() => navigation.push(routes.getStarted()))
    await settle()
    click(byRole('button', 'Try again', view))
    await settle()
    const orgStep = Array.from(view.querySelectorAll('h2'))
      .find((title) => title.textContent === '2. Create an org')
      ?.closest('section')
    expect({
      log,
      starts: requestLines(server).filter(
        (line) => line === `POST ${buildsPath}`,
      ).length,
      preparing: (orgStep?.textContent ?? '').includes('Preparing · 0s'),
      tryAgain: queryByRole('button', 'Try again', view),
      finish: view.querySelector('ol + * p')?.textContent,
      open: pressable(view, 'Open Acme'),
    }).toEqual({
      log: routes.settings(FAKE_IDS.org, 'cloud-computer'),
      starts: 1,
      preparing: true,
      tryAgain: null,
      finish: "Acme's cloud computer is still being prepared.",
      open: true,
    })
  })

  test('an agent that connects on Account before Get started is done completes its step, with no second read of the steps', async () => {
    const server = new FakeApiServer()
    server.json('GET', GET_STARTED_PATH, {
      orgId: FAKE_IDS.org,
      steps: [
        { step: 'github-app', complete: true },
        { step: 'org', complete: true },
        { step: 'agent-login', complete: false },
      ],
    })
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      agentLogins: [
        { agent: 'claude', connected: false },
        { agent: 'codex', connected: false },
      ],
    })
    const { view, navigation } = await mountApp(
      server,
      routes.account('claude'),
      'desktop',
    )
    typeText(fieldNamed(view, 'Subscription token'), 'token-from-claude')
    click(byRole('button', 'Connect', view))
    await settle()
    act(() => navigation.push(routes.getStarted()))
    await settle()
    expect({
      finish: pressable(view, 'Open Acme'),
      reads: requestLines(server).filter(
        (line) => line === `GET ${GET_STARTED_PATH}`,
      ).length,
    }).toEqual({ finish: true, reads: 1 })
  })
})
