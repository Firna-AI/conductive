import {
  filesPreviewPath,
  type PreviewResponse,
} from '../../src/shared/previews'
import { createPreviewHandler } from './handler'
import { launchPreview } from './launch-test-support'
import type { ToolsHarness } from './test-support'

export async function filesPreviewSetup(harness: ToolsHarness) {
  const seed = await harness.seed()
  const dependencies = {
    ...harness.dependencies,
    fileServerAvailable: (workspaceId: string) =>
      workspaceId === seed.workspaceId,
  }
  const handler = createPreviewHandler(harness.env, dependencies)
  const open = (owner = handler) =>
    owner.fetch(
      seed.request(filesPreviewPath(seed.orgId, seed.workspaceId), {
        method: 'POST',
        body: '{}',
      }),
    )
  return { ...seed, dependencies, handler, open }
}

export async function filesPreviewBrowser(
  setup: Awaited<ReturnType<typeof filesPreviewSetup>>,
  response: Response,
) {
  const { preview }: PreviewResponse = await response.json()
  return {
    preview,
    ...(await launchPreview(setup.handler, setup.request, preview.url)),
  }
}
