import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import {
  WorkspaceEventJournal,
  type LifecyclePublication as WorkspaceResponse,
} from './durable-journal'
import { nativeLifecycleStorage } from './native-storage.test-support'
import type { WorkspaceEventPublication } from './workspace-platform'

it.each([{ kind: 'resume' }, { kind: 'create' }] as const)(
  'publishes only the saved $kind error and its clearing, with ordered steps and durable suppression',
  async ({ kind }) => {
    const { storage } = await nativeLifecycleStorage()
    const events: WorkspaceEventPublication[] = []
    const publish = async (event: WorkspaceEventPublication) => {
      events.push(structuredClone(event))
    }
    const failed = {
      workspace: {
        id: 'workspace-one',
        orgId: 'org-one',
        repositoryId: 'repository-one',
        sectionId: 'general',
        owner: {
          id: 'sender-one',
          githubLogin: 'octocat',
          displayName: null,
          avatarUrl: null,
        },
        name: 'Saved work',
        branch: 'octocat/saved-work',
        choice: { agent: 'codex', model: 'gpt-5.5', effort: 'high' },
        state: 'error',
        createdAt: TEST_TIME - 1_200_000,
        updatedAt: TEST_TIME,
        archivedAt: null,
        restoreUntil: null,
      },
      start: {
        kind,
        startedAt: TEST_TIME - 1_200_000,
        steps: [
          {
            id: 'startup',
            label: 'Running the startup script',
            state: 'failed',
            startedAt: TEST_TIME - 1_199_000,
            completedAt: TEST_TIME,
          },
        ],
      },
      error: {
        code: 'workspace_start_failed',
        message:
          'The cloud computer did not start within the 20-minute limit. Try again.',
        log: 'Private output with secret=do-not-publish.',
      },
    } satisfies WorkspaceResponse
    const journal = new WorkspaceEventJournal(storage, publish)
    await journal.publishLifecycle(failed, TEST_TIME)
    const reconstructed = new WorkspaceEventJournal(storage, publish)
    await reconstructed.publishLifecycle(failed, TEST_TIME + 1)
    const cleared = { ...failed, error: null }
    await reconstructed.publishLifecycle(cleared, TEST_TIME + 2)
    const expected: WorkspaceEventPublication[] = [
      {
        workspaceId: 'workspace-one',
        occurredAt: TEST_TIME,
        event: {
          type: 'workspace.updated',
          workspace: failed.workspace,
          error: {
            code: 'workspace_start_failed',
            message:
              'The cloud computer did not start within the 20-minute limit. Try again.',
          },
        },
      },
      {
        workspaceId: 'workspace-one',
        occurredAt: TEST_TIME,
        event: { type: 'start.updated', start: failed.start },
      },
      {
        workspaceId: 'workspace-one',
        occurredAt: TEST_TIME + 2,
        event: {
          type: 'workspace.updated',
          workspace: failed.workspace,
          error: null,
        },
      },
      {
        workspaceId: 'workspace-one',
        occurredAt: TEST_TIME + 2,
        event: { type: 'start.updated', start: failed.start },
      },
    ]
    expect(events).toEqual(
      kind === 'create'
        ? [expected[1], expected[0], expected[3], expected[2]]
        : expected,
    )
  },
)

it('publishes a warning clear and suppresses timestamp-only polls after reconstruction', async () => {
  const { storage } = await nativeLifecycleStorage()
  const events: WorkspaceEventPublication[] = []
  const publish = async (event: WorkspaceEventPublication) => {
    events.push(structuredClone(event))
  }
  const workspace = {
    id: 'workspace-one',
    orgId: 'org-one',
    repositoryId: 'repository-one',
    sectionId: 'general',
    owner: {
      id: 'sender-one',
      githubLogin: 'octocat',
      displayName: null,
      avatarUrl: null,
    },
    name: 'Saved work',
    branch: 'octocat/saved-work',
    choice: { agent: 'codex', model: 'gpt-5.5', effort: 'high' },
    state: 'stopped',
    createdAt: TEST_TIME - 1_200_000,
    updatedAt: TEST_TIME,
    archivedAt: null,
    restoreUntil: null,
    softwareUpdateFailed: true,
  } satisfies WorkspaceResponse['workspace'] & { softwareUpdateFailed: boolean }
  const error = {
    code: 'workspace_start_failed',
    message: 'The cloud computer could not start. Try again.',
  }
  const warned = {
    workspace,
    start: null,
    error: { ...error, log: 'Private saved output.' },
  } satisfies WorkspaceResponse
  await new WorkspaceEventJournal(storage, publish).publishLifecycle(
    warned,
    TEST_TIME,
  )
  const cleared = {
    ...warned,
    workspace: { ...workspace, softwareUpdateFailed: false },
  }
  await new WorkspaceEventJournal(storage, publish).publishLifecycle(
    cleared,
    TEST_TIME + 1,
  )
  const expected: WorkspaceEventPublication[] = [
    {
      workspaceId: workspace.id,
      occurredAt: TEST_TIME,
      event: { type: 'workspace.updated', workspace, error },
    },
    {
      workspaceId: workspace.id,
      occurredAt: TEST_TIME + 1,
      event: { type: 'workspace.updated', workspace: cleared.workspace, error },
    },
  ]
  expect(events).toEqual(expected)
  const reconstructed = new WorkspaceEventJournal(storage, publish)
  const polled = {
    ...cleared,
    workspace: { ...cleared.workspace, updatedAt: TEST_TIME + 2 },
  }
  await reconstructed.publishLifecycle(polled, TEST_TIME + 2)
  expect(events).toEqual(expected)
  await reconstructed.publishLifecycle(
    { ...polled, error: { ...polled.error, log: 'New private saved output.' } },
    TEST_TIME + 3,
  )
  expect(events).toEqual(expected)
})
