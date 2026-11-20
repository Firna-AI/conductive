import { expect, it } from 'vitest'

import { WORKSPACE_ID } from './harness.test-support'
import { setupProviderStopTests } from './provider-stop.test-support'
import { lifecycleSnapshot, terminalEvent } from './turn-lifecycle.test-support'

const fixtureForTest = setupProviderStopTests()

it('anchors a late-answer-only chain at its turn creation and preserves that anchor after a later app notice', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  const answerAt = fixture.clock.now()
  const record = {
    orgId: fixture.org.id,
    names: ['TOKEN'],
    tokenHash: 'unused',
    request: {
      id: 'late-answer',
      workspaceId: WORKSPACE_ID,
      sessionId: session.id,
      turnId: 'ended-turn',
      sender: {
        ...fixture.owner,
        githubLogin: 'octocat',
        displayName: 'Octocat',
        avatarUrl: null,
      },
      secrets: [],
      reason: '',
      command: 'deploy',
      state: 'allowed' as const,
      late: true,
      createdAt: answerAt - 1_000,
      updatedAt: answerAt,
      answeredBy: {
        ...fixture.member,
        githubLogin: 'teammate',
        displayName: 'Teammate',
        avatarUrl: null,
      },
      lifetime: null,
      endedBy: null,
      notice: null,
    },
  }
  const notice = await fixture.chat.runLifecycle(() =>
    fixture.chat.secretNotice(record),
  )
  expect(notice).toMatchObject({ state: 'sent' })
  await fixture.chat.flushRunner()
  await fixture.drain()
  const command = fixture.runner.commands.find(
    (command) => command.type === 'turn',
  )
  if (command?.type !== 'turn') throw new Error('Missing late answer turn')
  fixture.runner.emit({
    type: 'turn.started',
    sessionId: session.id,
    turnId: command.turnId,
    senderId: fixture.owner.id,
    choice: session.choice,
    startedAt: answerAt,
    messageIds: [command.message.id],
  })
  await fixture.drain()
  expect((await lifecycleSnapshot(fixture)).turns).toMatchObject([
    { chainStartedAt: answerAt },
  ])
  await fixture.changeWorkspace(WORKSPACE_ID, async (view) => {
    const turn = await view.turn(command.turnId)
    const message = await view.message(command.message.id)
    if (!turn || !message) throw new Error('Missing legacy late-answer turn')
    delete turn.chainStartedAt
    message.createdAt = answerAt - 2_592_000_000
    await view.saveMessage(message)
    await view.saveTurn(turn)
  })
  await fixture.chat.runLifecycle(() =>
    fixture.chat.secretNotice({
      ...record,
      request: { ...record.request, id: 'later-app-notice' },
    }),
  )
  fixture.runner.emit(terminalEvent(command, 'finished'))
  await fixture.drain()
  const unanswered = fixture.runner.commands.find(
    (command) =>
      command.type === 'turn' &&
      command.message.id === 'secret-notice:later-app-notice',
  )
  if (unanswered?.type !== 'turn')
    throw new Error('Missing unanswered notice turn')
  await fixture.stopForProvider()
  const state = await lifecycleSnapshot(fixture)
  expect(state.turns).toMatchObject([
    { state: 'finished' },
    { state: 'stopped', chainStartedAt: answerAt - 2_592_000_000 },
  ])
  expect(
    (await fixture.history(session.id)).events.map(({ event }) => event),
  ).toContainEqual({
    type: 'turn.continued',
    sessionId: session.id,
    previousTurnId: unanswered.turnId,
    turnId: null,
    next: 'message',
  })
})
