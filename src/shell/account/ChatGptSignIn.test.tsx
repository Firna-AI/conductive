// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { chatGptSignInCopy as copy } from '../../../docs/mockups/src/components/settings/chatGptSignInCopy'
import { ManualDelay } from '../../app/test-kit'
import { ACCOUNT_PATHS, codexDevicePath } from '../../shared/account'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import {
  answerPolls,
  answerStart,
  askForCode,
  chatGptLogin,
  chatGptRow,
  codeShown,
  codexItem,
  getCode,
  kindChoices,
  openAccount,
  openSignIn,
  requestsTo,
  runPoll,
  serveAccount,
  startedSignIn,
} from './sign-in-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const first = startedSignIn('device-1', 'HZQW-7KMT')
const second = startedSignIn('device-2', 'PQRS-2345')

/** The text of the Codex form after the switch, by its step. */
const shown = {
  expired: `Codex API key ChatGPT plan ${copy.expired} Cancel ${copy.newCode}`,
  refused: (cause: string) =>
    `Codex API key ChatGPT plan ${cause} Cancel ${copy.newCode}`,
}

/** An answer of the Worker that refuses a request, with its message. */
function refusal(code: string, message: string) {
  return { error: { code, message } }
}

describe('the ChatGPT sign-in of Codex', () => {
  test('an expired code shows that it expired, without the code, and Get a new code shows a new code', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    answerStart(server, first)
    answerPolls(server, first.handle, { state: 'expired' })
    const delay = new ManualDelay()
    const { view } = await openSignIn(server, delay)
    await getCode(view, first.userCode)
    await runPoll(delay)
    expect({ item: codexItem(view), timers: delay.pending }).toEqual({
      item: shown.expired,
      timers: 0,
    })
    answerStart(server, second)
    await getCode(view, second.userCode, copy.newCode)
    expect({
      item: codexItem(view),
      waits: delay.waits,
      starts: requestsTo(server, 'POST', ACCOUNT_PATHS.codexDevice),
    }).toEqual({ item: codeShown('PQRS-2345'), waits: [5_000], starts: 2 })
  })

  test('a sign-in that the Worker refused shows its cause as an alert, with Get a new code', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    answerStart(server, first)
    answerPolls(server, first.handle, {
      state: 'failed',
      cause: copy.causes.failed,
    })
    const delay = new ManualDelay()
    const { view } = await openSignIn(server, delay)
    await getCode(view, first.userCode)
    await runPoll(delay)
    expect({
      alert: queryByRole('alert', copy.causes.failed, view) !== null,
      item: codexItem(view),
      timers: delay.pending,
    }).toEqual({
      alert: true,
      item: shown.refused(copy.causes.failed),
      timers: 0,
    })
  })

  test('a request for a code that the Worker refused shows its cause as a refused sign-in, and Get a new code asks again', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    const off = refusal('codex_device_failed', copy.causes.refused)
    server.json('POST', ACCOUNT_PATHS.codexDevice, off, 502)
    const delay = new ManualDelay()
    const { view } = await openSignIn(server, delay)
    await askForCode(view)
    expect({
      alert: queryByRole('alert', copy.causes.refused, view) !== null,
      item: codexItem(view),
    }).toEqual({ alert: true, item: shown.refused(copy.causes.refused) })
    answerStart(server, first)
    await getCode(view, first.userCode, copy.newCode)
    expect(delay.waits).toEqual([5_000])
  })

  test('a poll that the server failed waits for the same time, and the next poll connects', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    answerStart(server, first)
    const pollPath = codexDevicePath(first.handle)
    const down = refusal('internal_error', 'The request failed. Try again.')
    server.json('POST', pollPath, down, 503)
    const delay = new ManualDelay()
    const { view } = await openSignIn(server, delay)
    await getCode(view, first.userCode)
    await runPoll(delay)
    expect({ waits: delay.waits, item: codexItem(view) }).toEqual({
      waits: [5_000],
      item: codeShown('HZQW-7KMT'),
    })
    answerPolls(server, first.handle, {
      state: 'connected',
      login: chatGptLogin,
    })
    await runPoll(delay)
    await waitFor(
      () => queryByRole('button', 'Remove Codex', view),
      'the connected Codex login',
    )
    expect({
      item: codexItem(view),
      polls: requestsTo(server, 'POST', pollPath),
    }).toEqual({ item: chatGptRow, polls: 2 })
  })

  test('a poll that the Worker refused shows its cause, and a refused poll after the code expired shows the code expired', async () => {
    const server = new FakeApiServer()
    const gone = refusal(
      'codex_device_not_found',
      'The ChatGPT sign-in is not available.',
    )
    serveAccount(server)
    answerStart(server, first)
    server.json('POST', codexDevicePath(first.handle), gone, 404)
    server.json('POST', codexDevicePath(second.handle), gone, 404)
    const delay = new ManualDelay()
    let now = FAKE_TIME
    const { view } = await openSignIn(server, delay, { now: () => now })
    await getCode(view, first.userCode)
    await runPoll(delay)
    const refused = codexItem(view)
    answerStart(server, second)
    await getCode(view, second.userCode, copy.newCode)
    now = second.expiresAt
    await runPoll(delay)
    expect({
      refused,
      expired: codexItem(view),
      timers: delay.pending,
    }).toEqual({
      refused: shown.refused('The ChatGPT sign-in is not available.'),
      expired: shown.expired,
      timers: 0,
    })
  })

  test('a Codex login that stopped working shows Signed out, its cause, and Sign in again, which opens the ChatGPT sign-in in the place of the cause', async () => {
    const server = new FakeApiServer()
    const cause = copy.causes.notRenewed
    serveAccount(server, [{ ...chatGptLogin, unusableCause: cause }])
    answerStart(server, first)
    answerPolls(server, first.handle, {
      state: 'connected',
      login: chatGptLogin,
    })
    const delay = new ManualDelay()
    const { view } = await openAccount(server, { delay: delay.delay }, null)
    const signedOut = codexItem(view)
    await press(byRole('button', copy.signInAgain, view))
    const signIn = { item: codexItem(view), kinds: kindChoices(view) }
    await getCode(view, first.userCode)
    await runPoll(delay)
    await waitFor(
      () => !codexItem(view).includes(copy.signedOut),
      'the connected Codex login',
    )
    const share = `Let other members use this login Their messages in your sessions start a new session on their own login.`
    expect({ signedOut, signIn, connected: codexItem(view) }).toEqual({
      signedOut: `Codex ${copy.signedOut} ChatGPT plan Remove ${cause} ${copy.signInAgain} ${share}`,
      signIn: {
        item: `Codex ${copy.signedOut} ChatGPT plan Remove API key ChatGPT plan ${copy.intro} Cancel ${copy.getCode} ${share}`,
        kinds: [
          { kind: 'API key', selected: false },
          { kind: 'ChatGPT plan', selected: true },
        ],
      },
      connected: chatGptRow,
    })
  })
})
