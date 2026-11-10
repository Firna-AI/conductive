import { describe, expect, test } from 'vitest'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { renderScreen, startedApp, textOf } from '../test-render'
import { WorkspaceRow } from './WorkspaceRow'

describe('WorkspaceRow', () => {
  test('shows Untitled for a workspace with no name', async () => {
    const app = await startedApp(new FakeApiServer())
    const { workspace } = workspaceFixtures().detail
    const html = renderScreen(
      app,
      <WorkspaceRow
        now={FAKE_TIME}
        selected={false}
        variant="sidebar"
        workspace={{ ...workspace, name: null, updatedAt: FAKE_TIME }}
      />,
    )
    expect(textOf(html)).toBe('Untitled now , Checks passed, Ready')
  })
})
