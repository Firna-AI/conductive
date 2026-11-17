import { afterEach, expect, it, vi } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { seedWorkspace } from '../members/members-test-support'
import * as viewData from './workspace-view'
import { saveCompatibleWorkspaceView } from './workspace-view-save'

const backendFixture = setupBackendTests()

afterEach(() => vi.restoreAllMocks())

it('saves the latest fit without a condition after five concurrent write conflicts', async () => {
  const { harness, org, user, repositoryId } = backendFixture()
  const workspaceId = 'bounded-view-workspace'
  await seedWorkspace(harness, org, user, workspaceId, repositoryId, null)
  const session = { kind: 'session', sessionId: 'one' } as const
  const file = { kind: 'file', path: 'README.md', mode: 'source' } as const
  const diff = { kind: 'diff', path: 'src/app.ts' } as const
  const left = { tabs: [session, file], activeTab: session, temporaryTab: file }
  const right = { tabs: [diff], activeTab: diff, temporaryTab: diff }
  const input = {
    workspaceId,
    orgId: org.id,
    userId: user.id,
    now: 1,
    view: viewData.workspaceViewInput({
      panes: [left, right],
      focusedPane: 1,
      fileList: 'all',
      tool: 'terminal',
    }),
  }
  await viewData.saveWorkspaceView(harness.env.DB, input)
  const write = viewData.saveWorkspaceView
  const writes = vi.spyOn(viewData, 'saveWorkspaceView')
  writes.mockImplementation(write)
  for (let attempt = 0; attempt < 4; attempt += 1)
    writes.mockResolvedValueOnce(false)
  writes.mockImplementationOnce(async () => {
    await write(harness.env.DB, {
      ...input,
      view: viewData.workspaceViewInput({
        ...input.view,
        panes: [{ ...left, activeTab: file }, right],
        focusedPane: 0,
      }),
    })
    return false
  })
  const saved = await saveCompatibleWorkspaceView(
    harness.env.DB,
    {
      ...input,
      view: viewData.workspaceViewInput({
        tabs: [diff, file, session],
        activeTab: diff,
        temporaryTab: null,
        fileList: 'all',
        tool: 'terminal',
      }),
    },
    true,
  )
  expect(writes).toHaveBeenCalledTimes(6)
  expect(
    writes.mock.calls.map(([, call]) => call.expectedView !== undefined),
  ).toEqual([true, true, true, true, true, false])
  const expected = {
    ...input.view,
    panes: [
      {
        tabs: [file, session],
        activeTab: file,
        temporaryTab: { kind: 'file', path: 'README.md' },
      },
      right,
    ],
    focusedPane: 0,
  }
  expect(saved).toEqual(expected)
  expect(
    await viewData.savedWorkspaceView(harness.env.DB, workspaceId, user.id),
  ).toEqual(expected)
})
