import type { WorkspaceToolSource } from '../../tools/image-manifest'
import type { ImageSoftwareArtifact } from '../lifecycle/image-software'
import { sha256Hex } from './digest'
import { softwareInstallCommand } from './install-command'

export async function softwareVersion(
  artifact: ImageSoftwareArtifact,
  sources?: readonly WorkspaceToolSource[],
): Promise<string> {
  return sha256Hex(softwareInstallCommand(artifact, sources))
}
