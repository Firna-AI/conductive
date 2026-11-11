import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { endpointModelApi } from '../app-api/endpoint-models.test-support'
import {
  runningGatewayTurn,
  turnEnds,
} from '../model-gateway/fixture.test-support'
import { deferred } from '../model-gateway/http.test-support'
import { FakeRunner } from '../test-support/fake-runner'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  CLAUDE,
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
} from './harness.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('starts discovery in the background for the login owner without delaying the turn', async () => {
  const fixture = await createChatFixture(harness)
  const api = endpointModelApi(harness)
  await api.save(fixture.memberCookie)
  await fixture.clock.advance(600_000)
  const started = deferred<void>()
  const pending = deferred<Response>()
  api.upstream.responseFactories.push(() => {
    started.resolve()
    return pending.promise
  })
  harness.setNativeFetch((request) =>
    new URL(request.url).hostname === 'proxy.example.test'
      ? api.upstream.fetch(request)
      : harness.github.fetch(request),
  )
  const session = await fixture.createSession(CLAUDE, fixture.memberCookie)
  const runner = await fixture.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, protocolVersion: 2 }),
  )
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  await fixture.send(session.id, 'background-models', fixture.ownerCookie)
  const command = runner.commands.find((command) => command.type === 'turn')
  expect(command).toMatchObject({
    type: 'turn',
    message: { id: 'background-models' },
  })
  await started.promise
  expect(api.upstream.requests).toHaveLength(2)
  expect(
    (await api.account(fixture.memberCookie)).agentLogins[0],
  ).toMatchObject({
    modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
  })
  pending.resolve(Response.json({ data: [{ id: 'other-claude' }] }))
  await fixture.drainAttachments()
  expect(
    (await api.account(fixture.memberCookie)).agentLogins[0],
  ).toMatchObject({
    modelList: { missing: ['test-claude'], checkedAt: TEST_TIME + 600_000 },
  })
  expect(
    (await api.account(fixture.ownerCookie)).agentLogins[0],
  ).not.toHaveProperty('modelList')
  const history = await fixture.history(session.id)
  const sessions = history.events.flatMap(({ event }) =>
    event.type === 'session.updated' ? [event.session] : [],
  )
  expect(sessions.length).toBeGreaterThan(0)
  for (const session of sessions) {
    expect(session).not.toHaveProperty('modelList')
    expect(session).not.toHaveProperty('endpoint')
    expect(session).not.toHaveProperty('host')
  }
})

it.each([
  { choice: CLAUDE, kind: 'endpoint' as const },
  { choice: CODEX, kind: 'endpoint' as const },
  { choice: CLAUDE, kind: 'api-key' as const },
  { choice: CODEX, kind: 'api-key' as const },
])(
  'uses the $choice.agent $kind model failure text for the dispatched turn',
  async ({ choice, kind }) => {
    const { fixture, runner, turn, session } = await runningGatewayTurn(
      harness,
      choice,
      { protocolVersion: 2, kind },
    )
    await fixture.changeWorkspace(WORKSPACE_ID, async (transaction) => {
      const current = await transaction.session(session.id)
      if (!current) throw new Error('The session is missing.')
      current.choice = { ...choice, model: 'next-model' }
      await transaction.saveSession(current)
    })

    const original = 'The selected model is unavailable. Choose another model.'
    runner.emit({
      type: 'turn.failed',
      sessionId: session.id,
      turnId: turn.turnId,
      error: { code: 'agent_model_unavailable', message: original },
      retryMessageId: turn.message.id,
      durationMs: 25,
    })
    await fixture.drain()
    const error = {
      code: 'agent_model_unavailable',
      message:
        kind === 'endpoint'
          ? `The endpoint of this login does not serve ${choice.model}. Choose another model.`
          : original,
    }
    const history = await fixture.history(session.id)
    expect(turnEnds(history)).toMatchObject([
      { event: { type: 'turn.failed', error } },
    ])
    expect(
      await fixture.chat.store.read(
        WORKSPACE_ID,
        async (view) => (await view.turn(turn.turnId))?.error,
      ),
    ).toEqual(error)
    expect(JSON.stringify(history)).not.toContain('proxy.example.test')
  },
)

it.each([CLAUDE, CODEX])(
  'names the active $agent model after a sent model change',
  async (choice) => {
    const { fixture, runner, turn, session } = await runningGatewayTurn(
      harness,
      choice,
      { protocolVersion: 2, kind: 'endpoint' },
    )
    const changed = await fixture.fetch(
      sessionPaths.model(fixture.org.id, WORKSPACE_ID, session.id),
      {
        choice: { ...choice, model: 'changed-model' },
        draft: { text: '', attachmentIds: [] },
      },
      fixture.memberCookie,
      'PUT',
    )
    expect(changed.status).toBe(200)
    expect(runner.commands).toContainEqual(
      expect.objectContaining({
        type: 'model',
        choice: { ...choice, model: 'changed-model' },
      }),
    )
    runner.emit({
      type: 'turn.started',
      sessionId: session.id,
      turnId: turn.turnId,
      senderId: turn.message.sender.id,
      choice,
      startedAt: TEST_TIME,
      messageIds: [turn.message.id],
    })
    runner.emit({
      type: 'turn.failed',
      sessionId: session.id,
      turnId: turn.turnId,
      error: {
        code: 'agent_model_unavailable',
        message: 'The selected model is unavailable. Choose another model.',
      },
      retryMessageId: turn.message.id,
      durationMs: 25,
    })
    await fixture.drain()
    const model = choice.agent === 'claude' ? 'changed-model' : 'test-codex'
    expect(turnEnds(await fixture.history(session.id))).toMatchObject([
      {
        event: {
          error: {
            code: 'agent_model_unavailable',
            message: `The endpoint of this login does not serve ${model}. Choose another model.`,
          },
        },
      },
    ])
  },
)
