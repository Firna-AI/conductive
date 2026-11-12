import { TOOL_AGENTS, TOOL_EFFORTS } from './input.ts'

export const toolContext =
  'These calls reach workspaces in this org. An omitted workspaceId names the calling workspace. Use names and returned links in normal answers. Workspace and session links show as chips. A session link holds both IDs. A Sent by: line names the sending session. Do not reply only to confirm it.'
export const writeAccess =
  'Needs an active calling turn. Acts for the member whose message started that turn.'
export const workspaceId = {
  type: 'string',
  minLength: 1,
  description:
    'A workspace ID from list_workspaces or a returned link. Defaults to the calling workspace.',
}
export const sessionId = {
  type: 'string',
  minLength: 1,
  description: 'A session ID from list_sessions or a session link.',
}
export const modelChoice = {
  model: {
    type: 'object',
    properties: {
      agent: {
        type: 'string',
        enum: TOOL_AGENTS,
        description: 'An agent from list_models.',
      },
      model: {
        type: 'string',
        minLength: 1,
        description: 'A model from list_models.',
      },
    },
    required: ['agent', 'model'],
  },
  effort: {
    type: 'string',
    enum: TOOL_EFFORTS,
    description: 'An effort from list_models.',
  },
}
export const requestId = {
  type: 'string',
  minLength: 1,
  description:
    'Keep this ID to retry without another workspace, session, or message. Omission generates an ID.',
}
export const paging = {
  limit: {
    type: 'integer',
    minimum: 1,
    maximum: 100,
    description:
      'Maximum entries. A limited reply gives hasMore. Omission returns every entry.',
  },
  offset: {
    type: 'integer',
    minimum: 0,
    description: 'Entries to skip before the next page.',
  },
}
export const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
}
export const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
}
