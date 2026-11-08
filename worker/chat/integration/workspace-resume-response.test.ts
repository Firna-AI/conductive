import { afterEach, beforeAll, expect, it } from 'vitest'

import { chatHistoryPath } from '../../../src/shared/events'
import { workspacePath, workspacePaths } from '../../../src/shared/workspaces'
import { sandboxProvider } from '../../sandbox/client'
import type { WorkspaceStartResult } from '../../lifecycle/start-types'
import { record } from '../inputs'
import { array } from '../agent-events'
import { outerWorkerBundle } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import {
  reviewWorkspaceFixture,
  driveToRunningStartup,
  type ReviewWorkspaceFixture,
} from './workspace-review.test-support'
import { driveWorkspaceStart } from './workspace-start.test-support'

let bundle: string
let fixture: ReviewWorkspaceFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/workspace-review-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('answers resume and retry with durable starting state while chat and startup failure stay on the event path', async () => {
  const active = (fixture = await reviewWorkspaceFixture(bundle))
  active.runner.emit({
    type: 'assistant.delta',
    sessionId: 'first-session',
    turnId: 'first-turn',
    messageId: 'retained-answer',
    text: 'Keep this chat during resume',
  })
  await active.runner.inbox.next()
  active.runner.emit({
    type: 'turn.completed',
    sessionId: 'first-session',
    turnId: 'first-turn',
    state: 'finished',
    durationMs: 1,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['first-message'],
  })
  await active.runner.inbox.next()
  await sandboxProvider(active.env, active.boat.fetch).stop('bx_lifecycle')
  await active.actor().lifecycleStopped()
  await active.runner.closed
  await active.browser()
  const opened = await active.request(workspacePath(OUTER_ORG, OUTER_WORKSPACE))
  expect(opened.status).toBe(200)
  expect(await opened.json()).toMatchObject({
    workspace: { id: OUTER_WORKSPACE, state: 'stopped' },
  })
  active.boat.commandRunning = true
  const resuming = active.request(
    workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: '{}' },
  )
  await active.actor().waitForQueuedStart(0)
  const startup = driveToRunningStartup(active.actor())
  try {
    const first = await Promise.race([
      resuming.then((response) => ({ kind: 'reply' as const, response })),
      startup.then(() => ({ kind: 'startup' as const })),
    ])
    expect(first.kind).toBe('reply')
    if (first.kind !== 'reply')
      throw new Error('The early resume reply is missing.')
    expect(first.response.status).toBe(200)
    expect(await first.response.json()).toMatchObject({
      workspace: { id: OUTER_WORKSPACE, state: 'starting' },
      start: { kind: 'resume' },
      error: null,
    })
    await startup
    const chat = await active.request(
      chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
    )
    expect(chat.status).toBe(200)
    expect(await chat.json()).toMatchObject({
      events: expect.arrayContaining([
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'assistant.delta',
            text: 'Keep this chat during resume',
          }),
        }),
      ]),
    })
    const progress = await active.browser()
    expect(
      array(progress.history.events, record).some((envelope) => {
        const event = record(envelope.event)
        return (
          event.type === 'start.updated' &&
          array(record(event.start).steps, record).some(
            (step) => step.id === 'startup' && step.state === 'running',
          )
        )
      }),
    ).toBe(true)
    active.boat.commandRunning = false
    active.boat.commandExitCode = 1
    await active.actor().advanceStartAlarm()
    expect(await active.actor().waitLifecycleStart()).toMatchObject({
      ok: false,
      error: { code: 'workspace_start_failed' },
    })
    const failed = await active.request(
      workspacePath(OUTER_ORG, OUTER_WORKSPACE),
    )
    expect(failed.status).toBe(200)
    expect(await failed.json()).toMatchObject({
      workspace: { id: OUTER_WORKSPACE, state: 'error' },
      error: { code: 'workspace_start_failed' },
    })
    const stored = await active.browser()
    expect(
      array(stored.history.events, record).some((envelope) => {
        const event = record(envelope.event)
        return (
          event.type === 'workspace.updated' &&
          record(event.workspace).state === 'error'
        )
      }),
    ).toBe(true)
    active.boat.commandExitCode = 0
    const retrying = active.request(
      workspacePaths.resume(OUTER_ORG, OUTER_WORKSPACE),
      { method: 'POST', body: '{}' },
    )
    await active.actor().waitForQueuedStart(1)
    const retryResponse = await retrying
    expect(retryResponse.status).toBe(200)
    expect(await retryResponse.json()).toMatchObject({
      workspace: { id: OUTER_WORKSPACE, state: 'starting' },
      error: null,
    })
    expect(
      await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
        active.actor(),
        active.actor().waitLifecycleStart(),
      ),
    ).toEqual({ ok: true })
  } finally {
    active.boat.commandRunning = false
    active.boat.commandExitCode = 0
    await startup
    await active.actor().advanceStartAlarm()
    await resuming
  }
})
