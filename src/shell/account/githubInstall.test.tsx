// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { getStartedCopy } from '../../../docs/mockups/src/screens/getStartedCopy'
import { Store } from '../../app/store'
import { ManualFocus, requestLines } from '../../app/test-kit'
import {
  ACCOUNT_PATHS,
  type GitHubInstallationsResponse,
} from '../../shared/account'
import { API_PATHS } from '../../shared/api'
import {
  GET_STARTED_PATH,
  type GetStartedResponse,
} from '../../shared/onboarding'
import { isOperable, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { fakeUser } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { MacApp, type MacWindow, type MacWindowState } from '../mac/mac-app'
import { GetStartedScreen } from '../onboarding/GetStartedScreen'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { AccountScreen } from './AccountScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const installUrl = 'https://github.com/apps/conductive-build/installations/new'
const install = getStartedCopy.install.action

const macWindow: MacWindow = {
  state: new Store<MacWindowState>({
    mode: 'window',
    canGoBack: false,
    canGoForward: false,
  }),
  back: () => undefined,
  forward: () => undefined,
}

/** The steps of a new user, before and after the install of the GitHub App. */
function steps(installed: boolean): GetStartedResponse {
  return {
    orgId: null,
    steps: [
      { step: 'github-app', complete: installed },
      { step: 'org', complete: false },
      { step: 'agent-login', complete: false },
    ],
  }
}

/** The installs of the user: none, or the app on firna with 3 repositories. */
function installs(installed: boolean): GitHubInstallationsResponse {
  return {
    installations: installed
      ? [
          {
            id: 1,
            account: 'firna',
            repositoryCount: 3,
            settingsUrl:
              'https://github.com/organizations/firna/settings/installations/1',
          },
        ]
      : [],
    installUrl,
  }
}

/** A new user, who has not installed the GitHub App and has no org. */
function newUserServer(): FakeApiServer {
  const server = new FakeApiServer()
  server.json('GET', GET_STARTED_PATH, steps(false))
  server.json('GET', API_PATHS.orgs, { orgs: [] })
  server.json('GET', ACCOUNT_PATHS.githubInstallations, installs(false))
  return server
}

/** How many reads of the steps and of the installs the server got. */
function reads(server: FakeApiServer): { steps: number; installs: number } {
  const lines = requestLines(server)
  const count = (path: string) =>
    lines.filter((line) => line === `GET ${path}`).length
  return {
    steps: count(GET_STARTED_PATH),
    installs: count(ACCOUNT_PATHS.githubInstallations),
  }
}

/** The install button of a screen, once the installs give its address. */
function installButton(view: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const button = queryByRole('button', install, view)
    const on = button?.getAttribute('aria-disabled') !== 'true'
    return button && on && isOperable(button) ? button : null
  }, `an enabled ${install}`)
}

describe('the install of the GitHub App', () => {
  test('a browser opens GitHub with the screen where the install starts', async () => {
    holdAnimationFrames()
    const left: string[] = []
    const app = await startedApp(newUserServer(), {
      leave: (url) => left.push(url),
    })
    const getStarted = mountScreen(app, <GetStartedScreen user={fakeUser} />)
    await press(await installButton(getStarted))
    const account = mountScreen(
      app,
      <AccountScreen connect={null} tab="general" user={fakeUser} />,
    )
    await press(await installButton(account))
    expect(left).toEqual([
      `${installUrl}?state=get-started`,
      `${installUrl}?state=account`,
    ])
  })

  test('the Mac app opens GitHub with its own state, and one return of the focus reads and shows the install once', async () => {
    holdAnimationFrames()
    const left: string[] = []
    const focus = new ManualFocus()
    const server = newUserServer()
    const app = await startedApp(server, {
      leave: (url) => left.push(url),
      onFocus: focus.onFocus,
    })
    const view = mountScreen(
      app,
      <MacApp window={macWindow}>
        <GetStartedScreen user={fakeUser} />
      </MacApp>,
    )
    await press(await installButton(view))
    expect(left).toEqual([`${installUrl}?state=mac`])
    server.json('GET', ACCOUNT_PATHS.githubInstallations, installs(true))
    server.json('GET', GET_STARTED_PATH, steps(true))
    const before = reads(server)
    // One return to a browser tab fires both `focus` and `visibilitychange`.
    focus.focus()
    focus.focus()
    await waitFor(
      () => view.textContent?.includes('Installed on firna'),
      'the install on firna',
    )
    expect(view.textContent).toContain(
      'Installed on firna, with 3 repositories.',
    )
    expect(queryByRole('button', install, view)).toBeNull()
    const after = reads(server)
    expect({
      steps: after.steps - before.steps,
      installs: after.installs - before.installs,
    }).toEqual({ steps: 1, installs: 1 })
  })
})
