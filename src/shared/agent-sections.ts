import { MACHINE_PATHS, type AgentListSectionsResponse } from './agent-tools.ts'

export interface AgentCreateSectionRequest {
  name: string
}

export interface AgentCreateSectionResponse {
  section: AgentListSectionsResponse['sections'][number]
}

export interface AgentDeleteSectionResponse {
  deleted: boolean
}

export function agentSectionDeletePath(sectionId: string): string {
  return `${MACHINE_PATHS.sections}/${encodeURIComponent(sectionId)}/delete`
}
