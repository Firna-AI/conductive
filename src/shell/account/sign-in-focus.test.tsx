// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { chatGptSignInCopy as copy } from '../../../docs/mockups/src/components/settings/chatGptSignInCopy'
import { ManualDelay } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT, press } from '../../test-support/mount'
import { textOf } from '../test-render'
import {
  answerPolls,
  answerStart,
  askForCode,
  chatGptLogin,
  getCode,
  openAccount,
  openSignIn,
  refusal,
  runPoll,
  serveAccount,
  startedSignIn,
} from './sign-in-test-kit'

// These tests cover the ChatGPT plan, which the app hides for now.
vi.mock('./chatgpt-availability', () => ({ chatGptSignInAvailable: true }))

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const started = startedSignIn('device-1', 'HZQW-7KMT')

/**
 * What has the focus: the page, or an element with its text and its
 * tabindex. happy-dom focuses a paragraph without a tabindex, and a
 * browser does not, so the tabindex shows that a browser focuses it too.
 */
function focused() {
  const active = document.activeElement
  if (active === null || active === document.body) return 'the page'
  return {
    text: textOf(active.outerHTML),
    tabIndex: active.getAttribute('tabindex'),
  }
}

/** Gives the element the focus, as the keyboard does before a press. */
function focus(element: HTMLElement): void {
  act(() => element.focus())
}

describe('the keyboard focus of the ChatGPT sign-in', () => {
  test('the switch keeps the focus at the first step, and each new step takes the focus on its first line', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    const off = refusal('codex_device_failed', copy.causes.refused)
    server.json('POST', ACCOUNT_PATHS.codexDevice, off, 502)
    const delay = new ManualDelay()
    const { view } = await openAccount(server, { delay: delay.delay }, 'codex')
    const plan = byRole('radio', 'ChatGPT plan', view)
    focus(plan)
    await press(plan)
    const first = document.activeElement === plan
    focus(byRole('button', copy.getCode, view))
    await askForCode(view)
    const refused = focused()
    answerStart(server, started)
    focus(byRole('button', copy.getCode, view))
    await getCode(view, started.userCode)
    const code = focused()
    answerPolls(server, started.handle, { state: 'expired' })
    await runPoll(delay)
    expect({ first, refused, code, expired: focused() }).toEqual({
      first: true,
      refused: {
        text: `${copy.causes.refused} ${copy.settingsLink.label}`,
        tabIndex: '-1',
      },
      code: {
        text: `${copy.steps.before} auth.openai.com/codex/device ${copy.steps.after}`,
        tabIndex: '-1',
      },
      expired: { text: copy.expired, tabIndex: '-1' },
    })
  })

  test('Sign in again gives the focus to the first line of the sign-in that takes its place', async () => {
    const server = new FakeApiServer()
    const cause = copy.causes.notRenewed
    serveAccount(server, [{ ...chatGptLogin, unusableCause: cause }])
    const { view } = await openAccount(server, {}, null)
    const again = byRole('button', copy.signInAgain, view)
    focus(again)
    await press(again)
    expect(focused()).toEqual({
      text: `${copy.intro} ${copy.settingsLink.label}`,
      tabIndex: '-1',
    })
  })

  test('a step that comes while the focus is elsewhere on the page leaves the focus there', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    answerStart(server, started)
    answerPolls(server, started.handle, { state: 'expired' })
    const delay = new ManualDelay()
    const { view } = await openSignIn(server, delay)
    await getCode(view, started.userCode)
    const remove = byRole('button', 'Remove Claude', view)
    focus(remove)
    await runPoll(delay)
    expect({
      expired: queryByText(copy.expired, view) !== null,
      kept: document.activeElement === remove,
    }).toEqual({ expired: true, kept: true })
  })
})
