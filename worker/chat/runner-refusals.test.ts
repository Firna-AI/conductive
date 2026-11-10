import { expect, it } from 'vitest'
import { RUNNER_EVENT_MAX_BYTES } from '../../src/shared/runner'
import { createRunnerLimitsFixture } from './runner-limits.test-support'
import { context } from './runner-fixtures.test-support'
it('stores one permanent marker per refusal and advances through duplicate, gap, and restart', async () => {
  const fixture = await createRunnerLimitsFixture()
  const invalid = { type: 'sdk.raw', ...context, secret: 'never store this' }
  const error = await fixture.receive(1, invalid).then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeNull()
  await fixture.receive(1, invalid)
  await fixture.receive(3, { type: 'sdk.gap', secret: 'unparsed gap data' })
  expect(fixture.sent.slice(-3)).toEqual([
    { type: 'confirm', streamId: 'stream', throughEventNumber: 1 },
    { type: 'confirm', streamId: 'stream', throughEventNumber: 1 },
    { type: 'resend', streamId: 'stream', fromEventNumber: 2 },
  ])
  await fixture.connect('stream', true)
  await fixture.receive(2, {
    type: 'turn.thinking',
    sessionId: 'missing',
    turnId: 'missing',
  })
  await fixture.receive(3, { type: 'workspace.title', name: 'Later' })
  expect((await fixture.history()).events.map(({ event }) => event)).toEqual([
    {
      type: 'runner.event-refused',
      streamId: 'stream',
      runnerEventNumber: 1,
      runnerEventType: 'unknown',
      reason: 'invalid',
      ...context,
    },
    {
      type: 'runner.event-refused',
      streamId: 'stream',
      runnerEventNumber: 2,
      runnerEventType: 'turn.thinking',
      reason: 'turn_not_active',
      sessionId: null,
      turnId: null,
    },
    { type: 'workspace.title', name: 'Later' },
  ])
  expect(
    JSON.stringify([...(await fixture.snapshot()).records.values()]),
  ).not.toContain('never store this')
  expect(fixture.closed).toBe(0)
})
it('measures raw compact UTF-8 envelopes including escaped and discarded fields', async () => {
  const fixture = await createRunnerLimitsFixture()
  const event = { type: 'turn.thinking', ...context }
  const envelope = {
    type: 'event',
    streamId: 'stream',
    eventNumber: 1,
    occurredAt: 25,
    event,
    extra: '',
  }
  const bytes = new TextEncoder().encode(JSON.stringify(envelope)).length
  const exact = {
    ...envelope,
    extra: 'x'.repeat(RUNNER_EVENT_MAX_BYTES - bytes),
  }
  await fixture.raw(exact)
  const oversized = {
    ...exact,
    eventNumber: 2,
    extra: `${exact.extra.slice(0, -5)}🙂\n`,
  }
  const serialized = JSON.stringify(oversized)
  expect(new TextEncoder().encode(serialized).byteLength).toBe(
    RUNNER_EVENT_MAX_BYTES + 1,
  )
  expect(serialized.length).toBe(RUNNER_EVENT_MAX_BYTES - 1)
  await fixture.raw(oversized)
  expect((await fixture.history()).events.map(({ event }) => event)).toEqual([
    event,
    {
      type: 'runner.event-refused',
      streamId: 'stream',
      runnerEventNumber: 2,
      runnerEventType: 'turn.thinking',
      reason: 'too_large',
      ...context,
    },
  ])
})
it('commits refusal and verified terminal cleanup together and retries storage or network failure', async () => {
  for (const type of ['turn.completed', 'turn.failed']) {
    const fixture = await createRunnerLimitsFixture()
    const terminal = { type, ...context, state: 'finished' }
    await fixture.read((view) =>
      view.saveCommand({
        type: 'interrupt',
        commandId: 'pending-stop',
        ...context,
      }),
    )
    await fixture.failCursorCommit(1)
    await expect(fixture.receive(1, terminal)).rejects.toThrow(
      'Injected storage failure',
    )
    expect(fixture.closed).toBe(1)
    expect(fixture.sent).toHaveLength(1)
    expect((await fixture.history()).events).toEqual([])
    expect(
      (await fixture.read((view) => view.turn(context.turnId)))?.state,
    ).toBe('running')
    await fixture.clearFaults()
    await fixture.connect('stream', true)
    await fixture.setFailSend(true)
    await expect(fixture.receive(1, terminal)).rejects.toThrow(
      'Injected network failure',
    )
    expect(fixture.closed).toBe(2)
    expect(
      (await fixture.read((view) => view.session(context.sessionId)))
        ?.activeTurnId,
    ).toBeNull()
    expect(await fixture.read((view) => view.pending())).toEqual([])
    await fixture.setFailSend(false)
    await fixture.connect('stream', true)
    await fixture.receive(1, terminal)
    expect(
      (await fixture.history()).events.map(({ event }) => event.type),
    ).toEqual(['runner.event-refused', 'session.updated'])
    expect(fixture.sent.at(-1)).toEqual({
      type: 'confirm',
      streamId: 'stream',
      throughEventNumber: 1,
    })
  }
})
it('refuses late invalid message acknowledgements without partial writes', async () => {
  const fixture = await createRunnerLimitsFixture()
  await fixture.read(async (view) => {
    const turn = await view.turn(context.turnId)
    if (!turn) throw new Error('Missing seeded turn')
    turn.messageIds = ['valid']
    await view.saveTurn(turn)
    await view.saveMessage({
      id: 'valid',
      sessionId: context.sessionId,
      text: 'Hello',
      attachments: [],
      choice: { agent: 'claude', model: 'test', effort: 'high' },
      createdAt: 25,
      state: 'queued',
      sender: {
        id: 'sender',
        githubLogin: 'sender',
        displayName: 'Sender',
        avatarUrl: '',
      },
    })
    await view.saveCommand({
      type: 'message',
      commandId: 'pending',
      ...context,
      messageId: 'valid',
      attachments: [],
    })
  })
  const error = await fixture
    .receive(1, {
      type: 'assistant.completed',
      ...context,
      messageId: 'answer',
      text: 'Done',
      userMessageIds: ['valid', '\ud800'],
    })
    .then(
      () => null,
      (e: unknown) => e,
    )
  expect(error).toBeNull()
  expect((await fixture.read((view) => view.message('valid')))?.state).toBe(
    'queued',
  )
  expect(
    (await fixture.read((view) => view.pending())).map(
      (command) => command.commandId,
    ),
  ).toEqual(['pending'])
  expect(
    (await fixture.history()).events.map(({ event }) => event.type),
  ).toEqual(['runner.event-refused'])
})
it('keeps workspace refusal context null when extra fields name an active turn', async () => {
  const fixture = await createRunnerLimitsFixture()
  await fixture.receive(1, { type: 'workspace.title', ...context, name: null })
  await fixture.receive(2, {
    type: 'turn.completed',
    sessionId: context.sessionId,
    turnId: 'foreign',
  })
  expect((await fixture.history()).events.map(({ event }) => event)).toEqual([
    {
      type: 'runner.event-refused',
      streamId: 'stream',
      runnerEventNumber: 1,
      runnerEventType: 'workspace.title',
      reason: 'invalid',
      sessionId: null,
      turnId: null,
    },
    {
      type: 'runner.event-refused',
      streamId: 'stream',
      runnerEventNumber: 2,
      runnerEventType: 'turn.completed',
      reason: 'invalid',
      sessionId: null,
      turnId: null,
    },
  ])
  expect(
    (await fixture.read((view) => view.session(context.sessionId)))
      ?.activeTurnId,
  ).toBe(context.turnId)
  expect((await fixture.read((view) => view.turn(context.turnId)))?.state).toBe(
    'running',
  )
})
