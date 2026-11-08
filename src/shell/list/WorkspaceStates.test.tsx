import { describe, expect, test } from 'vitest'
import { WorkspaceModel } from '../../app/workspace-model'
import { ChatController } from '../../chat/state/controller'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUser } from '../../test-support/fixtures/core'
import { renderScreen, startedApp, textOf } from '../test-render'
import { sandboxState } from '../workspace/features'
import { ToolEvents } from '../workspace/tools/tool-events'
import { WorkspaceHeader } from '../workspace/WorkspaceHeader'
import { OrgList } from './OrgList'

describe('workspace states', () => {
  test('a workspace that needs input shows it in its row and its header, and its cloud computer is ready', async () => {
    const app = await startedApp(new FakeApiServer({ workspaceState: 'input' }))
    const org = app.org(FAKE_IDS.org)
    await org.reload('list')
    const row = textOf(
      renderScreen(
        app,
        <OrgList orgId={FAKE_IDS.org} selectedId={null} variant="sidebar" />,
      ),
    )
    expect(row).toContain('Checkout address autocomplete 6m , Needs input')
    const open = new WorkspaceModel(org, FAKE_IDS.workspace)
    await open.open()
    open.close()
    const detail = open.detail.get()
    expect(detail).toMatchObject({
      state: 'ready',
      value: { workspace: { state: 'input' } },
    })
    if (detail.state !== 'ready') throw new Error('The workspace did not open.')
    const { workspace } = detail.value
    const header = textOf(
      renderScreen(
        app,
        <WorkspaceHeader
          context={{
            org: { id: FAKE_IDS.org, name: 'Acme', role: 'admin' },
            workspace,
            viewer: fakeUser,
            sandbox: sandboxState(workspace),
            readOnly: false,
            panel: null,
            viewport: 'desktop',
            view: [],
            stream: open.stream,
            // The header reads no saved view and no tool events, so the chat
            // never starts and the tool events follow no stream.
            savedView: new ChatController({
              target: { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace },
              client: app.services.api,
              subscribe: () => () => undefined,
            }),
            toolEvents: new ToolEvents().subscribe,
            archive: null,
            onReassigned: () => undefined,
          }}
        />,
      ),
    )
    expect(header).toContain('Cal , owner of the workspace Needs input')
    expect(sandboxState(workspace)).toBe('ready')
  })
})
