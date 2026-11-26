import { featureResult } from '../features/result'
import { AgentSessionWorkspace } from '../tools/workspace'
import {
  writeWorkspaceCapabilities,
  type WorkspaceCapabilitiesWrite,
} from './workspace-capabilities-write'

/**
 * The workspace object with the capability write. The write runs in the
 * chat queue, so that it can give each session its change note.
 */
export class CapabilityWorkspace extends AgentSessionWorkspace {
  changeCapabilities(input: WorkspaceCapabilitiesWrite) {
    return featureResult(() =>
      writeWorkspaceCapabilities(this.chat, this.env, input),
    )
  }
}
