import { expect, onTestFinished } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import { sessionPaths } from '../../src/shared/sessions'
import type { QueueTurn } from '../chat/queue-turn'
import { LIFECYCLE_FENCE_KEY } from '../members/receiver-fence'
import { heldOperation } from '../test-support/held-operation'
import { TEST_ORIGIN } from '../test-support/harness'
import { readMergeWorkspace } from '../github/merge-access'
import { createAutomaticRestart } from './automatic-restart'
import { CONTINUE_JOB_KEY, type ContinueJob } from './continue-types'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import type { backendFixture } from './backend-test-support'
import { RESTART_COMMAND, UPDATE_CHECK_COMMAND } from './software-restart'
import { expectSettled } from './start-outside.test-support'
import { readWorkspaceToken } from './tokens'

let workspaceNumber = 0

type HeldRestart = ReturnType<typeof heldOperation> & {
  restart(): Promise<unknown>
}

export async function automaticRestartFixture(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
  initialTurn: 'finished' | 'running' | 'started' = 'finished',
) {
  const { actor, id: workspaceId } = await seededCompletedWorkspace(fixture, {
    workspaceId: `automatic-restart-${++workspaceNumber}`,
  })
  const { org, runtime } = fixture
  const { peers, controls } = actor.native.api
  const token = await readWorkspaceToken(runtime.env, workspaceId)
  const now = runtime.dependencies.now
  const eventNumbers = new Map<string, number>()
  let processNumber = 0
  const connect = async (id: string, streamId = 'runner-stream') => {
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
      processStartId: `00000000-0000-4000-8000-${String(++processNumber).padStart(12, '0')}`,
      protocolVersion: 2,
    })
    const emit = (event: RunnerEvent) => {
      const eventNumber = (eventNumbers.get(streamId) ?? 0) + 1
      eventNumbers.set(streamId, eventNumber)
      return peers.receiveRunner(id, {
        type: 'event',
        streamId,
        eventNumber,
        occurredAt: now(),
        event,
      })
    }
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
  if (initialTurn === 'started')
    await first.emit({
      type: 'turn.started',
      sessionId,
      turnId,
      senderId: message.sender.id,
      startedAt: now(),
      choice: message.choice,
      messageIds: [message.id],
    })
  if (initialTurn === 'finished')
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
  const tick = (ms: number) => fixture.advanceTo(awayAt + ms, workspaceId)
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
    tick,
    originalTurnEnds: async () => {
      const { events } = await controls.history(workspaceId)
      return events
        .filter(
          ({ event }) =>
            (event.type === 'turn.completed' || event.type === 'turn.failed') &&
            event.sessionId === sessionId &&
            event.turnId === turnId,
        )
        .map(({ event, late }) => ({ event, late }))
    },
    holdRestartAccess: (): HeldRestart => {
      const held = heldOperation()
      let afterUpdateCheck = false
      fixture.boat.beforeCommand = async (command) => {
        if (command === UPDATE_CHECK_COMMAND) afterUpdateCheck = true
      }
      const storage = new Proxy(actor.storage, {
        get(target, property) {
          if (property !== 'get') return Reflect.get(target, property)
          return async (key: string) => {
            if (afterUpdateCheck && key === LIFECYCLE_FENCE_KEY) {
              afterUpdateCheck = false
              await held.wait()
            }
            return target.get(key)
          }
        },
      })
      const { chat, controller } = actor.native.api
      const run = <T>(work: (turn: QueueTurn) => Promise<T>): Promise<T> =>
        chat.runLifecycle(work)
      const restart = createAutomaticRestart({
        env: runtime.env,
        dependencies: runtime.dependencies,
        storage,
        controller,
        chat,
        run,
        refreshTerminal: async () => {},
      })
      return {
        ...held,
        restart: async () => {
          await fixture.setTime(awayAt + 180_000)
          let commands: (() => Promise<void>) | undefined
          await run(() =>
            restart((work) => {
              commands = work
            }),
          )
          if (!commands) throw new Error('The automatic restart did not start.')
          await commands()
        },
      }
    },
    holdCommand: (heldCommand: string, updateExitCode = 0) => {
      const held = heldOperation()
      fixture.boat.beforeCommand = async (command) => {
        if (command === UPDATE_CHECK_COMMAND)
          fixture.boat.synchronousExitCode = updateExitCode
        if (command === RESTART_COMMAND) fixture.boat.synchronousExitCode = 0
        if (command === heldCommand) await held.wait()
      }
      return { ...held, restart: () => tick(180_000) }
    },
    duringRestart: async <T>(
      held: HeldRestart,
      work: () => Promise<T>,
    ): Promise<T> => {
      const restarting = held.restart()
      try {
        await expectSettled(held.entered)
        return await work()
      } finally {
        held.release()
        await restarting
      }
    },
    restartFailure: () =>
      new Promise<void>((resolve) => {
        actor.observePublication(async ({ event }) => {
          if (
            event.type === 'workspace.updated' &&
            event.workspace.state === 'error'
          )
            resolve()
        })
      }),
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
        defaultBranch: 'main',
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
