import type {
  AgentListPreviewsResponse,
  AgentOpenPreviewResponse,
  AgentClosePreviewResponse,
} from '../src/shared/agent-previews.ts'
import type {
  AgentCreateSectionResponse,
  AgentDeleteSectionResponse,
} from '../src/shared/agent-sections.ts'
import type { Preview } from '../src/shared/previews.ts'
import { record, text } from './input.ts'
import {
  array,
  flag,
  replyCounter,
  timestamp,
  workspaceSummary,
} from './responses.ts'

export function createdSection(value: unknown): AgentCreateSectionResponse {
  const fields = record(record(value).section)
  return {
    section: {
      id: text(fields.id),
      name: text(fields.name),
      default: flag(fields.default),
    },
  }
}

export function deletedSection(value: unknown): AgentDeleteSectionResponse {
  return { deleted: flag(record(value).deleted) }
}

function preview(value: unknown): Preview {
  const fields = record(value)
  return {
    id: text(fields.id),
    port: replyCounter(fields.port),
    url: text(fields.url),
    expiresAt: timestamp(fields.expiresAt),
  }
}

export function listedPreviews(value: unknown): AgentListPreviewsResponse {
  const fields = record(value)
  return {
    workspace: workspaceSummary(fields.workspace),
    previews: array(fields.previews).map(preview),
  }
}

export function openedPreview(value: unknown): AgentOpenPreviewResponse {
  const fields = record(value)
  return {
    workspace: workspaceSummary(fields.workspace),
    preview: preview(fields.preview),
  }
}

export function closedPreview(value: unknown): AgentClosePreviewResponse {
  const fields = record(value)
  return {
    workspace: workspaceSummary(fields.workspace),
    closed: flag(fields.closed),
  }
}
