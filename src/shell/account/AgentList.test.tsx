// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { productName } from '../../shared/brand'
import { HeldRequests, ManualDelay } from '../../app/test-kit'
import { codexDevicePath } from '../../shared/account'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
} from '../../test-support/mount'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { AgentList } from './AgentList'
import {
  agentItem,
  answerPolls,
  answerStart,
  chatGptLogin,
  getCode,
  serveAccount,
  startedSignIn,
} from './sign-in-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const started = startedSignIn('device-1', 'HZQW-7KMT')
const pollPath = codexDevicePath(started.handle)

/** The text of the Claude item while its form asks for a subscription token. */
const claudeForm = `Claude Subscription token API key Own endpoint Run claude setup-token on your computer, then paste the token that it prints. Subscription token ${productName} keeps it encrypted, and never shows it again. Cancel Connect`

describe('the agent list', () => {
  test('a ChatGPT sign-in that connects after Cancel shows Codex connected and runs connected, and the Claude form that opened meanwhile stays open', async () => {
    const server = new FakeApiServer()
    serveAccount(server, [
      { agent: 'claude', connected: false },
      { agent: 'codex', connected: false },
    ])
    answerStart(server, started)
    answerPolls(server, started.handle, {
      state: 'connected',
      login: chatGptLogin,
    })
    const delay = new ManualDelay()
    const held = new HeldRequests(server)
    holdAnimationFrames()
    const app = await startedApp(server, {
      delay: delay.delay,
      fetch: held.fetch,
    })
    let connected = 0
    // As the agent step of Get started draws the list once the step is done.
    const view = mountScreen(
      app,
      <AgentList
        closable
        connected={() => {
          connected += 1
        }}
        disabled={false}
        initial={null}
        removable={false}
      />,
    )
    await press(byRole('button', 'Connect Codex', view))
    await press(byRole('radio', 'ChatGPT plan', view))
    await getCode(view, started.userCode)
    held.holdAnswer('POST', pollPath)
    const polling = delay.runAll()
    await press(byRole('button', 'Cancel', view))
    await press(byRole('button', 'Connect Claude', view))
    const waiting = { claude: agentItem(view, 'claude'), connected }
    held.release('POST', pollPath)
    await act(() => polling)
    expect({
      waiting,
      claude: agentItem(view, 'claude'),
      codex: agentItem(view, 'codex'),
      connected,
    }).toEqual({
      waiting: { claude: claudeForm, connected: 0 },
      claude: claudeForm,
      codex: 'Codex Connected ChatGPT plan',
      connected: 1,
    })
  })
})
