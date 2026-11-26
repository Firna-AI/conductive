import { describe, expect, test } from 'vitest'
import { fakeUsers } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { workspaceActionIds, type WorkspacePage } from './page-actions'

const [cal, priya] = fakeUsers
const workspace = {
  ...workspaceFixtures().workspaces.workspaces[0],
  owner: cal,
}

const goTo = [
  'go-to-all-files',
  'go-to-changes',
  'go-to-checks',
  'go-to-terminal',
  'go-to-preview',
]

describe('the actions of an open workspace', () => {
  test('follow the role, the suspension, the archive, and what the page shows', () => {
    const ids = (overrides: Partial<WorkspacePage>) =>
      workspaceActionIds({
        access: { role: 'member', suspended: false },
        workspace,
        viewer: cal,
        rightColumn: true,
        chat: true,
        desktopTool: false,
        offersRestore: false,
        mergeLatest: false,
        ...overrides,
      })
    expect({
      owner: ids({}),
      otherMember: ids({ viewer: priya }),
      admin: ids({
        access: { role: 'admin', suspended: false },
        viewer: priya,
      }),
      phoneChat: ids({ rightColumn: false }),
      phoneTool: ids({ rightColumn: false, chat: false }),
      suspended: ids({ access: { role: 'admin', suspended: true } }),
      archived: ids({ workspace: { ...workspace, state: 'archived' } }),
      restorable: ids({
        workspace: { ...workspace, state: 'archived' },
        viewer: priya,
        offersRestore: true,
      }),
      restorableTool: ids({
        workspace: { ...workspace, state: 'archived' },
        chat: false,
        offersRestore: true,
      }),
      desktopTool: ids({ desktopTool: true }),
      mergeLatest: ids({ mergeLatest: true }),
      mergeLatestSuspended: ids({
        access: { role: 'admin', suspended: true },
        mergeLatest: true,
      }),
      mergeLatestArchived: ids({
        workspace: { ...workspace, state: 'archived' },
        mergeLatest: true,
      }),
    }).toEqual({
      owner: ['new-session', 'session-history', ...goTo, 'archive-workspace'],
      otherMember: ['new-session', 'session-history', ...goTo],
      admin: ['new-session', 'session-history', ...goTo, 'archive-workspace'],
      phoneChat: ['new-session', 'session-history', 'archive-workspace'],
      phoneTool: ['archive-workspace'],
      suspended: ['session-history', ...goTo],
      archived: ['session-history'],
      restorable: ['session-history', 'restore-workspace'],
      restorableTool: [],
      desktopTool: [
        'new-session',
        'session-history',
        ...goTo,
        'go-to-desktop',
        'archive-workspace',
      ],
      mergeLatest: [
        'new-session',
        'session-history',
        ...goTo,
        'merge-latest',
        'archive-workspace',
      ],
      mergeLatestSuspended: ['session-history', ...goTo],
      mergeLatestArchived: ['session-history'],
    })
  })

  test('offer the action of the merge queue that the menu of the workspace offers, after Merge latest and before Archive', () => {
    const ids = (overrides: Partial<WorkspacePage>) =>
      workspaceActionIds({
        access: { role: 'member', suspended: false },
        workspace,
        viewer: cal,
        rightColumn: false,
        chat: false,
        desktopTool: false,
        offersRestore: false,
        mergeLatest: true,
        ...overrides,
      })
    expect({
      add: ids({ queue: 'add' }),
      remove: ids({ queue: 'remove' }),
      none: ids({ queue: null }),
      suspended: ids({
        access: { role: 'member', suspended: true },
        queue: 'remove',
      }),
    }).toEqual({
      add: ['merge-latest', 'add-to-merge-queue', 'archive-workspace'],
      remove: ['merge-latest', 'remove-from-merge-queue', 'archive-workspace'],
      none: ['merge-latest', 'archive-workspace'],
      suspended: [],
    })
  })
})
