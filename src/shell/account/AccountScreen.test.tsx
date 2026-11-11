// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { chatGptSignInCopy as copy } from '../../../docs/mockups/src/components/settings/chatGptSignInCopy'
import { AppModel } from '../../app/app-model'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { HeldRequests, testServices } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import {
  accessibleName,
  byRole,
  queryAllByText,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import { holdAnimationFrames } from '../../test-support/mount'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { AccountScreen } from './AccountScreen'
import { chatGptLogin, codexItem, serveAccount } from './sign-in-test-kit'
import { buttonsOf, listItems } from './test-markup'

const choiceLabel = 'Open New workspace in'
const helper = 'A phone always opens the page.'
const notSaved = "The choice wasn't saved. Try again."

/**
 * The choice of how New workspace opens, as a screen reader reads it: the
 * checked options, whether every option is off, and the line under it that
 * describes it, its error or its helper line. Null when it does not show.
 */
function viewChoice(root: ParentNode) {
  const group = queryByRole('radiogroup', choiceLabel, root)
  if (!group) return null
  const options = Array.from(group.querySelectorAll('[role="radio"]'))
  const line = group.getAttribute('aria-describedby') ?? ''
  return {
    checked: options
      .filter((option) => option.getAttribute('aria-checked') === 'true')
      .map(accessibleName),
    off: options.every(
      (option) => option.getAttribute('aria-disabled') === 'true',
    ),
    line: document.getElementById(line)?.textContent ?? null,
  }
}

/** The link of each tab of the account, by its label. */
function accountTabs(view: HTMLElement): Map<string, HTMLAnchorElement> {
  const links = view.querySelectorAll<HTMLAnchorElement>(
    'nav[aria-label="Account"] a',
  )
  return new Map(Array.from(links, (link) => [String(link.textContent), link]))
}

/**
 * The open tab: the tab that the tabs mark, its sections, whether it shows
 * Model and effort, and the checked option of the choice of how New
 * workspace opens, or null when the choice does not show.
 */
function openTab(view: HTMLElement) {
  const main = view.querySelector('main')
  if (!main) throw new Error('The account is not on the screen.')
  const current = Array.from(accountTabs(view)).filter(
    ([, link]) => link.getAttribute('aria-current') === 'page',
  )
  return {
    current: current.map(([label]) => label),
    sections: Array.from(main.querySelectorAll('h2'), (title) =>
      String(title.textContent),
    ),
    model: queryAllByText('Model and effort', main).length > 0,
    choice: viewChoice(main)?.checked ?? null,
  }
}

/** The texts of the toasts that show, in their order. */
function toasts(): string[] {
  const shown = document.querySelectorAll(
    '[role="region"][aria-label="Notifications"] :is([role="alert"], [role="status"])',
  )
  return Array.from(shown, (toast) => String(toast.textContent))
}

/** The Preferences tab of the account of the fake API, mounted. */
async function mountPreferences(server: FakeApiServer) {
  holdAnimationFrames()
  const held = new HeldRequests(server)
  const app = await startedApp(server, { fetch: held.fetch })
  const view = mountScreen(
    app,
    <AccountScreen connect={null} tab="preferences" user={fakeUser} />,
  )
  const choose = async (label: string) => {
    click(byRole('radio', label, byRole('radiogroup', choiceLabel, view)))
    await settle()
  }
  return { view, held, choose }
}

describe('AccountScreen', () => {
  test('a connect link opens the Codex form, and a connected Claude login shows its kind, Remove, and its share setting', async () => {
    const server = new FakeApiServer()
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      agentLogins: [
        {
          agent: 'claude',
          connected: true,
          kind: 'token',
          noReuse: true,
          updatedAt: FAKE_TIME,
        },
        { agent: 'codex', connected: false },
      ],
    })
    const app = await startedApp(server)
    const view = mountScreen(
      app,
      <AccountScreen connect="codex" tab="general" user={fakeUser} />,
    )
    await settle()
    const [claude, codex] = listItems(view.innerHTML, 'Agents')
    expect(textOf(claude)).toBe(
      'Claude Connected Subscription token Remove Let other members use this login Their messages in your sessions start a new session on their own login.',
    )
    expect(buttonsOf(claude)).toEqual([
      { label: 'Remove Claude', disabled: false },
    ])
    expect(textOf(codex)).toContain('OpenAI API key')
    expect(codex).toContain('type="password"')
    expect(buttonsOf(codex)).toEqual([
      { label: 'Cancel', disabled: false },
      { label: 'Connect', disabled: false },
    ])
  })

  test('a Codex login that stopped working after the app opened shows Signed out, its cause, and Sign in again when the account opens', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveAccount(server, [chatGptLogin])
    const app = await startedApp(server)
    const cause = copy.causes.notRenewed
    serveAccount(server, [{ ...chatGptLogin, unusableCause: cause }])
    const view = mountScreen(
      app,
      <AccountScreen connect={null} tab="general" user={fakeUser} />,
    )
    await settle()
    expect(codexItem(view)).toBe(
      `Codex ${copy.signedOut} ChatGPT plan Remove ${cause} ${copy.signInAgain} Let other members use this login Their messages in your sessions start a new session on their own login.`,
    )
  })

  test('General shows no Model and effort, and the Preferences tab shows it with the saved choice', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      newWorkspaceView: 'dialog',
    })
    const navigation = memoryNavigation(routes.account())
    const view = mountScreen(
      new AppModel(testServices(server)),
      <NavigationContext.Provider value={navigation}>
        <Shell />
      </NavigationContext.Provider>,
    )
    await settle()
    const general = openTab(view)
    const preferencesTab = accountTabs(view).get('Preferences')
    if (!preferencesTab) throw new Error('The account has no Preferences tab.')
    click(preferencesTab)
    await settle()
    expect({
      general,
      address: navigation.history.at(-1),
      preferences: openTab(view),
    }).toEqual({
      general: {
        current: ['General'],
        sections: ['GitHub', 'Agents', 'Invite code'],
        model: false,
        choice: null,
      },
      address: routes.accountTab('preferences'),
      preferences: {
        current: ['Preferences'],
        sections: ['New workspaces'],
        model: true,
        choice: ['Dialog'],
      },
    })
  })

  test('a change of the choice saves it, and the choice is off until the answer', async () => {
    const server = new FakeApiServer()
    const { view, held, choose } = await mountPreferences(server)
    const path = ACCOUNT_PATHS.newWorkspaceView
    server.json('PUT', path, { view: 'dialog' })
    held.holdAnswer('PUT', path)
    await choose('Dialog')
    const saving = viewChoice(view)?.off
    held.release('PUT', path)
    await settle()
    const writes = server.requests.filter((request) => request.method === 'PUT')
    expect({
      saving,
      sent: await Promise.all(
        writes.map(async (request) => ({
          path: new URL(request.url).pathname,
          body: await request.json(),
        })),
      ),
      saved: viewChoice(view),
    }).toEqual({
      saving: true,
      sent: [{ path, body: { view: 'dialog' } }],
      saved: { checked: ['Dialog'], off: false, line: helper },
    })
  })

  test('a failed save keeps the saved choice with its error under it and no toast, and the next change clears the error and tries again', async () => {
    const server = new FakeApiServer()
    const { view, held, choose } = await mountPreferences(server)
    const path = ACCOUNT_PATHS.newWorkspaceView
    const error = { code: 'save_failed', message: 'Try again.' }
    server.json('PUT', path, { error }, 503)
    await choose('Dialog')
    const failed = { ...viewChoice(view), toasts: toasts() }
    server.json('PUT', path, { view: 'dialog' })
    held.holdAnswer('PUT', path)
    await choose('Dialog')
    const retrying = viewChoice(view)?.line
    held.release('PUT', path)
    await settle()
    expect({ failed, retrying, saved: viewChoice(view)?.checked }).toEqual({
      failed: { checked: ['Page'], off: false, line: notSaved, toasts: [] },
      retrying: helper,
      saved: ['Dialog'],
    })
  })
})
