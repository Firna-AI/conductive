import { expect, it } from 'vitest'
import { createApiClient } from '../../app/api/client'
import {
  workspaceViewPath,
  type WorkspaceTab,
  type WorkspaceView,
} from '../../shared/workspace-view'
import { FakeApiServer } from '../../test-support/fake-api'
import { createChatApi } from './client'

it('a save gives a skill tab after a Preview tab its place in the whole row, and the Preview tab its own place', async () => {
  const target = { orgId: 'org', workspaceId: 'workspace' }
  const path = workspaceViewPath(target.orgId, target.workspaceId)
  const server = new FakeApiServer()
  server.handle('PUT', path, async (request) =>
    Response.json({ view: await request.json() }),
  )
  const first: WorkspaceTab = { kind: 'session', sessionId: 'first' }
  const second: WorkspaceTab = { kind: 'session', sessionId: 'second' }
  const plans = { agent: 'claude', name: 'plans' } as const
  const view: WorkspaceView = {
    tabs: [
      first,
      { kind: 'preview', port: 3000 },
      { kind: 'skill', ...plans },
      second,
    ],
    activeTab: first,
    temporaryTab: null,
    fileList: 'all',
    tool: 'terminal',
  }

  await createChatApi(createApiClient(server.fetch), target).saveView(view)

  const sent: unknown = await server.requests[0].json()
  expect(sent).toEqual({
    tabs: [first, second],
    activeTab: first,
    temporaryTab: null,
    fileList: 'all',
    tool: 'terminal',
    previewTabs: [{ port: 3000, place: 1 }],
    activePreview: null,
    skillTabs: [{ ...plans, place: 2 }],
    activeSkill: null,
    temporarySkill: null,
  })
})
