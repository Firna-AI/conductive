import type { WorkspaceView } from '../../src/shared/workspace-view'
import { fitLegacyWorkspaceView } from './workspace-view-compatibility'
import { storedWorkspaceView, saveWorkspaceView } from './workspace-view'

/** Saves a pane view, or fits an old save with bounded conditional writes. */
export async function saveCompatibleWorkspaceView(
  db: D1Database,
  input: Parameters<typeof saveWorkspaceView>[1],
  legacy: boolean,
): Promise<WorkspaceView> {
  if (!legacy) {
    await saveWorkspaceView(db, input)
    return input.view
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const stored = await storedWorkspaceView(
      db,
      input.workspaceId,
      input.userId,
    )
    const view = fitLegacyWorkspaceView(input.view, stored.view)
    const saved = await saveWorkspaceView(db, {
      ...input,
      view,
      expectedView: stored.encoded,
    })
    if (saved) return view
  }
  const stored = await storedWorkspaceView(db, input.workspaceId, input.userId)
  const view = fitLegacyWorkspaceView(input.view, stored.view)
  await saveWorkspaceView(db, { ...input, view, expectedView: undefined })
  return view
}
