import { expect, it } from 'vitest'

import { saveWorkspaceReadMark } from '../app-api/shell-data'
import { saveWorkspaceView } from '../app-api/workspace-view'
import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { interceptMembersWrite } from '../members/guarded-write.test-support'
import { existingWorkspace } from './suspension-test-support'

const backendFixture = setupBackendTests()
it.each(['view', 'read mark'] as const)(
  'refuses a shell %s write when org suspension wins its database race',
  async (kind) => {
    const fixture = backendFixture()
    const workspace = await existingWorkspace(fixture, 'shell-race')
    const database = fixture.runtime.env.DB
    const intercepted = interceptMembersWrite(database, async () => {
      await database
        .prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
        .bind(fixture.org.id)
        .run()
    }).db
    const input = {
      orgId: fixture.org.id,
      workspaceId: workspace.id,
      userId: fixture.user.id,
      now: 1,
    }
    const change =
      kind === 'view'
        ? saveWorkspaceView(intercepted, {
            ...input,
            view: {
              tabs: [],
              activeTab: null,
              temporaryTab: null,
              fileList: 'all',
              tool: 'terminal',
            },
          })
        : saveWorkspaceReadMark(intercepted, {
            ...input,
            throughEventNumber: 1,
          })
    await expect(change).rejects.toMatchObject({
      status: 403,
      code: 'org_suspended',
    })
    const table = kind === 'view' ? 'workspace_views' : 'workspace_read_states'
    expect(
      await database
        .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE org_id = ?`)
        .bind(fixture.org.id)
        .first('n'),
    ).toBe(0)
  },
)
