import { filePaths } from '../../src/shared/files'
import { createChatFixture, WORKSPACE_ID } from '../chat/harness.test-support'
import { captureEnvironment } from '../chat/runner-output.test-support'
import { workspaceUpdate } from '../chat/workspace-update'
import type { TestHarness } from '../test-support/harness'

export async function filesCutoffFixture(harness: TestHarness) {
  const fixture = await createChatFixture(harness)
  await captureEnvironment(fixture, {})
  await fixture.appendWorkspaceEvent(
    WORKSPACE_ID,
    await workspaceUpdate(fixture.env.DB, fixture.org.id, WORKSPACE_ID),
  )
  return {
    ...fixture,
    runner: await fixture.connect(),
    treePath: filePaths.tree(fixture.org.id, WORKSPACE_ID),
    changesPath: filePaths.changes(fixture.org.id, WORKSPACE_ID),
  }
}
