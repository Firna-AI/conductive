import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { captureEnvironment, outputFixture } from './runner-output.test-support'
import { WORKSPACE_ID } from './harness.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('filters an older runner with no private list from the actual start capture and keeps public values visible', async () => {
  const f = await outputFixture(harness, { OLD_TOKEN: 'org-private-value' })
  const tab = await f.tab()
  await harness.env.DB.prepare(
    'UPDATE settings SET env_vars_ciphertext = NULL WHERE org_id = ?',
  )
    .bind(f.org.id)
    .run()
  await f.emit({
    type: 'workspace.title',
    name: 'org-private-value production',
  })
  const first = await f.chat.store.read(WORKSPACE_ID, (view) => view.history(0))
  expect(first.events.at(-1)?.event).toEqual({
    type: 'workspace.title',
    name: '[redacted] production',
  })
  await captureEnvironment(f, {
    PRIVATE: { value: 'org-private-value', secret: true },
    SHORT: { value: 'a', secret: true },
    PUBLIC: { value: 'production', secret: false },
  })
  await f.emit({
    type: 'assistant.completed',
    ...f.context,
    messageId: 'answer-a',
    text: 'org-private-value production a',
    userMessageIds: [f.messageId],
  })
  await f.emit({
    type: 'tool.updated',
    ...f.context,
    tool: {
      id: 'tool-a',
      kind: 'read',
      target: 'org-private-value',
      detail: 'production a',
      omittedDetailBytes: 7,
      state: 'done',
    },
  })
  await f.emit({
    type: 'files.snapshot',
    tree: {
      revision: 1,
      partNumber: 1,
      partCount: 1,
      entries: [
        {
          path: 'org-private-value.txt',
          name: 'org-private-value.txt',
          kind: 'file',
          change: null,
        },
      ],
    },
  })
  await f.emit({
    type: 'changes.updated',
    changes: {
      revision: 1,
      partNumber: 1,
      partCount: 1,
      baseBranch: 'org-private-value',
      files: [
        {
          path: 'org-private-value.txt',
          previousPath: 'a.txt',
          change: 'renamed',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
      ],
      summary: { files: 1, added: 1, removed: 0 },
    },
  })
  await f.emit({
    type: 'start.updated',
    start: {
      kind: 'resume',
      startedAt: 25,
      steps: [
        {
          id: 'a',
          label: 'org-private-value',
          state: 'completed',
          startedAt: 25,
          completedAt: 25,
        },
      ],
    },
  })
  await f.emit({
    type: 'turn.failed',
    ...f.context,
    error: { code: 'failed-a', message: 'org-private-value production a' },
    retryMessageId: f.messageId,
    durationMs: 0,
  })
  const history = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.history(0),
  )
  const events = history.events.map(({ event }) => event)
  expect(events).toContainEqual({
    type: 'assistant.completed',
    ...f.context,
    messageId: 'answer-a',
    text: '[redacted] production [redacted]',
    userMessageIds: [f.messageId],
  })
  expect(events).toContainEqual({
    type: 'tool.updated',
    ...f.context,
    tool: {
      id: 'tool-a',
      kind: 'read',
      target: '[redacted]',
      detail: 'production [redacted]',
      omittedDetailBytes: 7,
      state: 'done',
    },
  })
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'files.snapshot',
      tree: expect.objectContaining({
        entries: [
          {
            path: 'org-private-value.txt',
            displayPath: '[redacted].txt',
            name: '[redacted].txt',
            kind: 'file',
            change: null,
          },
        ],
      }),
    }),
  )
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'changes.updated',
      changes: expect.objectContaining({
        baseBranch: 'org-private-value',
        displayBaseBranch: '[redacted]',
        files: [
          {
            path: 'org-private-value.txt',
            displayPath: '[redacted].txt',
            previousPath: 'a.txt',
            previousDisplayPath: '[redacted].txt',
            change: 'renamed',
            added: 1,
            removed: 0,
            uncommitted: true,
          },
        ],
      }),
    }),
  )
  expect(events).toContainEqual({
    type: 'start.updated',
    start: {
      kind: 'resume',
      startedAt: 25,
      steps: [
        {
          id: 'a',
          label: '[redacted]',
          state: 'completed',
          startedAt: 25,
          completedAt: 25,
        },
      ],
    },
  })
  expect(events).toContainEqual({
    type: 'turn.failed',
    ...f.context,
    error: { code: 'failed-a', message: '[redacted] production [redacted]' },
    retryMessageId: f.messageId,
    durationMs: 0,
  })
  const displayed = tab.messages.filter(
    (message) =>
      message.type === 'event' &&
      message.envelope.event.type !== 'files.snapshot' &&
      message.envelope.event.type !== 'changes.updated',
  )
  expect(JSON.stringify(displayed)).not.toContain('org-private-value')
  tab.close()
})
