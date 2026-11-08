import { afterEach, beforeAll, expect, it } from 'vitest'

import { chatHistoryPath } from '../../../src/shared/events'
import { workspacePath, workspacePaths } from '../../../src/shared/workspaces'
import { sandboxProvider } from '../../sandbox/client'
import type { WorkspaceStartResult } from '../../lifecycle/start-types'
import { orgEnvironmentContext } from '../../lifecycle/settings-data'
import { encrypt } from '../../security/crypto'
import { readWorkspaceToken } from '../../lifecycle/tokens'
import { closeSockets } from '../adapter-sockets.test-support'
import { record } from '../inputs'
import { array } from '../agent-events'
import { outerWorkerBundle } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import {
  reviewWorkspaceFixture,
  driveToRunningStartup,
  type ReviewWorkspaceFixture,
} from './workspace-review.test-support'
import {
  driveWorkspaceStart,
  prepareWorkspaceStart,
} from './workspace-start.test-support'
import { connectShellRunner } from './shell-runner.test-support'

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

async function setStartLogSecret(active: ReviewWorkspaceFixture) {
  const ciphertext = await encrypt(
    JSON.stringify({ APP_SECRET: 'ordered-log-secret' }),
    orgEnvironmentContext(OUTER_ORG),
    active.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await active.env.DB.prepare(
    'UPDATE settings SET env_vars_ciphertext = ? WHERE org_id = ?',
  )
    .bind(ciphertext, OUTER_ORG)
    .run()
}

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
  await setStartLogSecret(active)
  active.boat.commandOutput = 'failed ordered-log-secret'
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
    expect((await active.actor().readLifecycle())?.error).toMatchObject({
      code: 'workspace_start_failed',
      log: null,
    })
    const failed = await active.request(
      workspacePath(OUTER_ORG, OUTER_WORKSPACE),
    )
    expect(failed.status).toBe(200)
    const failedBody: unknown = await failed.json()
    expect(failedBody).toMatchObject({
      workspace: { id: OUTER_WORKSPACE, state: 'error' },
      error: { code: 'workspace_start_failed', log: 'failed [hidden]' },
    })
    expect(JSON.stringify(failedBody)).not.toContain('ordered-log-secret')
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
    await prepareWorkspaceStart(active.actor())
    const retryRunner = await connectShellRunner(
      active,
      OUTER_WORKSPACE,
      await readWorkspaceToken(active.env, OUTER_WORKSPACE),
      'response-retry-stream',
    )
    try {
      expect(await retryRunner.inbox.next()).toMatchObject({ type: 'welcome' })
      retryRunner.emit({ type: 'runner.ready' })
      expect(await retryRunner.inbox.next()).toMatchObject({
        type: 'confirm',
        throughEventNumber: 1,
      })
      expect(
        await driveWorkspaceStart<WorkspaceStartResult<unknown>>(
          active.actor(),
          active.actor().waitLifecycleStart(),
        ),
      ).toEqual({ ok: true })
    } finally {
      await closeSockets(retryRunner.socket)
    }
  } finally {
    active.boat.commandRunning = false
    active.boat.commandExitCode = 0
    await startup
    await active.actor().advanceStartAlarm()
    await resuming
  }
})

it('numbers a fresh workspace snapshot when Stop follows the first lifecycle read', async () => {
  const active = (fixture = await reviewWorkspaceFixture(bundle))
  await active.actor().stopAfterNextRead()
  const response = await active.request(
    workspacePath(OUTER_ORG, OUTER_WORKSPACE),
  )
  expect(response.status).toBe(200)
  const body = record(await response.json())
  const browser = await active.browser()
  expect(body).toMatchObject({
    workspace: { id: OUTER_WORKSPACE, state: 'stopped' },
    start: { kind: 'create' },
    error: null,
    eventNumber: browser.history.throughEventNumber,
  })
  const stored = array(browser.history.events, record)
  expect(stored.at(-1)).toMatchObject({
    eventNumber: body.eventNumber,
  })
  expect(
    stored
      .filter((envelope) => record(envelope.event).type === 'workspace.updated')
      .at(-1),
  ).toMatchObject({
    event: { type: 'workspace.updated', workspace: { state: 'stopped' } },
  })
})
