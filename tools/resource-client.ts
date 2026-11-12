import {
  agentPreviewsPath,
  agentPreviewClosePath,
} from '../src/shared/agent-previews.ts'
import {
  agentSectionDeletePath,
  type AgentCreateSectionRequest,
} from '../src/shared/agent-sections.ts'
import { MACHINE_PATHS } from '../src/shared/agent-tools.ts'
import type { OpenPreviewRequest } from '../src/shared/previews.ts'
import { sessionWorkspace, text } from './input.ts'
import {
  createdSection,
  deletedSection,
  listedPreviews,
  openedPreview,
  closedPreview,
} from './resource-responses.ts'
import type { ToolReplyReader } from './transport.ts'

export function createResourceClient(read: ToolReplyReader) {
  return {
    createSection(input: AgentCreateSectionRequest) {
      return read(MACHINE_PATHS.sections, createdSection, {
        name: text(input.name),
      })
    },
    deleteSection(sectionId: string) {
      return read(agentSectionDeletePath(text(sectionId)), deletedSection, {})
    },
    listPreviews(workspaceId?: string) {
      return read(
        agentPreviewsPath(sessionWorkspace(workspaceId)),
        listedPreviews,
      )
    },
    openPreview(input: OpenPreviewRequest, workspaceId?: string) {
      return read(
        agentPreviewsPath(sessionWorkspace(workspaceId)),
        openedPreview,
        { port: input.port },
      )
    },
    closePreview(previewId: string, workspaceId?: string) {
      return read(
        agentPreviewClosePath(sessionWorkspace(workspaceId), text(previewId)),
        closedPreview,
        {},
      )
    },
  }
}
