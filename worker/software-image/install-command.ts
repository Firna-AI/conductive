import type { WorkspaceToolSource } from '../../tools/image-manifest'
import {
  installImageSoftware,
  type ImageSoftwareArtifact,
} from '../lifecycle/image-software'
import { privilegedCommand } from '../terminal/privileged'
import { workspaceToolsCommand } from '../tools/image'
import { WORKSPACE_TOOL_SOURCES } from '../tools/image-assets'

export function softwareInstallCommand(
  artifact: ImageSoftwareArtifact,
  sources: readonly WorkspaceToolSource[] = WORKSPACE_TOOL_SOURCES,
): string {
  return [
    'set -eu',
    privilegedCommand(workspaceToolsCommand(sources)),
    installImageSoftware(artifact),
  ].join('\n')
}
