// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { chatGptSignInCopy as copy } from '../../../docs/mockups/src/components/settings/chatGptSignInCopy'
import { HeldRequests, ManualDelay, requestLines } from '../../app/test-kit'
import { agentLoginPath, codexDevicePath } from '../../shared/account'
import { byRole, byText, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { AppProviders, startedApp } from '../test-render'
import { fieldNamed } from '../workspace/kept-test-kit'
import { AccountScreen } from './AccountScreen'
import {
  agentItem,
  answerPolls,
  answerStart,
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
  settingsLink,
  startedSignIn,
} from './sign-in-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const started = startedSignIn('device-1', 'HZQW-7KMT')
const pollPath = codexDevicePath(started.handle)

describe('the Connect form', () => {
  test('a save sends the kind that the switch chose, and the row shows the agent connected with that kind', async () => {
    const server = new FakeApiServer()
    serveAccount(server, [{ agent: 'claude', connected: false }])
    const path = agentLoginPath('claude')
    server.json('PUT', path, {
      agent: 'claude',
      connected: true,
      kind: 'api-key',
      noReuse: false,
      updatedAt: FAKE_TIME,
    })
    const { view } = await openAccount(server, {}, 'claude')
    await press(byRole('radio', 'API key', view))
    await typeText(fieldNamed(view, 'Anthropic API key'), 'claude-key')
    await press(byRole('button', 'Connect', view))
    await waitFor(
      () => queryByRole('button', 'Remove Claude', view),
      'the connected Claude login',
    )
    const saves = server.requests.filter(({ method }) => method === 'PUT')
    expect({
      saves: requestLines(server).filter((line) => line.startsWith('PUT')),
      body: await saves[0]?.json(),
      row: agentItem(view, 'claude'),
    }).toEqual({
      saves: [`PUT ${path}`],
      body: { agent: 'claude', kind: 'api-key', secret: 'claude-key' },
      row: 'Claude Connected API key Remove Let other members use this login Their messages in your sessions use this login.',
    })
  })
})

describe('the Connect form of Codex', () => {
  test('starts on API key, and ChatGPT plan shows the code with the page of OpenAI, polls after each wait of the Worker, and shows Codex connected on the plan, not shared', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    answerStart(server, started)
    const delay = new ManualDelay()
    const { app, view } = await openAccount(
      server,
      { delay: delay.delay },
      'codex',
    )
    const first = kindChoices(view)
    await press(byRole('radio', 'ChatGPT plan', view))
    const intro = { item: codexItem(view), settings: settingsLink(view) }
    await getCode(view, started.userCode)
    const link = byText('auth.openai.com/codex/device', view)
    const code = {
      item: codexItem(view),
      link: [
        link.tagName,
        link.getAttribute('href'),
        link.getAttribute('target'),
      ],
      waits: delay.waits,
      polls: requestsTo(server, 'POST', pollPath),
    }
    answerPolls(server, started.handle, {
      state: 'waiting',
      pollIntervalMs: 7_000,
    })
    await runPoll(delay)
    const waiting = { waits: delay.waits, item: codexItem(view) }
    answerPolls(server, started.handle, {
      state: 'connected',
      login: chatGptLogin,
    })
    await runPoll(delay)
    await waitFor(
      () => queryByRole('button', 'Remove Codex', view),
      'the connected Codex login',
    )
    const share = byRole('switch', 'Codex Let other members use this login')
    expect({
      first,
      intro,
      code,
      waiting,
      connected: {
        item: codexItem(view),
        shared: share.getAttribute('aria-checked'),
        timers: delay.pending,
        polls: requestsTo(server, 'POST', pollPath),
        login: app.account.login('codex'),
      },
    }).toEqual({
      first: [
        { kind: 'API key', selected: true },
        { kind: 'ChatGPT plan', selected: false },
        { kind: 'Own endpoint', selected: false },
      ],
      intro: {
        item: `Codex API key ChatGPT plan Own endpoint ${copy.intro} ${copy.settingsLink.label} Cancel ${copy.getCode}`,
        settings: [copy.settingsLink.href, '_blank'],
      },
      code: {
        item: codeShown('HZQW-7KMT'),
        link: ['A', 'https://auth.openai.com/codex/device', '_blank'],
        waits: [5_000],
        polls: 0,
      },
      waiting: { waits: [7_000], item: codeShown('HZQW-7KMT') },
      connected: {
        item: chatGptRow,
        shared: 'false',
        timers: 0,
        polls: 2,
        login: chatGptLogin,
      },
    })
  })

  test('Cancel closes the form and stops the polls, and the answer of a poll that ran starts no other poll', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    answerStart(server, started)
    answerPolls(server, started.handle, {
      state: 'waiting',
      pollIntervalMs: 5_000,
    })
    const delay = new ManualDelay()
    const held = new HeldRequests(server)
    const { view } = await openSignIn(server, delay, { fetch: held.fetch })
    await getCode(view, started.userCode)
    held.holdAnswer('POST', pollPath)
    const polling = delay.runAll()
    await press(byRole('button', 'Cancel', view))
    held.release('POST', pollPath)
    await act(() => polling)
    expect({
      item: codexItem(view),
      timers: delay.pending,
      polls: requestsTo(server, 'POST', pollPath),
    }).toEqual({ item: 'Codex Connect', timers: 0, polls: 1 })
  })

  test('leaving the page stops the polls', async () => {
    const server = new FakeApiServer()
    serveAccount(server)
    answerStart(server, started)
    const delay = new ManualDelay()
    holdAnimationFrames()
    const app = await startedApp(server, { delay: delay.delay })
    const page = await mount(
      <AppProviders app={app}>
        <AccountScreen connect="codex" tab="agents" user={fakeUser} />
      </AppProviders>,
    )
    await press(byRole('radio', 'ChatGPT plan', page.container))
    await getCode(page.container, started.userCode)
    const waiting = delay.pending
    await page.unmount()
    expect({ waiting, left: delay.pending }).toEqual({ waiting: 1, left: 0 })
  })
})
