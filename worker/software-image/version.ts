import type { WorkspaceToolSource } from '../../tools/image-manifest'
import { installImageSoftware } from '../lifecycle/image-software'
import type { SoftwareRelease } from '../lifecycle/software-release'
import { imageToolsCommand } from '../lifecycle/image-tools'
import { workspaceToolsCommands } from '../tools/image'
import { WORKSPACE_TOOL_SOURCES } from '../tools/image-assets'
import { sha256Hex } from './digest'

export async function softwareVersion(
  artifact: SoftwareRelease,
  sources: readonly WorkspaceToolSource[] = WORKSPACE_TOOL_SOURCES,
): Promise<string> {
  return sha256Hex(
    [
      ...workspaceToolsCommands(sources).map(imageToolsCommand),
      artifact.version,
      installImageSoftware(artifact),
    ].join('\n'),
  )
}
