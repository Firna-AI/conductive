import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'

import {
  WORKSPACE_TOOL_SOURCE_PATHS,
  type WorkspaceToolSource,
} from './image-manifest.ts'

/** Run in the build environment. Only source code enters these image assets. */
export async function loadWorkspaceToolSources(
  root: URL = new URL('../', import.meta.url),
): Promise<readonly WorkspaceToolSource[]> {
  return Promise.all(
    WORKSPACE_TOOL_SOURCE_PATHS.map(async (path) => ({
      path,
      contents: await readFile(new URL(path, root), 'utf8'),
    })),
  )
}
