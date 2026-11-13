import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  createChatFixture,
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
  type ChatFixture,
} from './harness.test-support'
import { sessionRecord } from './retry.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

async function hello(fixture: ChatFixture, protocolVersion: number) {
  const peer = 'version-runner'
  await fixture.actor.api.peers.connectRunner(peer, {
    url: `${MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
    headers: { Authorization: `Bearer ${WORKSPACE_TOKEN}` },
  })
  await fixture.actor.api.peers.receiveRunner(peer, {
    type: 'hello',
    protocolVersion,
    workspaceId: WORKSPACE_ID,
    streamId: 'version-stream',
  })
  const { closed, messages } = await fixture.actor.api.peers.take(peer)
  return { closed, messages }
}

it.each([
  { pin: null, version: 1 },
  { pin: 1, version: 1 },
  { pin: 2, version: 1 },
])(
  'refuses unsupported runner $version with pin $pin and ends waiting turns once',
  async ({ pin, version }) => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const accepted = await fixture.send(session.id)
    await harness.env.DB.prepare(
      'UPDATE workspaces SET runner_protocol_version = ? WHERE id = ?',
    )
      .bind(pin, WORKSPACE_ID)
      .run()
    await fixture.actor.api.controls.captureWarnings(true)
    try {
      expect(await hello(fixture, version)).toEqual({ closed: 1, messages: [] })
      const failures = async () =>
        (await fixture.history(session.id)).events.flatMap(({ event }) =>
          event.type === 'turn.failed' ? [event] : [],
        )
      expect(await failures()).toEqual([
        {
          type: 'turn.failed',
          sessionId: session.id,
          turnId: accepted.session.activeTurnId,
          error: {
            code: 'runner_protocol_unsupported',
            message:
              'This cloud computer can no longer run agents. Ask an admin to build the org image again. Then start a new workspace.',
          },
          retryMessageId: 'message-1',
          durationMs: 0,
        },
      ])
      expect(
        await fixture.chat.readWorkspace(WORKSPACE_ID, (view) =>
          view.pending(),
        ),
      ).toEqual([])
      expect(await sessionRecord(fixture, session.id)).toMatchObject({
        activeTurnId: null,
        retryMessageId: 'message-1',
        loginAvailable: true,
      })
      expect(await hello(fixture, version)).toEqual({ closed: 1, messages: [] })
      expect(await failures()).toHaveLength(1)
      expect(await fixture.actor.api.controls.warningCalls()).toEqual([
        [
          {
            kind: 'runner_protocol_version_mismatch',
            workspaceId: 'unknown',
            message:
              'The runner closes because its protocol version is not supported or does not meet the workspace version pin.',
          },
        ],
        [
          {
            kind: 'runner_protocol_version_mismatch',
            workspaceId: 'unknown',
            message:
              'The runner closes because its protocol version is not supported or does not meet the workspace version pin.',
          },
        ],
      ])
    } finally {
      await fixture.actor.api.controls.captureWarnings(false)
      await fixture.chat.closeConnections()
    }
  },
)

it.each([null, 1, 2])(
  'delivers gateway turns to a supported runner with workspace pin %s',
  async (pin) => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    await fixture.send(session.id)
    await harness.env.DB.prepare(
      'UPDATE workspaces SET runner_protocol_version = ? WHERE id = ?',
    )
      .bind(pin, WORKSPACE_ID)
      .run()
    const runner = new FakeRunner({
      workspaceId: WORKSPACE_ID,
      protocolVersion: 2,
    })
    runner.emit({ type: 'runner.ready' })
    await fixture.connect(runner)
    expect(fixture.transport.closedConnections).toBe(0)
    expect(runner.received[0]).toEqual({
      type: 'welcome',
      protocolVersion: 2,
      streamId: 'fake-stream-1',
      confirmedThrough: 0,
    })
    expect(runner.commands).toMatchObject([
      {
        type: 'turn',
        message: { id: 'message-1' },
        credential: {
          agent: 'claude',
          kind: 'api-key',
          token: expect.stringMatching(/^sk-ant-api-/),
        },
      },
    ])
    expect(runner.commands[0]).not.toHaveProperty('login')
    expect(JSON.stringify(runner.received)).not.toContain(
      `secret-${fixture.owner.id}-claude`,
    )
  },
)

it.each([
  { version: 3, pin: null },
  { version: 2, pin: 3 },
])(
  'refuses runner $version with pin $pin without failing turns that can recover',
  async ({ version, pin }) => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const accepted = await fixture.send(session.id)
    await harness.env.DB.prepare(
      'UPDATE workspaces SET runner_protocol_version = ? WHERE id = ?',
    )
      .bind(pin, WORKSPACE_ID)
      .run()
    expect(await hello(fixture, version)).toEqual({ closed: 1, messages: [] })
    expect(
      (
        await fixture.chat.readWorkspace(WORKSPACE_ID, (view) => view.pending())
      ).map(({ type }) => type),
    ).toEqual(['turn'])
    expect(
      (await fixture.history(session.id)).events.filter(
        ({ event }) => event.type === 'turn.failed',
      ),
    ).toEqual([])
    expect(await sessionRecord(fixture, session.id)).toMatchObject({
      activeTurnId: accepted.session.activeTurnId,
      retryMessageId: null,
      loginAvailable: true,
    })
  },
)
