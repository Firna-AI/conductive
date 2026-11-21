import { expect, onTestFinished } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import { sessionPaths } from '../../src/shared/sessions'
import { TEST_ORIGIN } from '../test-support/harness'
import { readMergeWorkspace } from '../github/merge-access'
import { CONTINUE_JOB_KEY, type ContinueJob } from './continue-types'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import type { backendFixture } from './backend-test-support'
import { RESTART_COMMAND, UPDATE_CHECK_COMMAND } from './software-restart'
import { readWorkspaceToken } from './tokens'

let workspaceNumber = 0

export async function automaticRestartFixture(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
  keepRunning = false,
) {
  const { actor, id: workspaceId } = await seededCompletedWorkspace(fixture, {
    workspaceId: `automatic-restart-${++workspaceNumber}`,
  })
  const { org, runtime } = fixture
  const { peers, controls } = actor.native.api
  const token = await readWorkspaceToken(runtime.env, workspaceId)
  const now = runtime.dependencies.now
  const connect = async (id: string) => {
    const streamId = `stream-${id}`
    let eventNumber = 0
    await peers.connectRunner(id, {
      url: `${runtime.env.MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (id !== 'original')
      onTestFinished(async () => {
        await peers.close(id)
        await controls.drain()
      })
    await peers.receiveRunner(id, {
      type: 'hello',
      workspaceId,
      streamId,
      protocolVersion: 2,
    })
    const emit = (event: RunnerEvent) =>
      peers.receiveRunner(id, {
        type: 'event',
        streamId,
        eventNumber: ++eventNumber,
        occurredAt: now(),
        event,
      })
    return {
      emit,
      ready: () => emit({ type: 'runner.ready' }),
      take: async () => (await peers.take(id)).messages,
    }
  }
  const first = await connect('original')
  await first.ready()
  const firstTurn = (await first.take()).find((value) => value.type === 'turn')
  if (!firstTurn) throw new Error('The first turn was not delivered.')
  const { sessionId, turnId, message } = firstTurn
  if (!keepRunning)
    await first.emit({
      type: 'turn.completed',
      sessionId,
      turnId,
      state: 'finished',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [message.id],
    })
  await peers.close('original')
  await controls.drain()
  const awayAt = now()
  return {
    actor,
    fixture,
    lifecycle: () => actor.endpoint().readLifecycle(),
    commands: () =>
      fixture.boat.commands.filter(
        (command) =>
          command === UPDATE_CHECK_COMMAND || command === RESTART_COMMAND,
      ),
    awayAt,
    connect,
    firstTurn,
    setOffset: (ms: number) => fixture.setTime(awayAt + ms),
    tick: (ms: number) => fixture.advanceTo(awayAt + ms, workspaceId),
    send: async (id = 'waiting-message') => {
      const response = await actor.native.fetch(
        new Request(
          `${TEST_ORIGIN}${sessionPaths.messages(org.id, workspaceId, sessionId)}`,
          {
            method: 'POST',
            headers: {
              Cookie: fixture.session,
              Origin: TEST_ORIGIN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id,
              text: 'Send this after the runner returns.',
              choice: message.choice,
              attachmentIds: [],
            }),
          },
        ),
      )
      expect(response.status).toBe(202)
      expect(await response.json()).toMatchObject({
        message: { id, state: 'queued' },
      })
    },
    reserveContinue: async () => {
      await runtime.env.DB.prepare(
        `INSERT INTO github_installations (id, account_login, account_type, created_at)
         SELECT installation_id, 'example', 'Organization', ? FROM repositories WHERE id = ?`,
      )
        .bind(now(), fixture.repositoryId)
        .run()
      const binding = await readMergeWorkspace(
        runtime.env.DB,
        org.id,
        workspaceId,
        fixture.user.id,
      )
      await actor.storage.put(CONTINUE_JOB_KEY, {
        id: 'continue-one',
        binding,
        repositoryId: fixture.repositoryId,
        sandboxId: 'bx_1',
        providerAccount: 'boat',
        member: fixture.user,
        request: { expectedBranch: binding.branch },
        branch: 'octocat/next',
        baseBranch: 'main',
        directory: '/home/user/code/repository',
        phase: 'resume',
        resumeQueued: true,
        commandStarted: false,
        processId: null,
        fetchId: 'continue-fetch',
        stdoutOffset: 0,
        stderrOffset: 0,
      } satisfies ContinueJob)
    },
  }
}
