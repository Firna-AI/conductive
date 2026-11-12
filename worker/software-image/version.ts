import type { WorkspaceToolSource } from '../../tools/image-manifest'
import {
  installImageSoftware,
  type ImageSoftwareArtifact,
} from '../lifecycle/image-software'
import { privilegedCommand } from '../terminal/privileged'
import { workspaceToolsCommands } from '../tools/image'
import { WORKSPACE_TOOL_SOURCES } from '../tools/image-assets'
import { sha256Hex } from './digest'

export async function softwareVersion(
  artifact: ImageSoftwareArtifact,
  sources: readonly WorkspaceToolSource[] = WORKSPACE_TOOL_SOURCES,
): Promise<string> {
  return sha256Hex(
    [
      ...workspaceToolsCommands(sources).map(privilegedCommand),
      installImageSoftware(artifact),
    ].join('\n'),
  )
}
