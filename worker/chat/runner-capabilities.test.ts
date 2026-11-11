import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { RUNNER_SUPPORTED_LOGIN_KINDS } from '../../src/shared/runner'
import { codexTestTokens } from '../model-gateway/codex-login.test-support'
import { encrypt } from '../security/crypto'
import { FakeRunner, type FakeRunnerOptions } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
  type ChatFixture,
} from './harness.test-support'
import { agentLoginContext } from './queries'
import { sessionRecord } from './retry.test-support'
import {
  lifecycleSnapshot,
  messageCommands,
  terminalEvent,
} from './turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

const unsupportedCause =
  'This cloud computer cannot run Codex with ChatGPT. Ask an admin to build the org image again. Then start a new workspace. You can also connect an OpenAI API key.'

async function connectChatGPT(fixture: ChatFixture) {
  await harness.env.DB.prepare(
    "UPDATE agent_logins SET kind = 'token', ciphertext = ? WHERE user_id = ? AND agent = 'codex'",
  )
    .bind(
      await encrypt(
        JSON.stringify(codexTestTokens('real-chatgpt-token-kept-in-worker')),
        agentLoginContext(fixture.owner.id, 'codex'),
        harness.env.BOAT_KEY_ENCRYPTION_KEY,
      ),
      fixture.owner.id,
    )
    .run()
}

async function failedEnds(fixture: ChatFixture, sessionId: string) {
  return (await fixture.history(sessionId)).events.flatMap(({ event }) =>
    event.type === 'turn.failed' ? [event] : [],
  )
}

it('ends unsupported ChatGPT turns once without sending credentials and permits a new capable runner', async () => {
  const legacyRunners: Omit<FakeRunnerOptions, 'workspaceId'>[] = [
    { protocolVersion: 1 },
    { protocolVersion: 1, loginKinds: RUNNER_SUPPORTED_LOGIN_KINDS },
    { protocolVersion: 2 },
    { protocolVersion: 2, loginKinds: [{ agent: 'codex', kind: 'api-key' }] },
  ]
  for (const options of legacyRunners) {
    await harness.reset()
    const fixture = await createChatFixture(harness)
    await connectChatGPT(fixture)
    const session = await fixture.createSession(CODEX)
    await fixture.send(
      session.id,
      'unsupported-turn',
      fixture.ownerCookie,
      CODEX,
    )
    const [queued] = (await lifecycleSnapshot(fixture)).turns
    if (!queued) throw new Error('The queued ChatGPT turn is missing.')
    const runner = new FakeRunner({ workspaceId: WORKSPACE_ID, ...options })
    runner.emit({ type: 'runner.ready' })
    await fixture.connect(runner)
    expect(runner.commands).toEqual([])
    expect(await failedEnds(fixture, session.id)).toEqual([
      {
        type: 'turn.failed',
        sessionId: session.id,
        turnId: queued.id,
        error: { code: 'agent_login_required', message: unsupportedCause },
        retryMessageId: 'unsupported-turn',
        durationMs: 0,
      },
    ])
    expect(await sessionRecord(fixture, session.id)).toMatchObject({
      activeTurnId: null,
      retryMessageId: 'unsupported-turn',
    })
    expect((await lifecycleSnapshot(fixture)).commands).toEqual([])
    await fixture.disconnect(runner)
    await fixture.connect(runner)
    expect(runner.commands).toEqual([])
    expect(await failedEnds(fixture, session.id)).toHaveLength(1)
    expect(JSON.stringify(runner.received)).not.toContain(
      'real-chatgpt-token-kept-in-worker',
    )
    const capable = new FakeRunner({
      workspaceId: WORKSPACE_ID,
      protocolVersion: 2,
      loginKinds: RUNNER_SUPPORTED_LOGIN_KINDS,
      streamId: 'capable-runner',
    })
    capable.emit({ type: 'runner.ready' })
    await fixture.connect(capable)
    await fixture.send(session.id, 'supported-turn', fixture.ownerCookie, CODEX)
    expect(messageCommands(capable, 'supported-turn')).toMatchObject([
      {
        type: 'turn',
        credential: {
          agent: 'codex',
          kind: 'token',
          token: expect.stringMatching(/^sk-/),
        },
      },
    ])
    expect(JSON.stringify(capable.received)).not.toContain(
      'real-chatgpt-token-kept-in-worker',
    )
    expect(await failedEnds(fixture, session.id)).toHaveLength(1)
    await fixture.chat.closeConnections()
  }
})

it('ends a running turn before refusing a later unsupported login and stops its prior process', async () => {
  for (const protocolVersion of [1, 2] as const) {
    await harness.reset()
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession(CODEX)
    const runner = await fixture.connect(
      new FakeRunner({ workspaceId: WORKSPACE_ID, protocolVersion }),
    )
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await fixture.send(session.id, 'api-key-start', fixture.ownerCookie, CODEX)
    const [started] = messageCommands(runner, 'api-key-start')
    if (started?.type !== 'turn')
      throw new Error('The API-key turn did not start.')
    await connectChatGPT(fixture)
    await fixture.send(
      session.id,
      'unsupported-message',
      fixture.ownerCookie,
      CODEX,
    )
    expect(messageCommands(runner, 'unsupported-message')).toEqual([])
    expect(runner.commands.map(({ type }) => type)).toEqual([
      'turn',
      'interrupt',
    ])
    expect(runner.commands.at(-1)).toMatchObject({
      type: 'interrupt',
      turnId: started.turnId,
    })
    expect(await failedEnds(fixture, session.id)).toEqual([
      {
        type: 'turn.failed',
        sessionId: session.id,
        turnId: started.turnId,
        error: { code: 'agent_login_required', message: unsupportedCause },
        retryMessageId: 'api-key-start',
        durationMs: 0,
      },
    ])
    expect(await sessionRecord(fixture, session.id)).toMatchObject({
      activeTurnId: null,
      retryMessageId: 'api-key-start',
    })
    expect((await lifecycleSnapshot(fixture)).turns).toMatchObject([
      { id: started.turnId, state: 'failed' },
    ])
    expect(JSON.stringify(runner.received)).not.toContain(
      'real-chatgpt-token-kept-in-worker',
    )
    runner.emit(terminalEvent(started, 'stopped'))
    runner.emit(terminalEvent(started, 'stopped'))
    await fixture.drain()
    expect(await failedEnds(fixture, session.id)).toHaveLength(1)
    expect((await lifecycleSnapshot(fixture)).commands).toEqual([])
    await fixture.disconnect(runner)
    await fixture.connect(runner)
    expect(messageCommands(runner, 'api-key-start')).toHaveLength(1)
    expect(messageCommands(runner, 'unsupported-message')).toEqual([])
    expect(await failedEnds(fixture, session.id)).toHaveLength(1)
    await fixture.chat.closeConnections()
  }
})
