import type {
  BuildResponse,
  BuildsResponse,
  ImageBuild,
} from '../../src/shared/org-settings'
import { sha256Hex } from '../software-image/digest'
import { serializeSavedScript, type SavedScript } from './saved-script'

export interface ImageVersions {
  softwareVersion: string | null
  installScriptRevision: string | null
}

export type RefreshCause = 'push' | 'daily' | 'request'

export type RecordedImageBuild = ImageBuild & {
  refreshCause: RefreshCause | null
}

export type BuildsWithCauses = Omit<BuildsResponse, 'builds'> & {
  builds: readonly RecordedImageBuild[]
}

export type BuildWithCause = Omit<BuildResponse, 'build'> & {
  build: RecordedImageBuild
}

export function installScriptRevision(script: SavedScript): Promise<string> {
  return sha256Hex(serializeSavedScript(script))
}
