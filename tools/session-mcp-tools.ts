import { TOOL_AGENTS, TOOL_EFFORTS } from './input.ts'

const context =
  'An omitted workspaceId names the calling workspace. A session link holds workspace and session IDs. Workspace and session links in an answer show as chips. A Sent by: line names the sending session. Do not reply only to confirm it.'
const workspaceId = {
  type: 'string',
  minLength: 1,
  description:
    'A workspace ID from list_workspaces, or from a session link. Defaults to the calling workspace.',
}
const sessionId = {
  type: 'string',
  minLength: 1,
  description: 'A session ID from list_sessions, or from a session link.',
}
const choice = {
  model: {
    type: 'object',
    properties: {
      agent: { type: 'string', enum: TOOL_AGENTS },
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
  requestId: {
    type: 'string',
    minLength: 1,
    description:
      'Keep this ID to retry without another session or message. Omission generates an ID.',
  },
}
const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
}
const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
}

export const SESSION_MCP_TOOLS = [
  {
    name: 'list_sessions',
    description: `List all sessions of a workspace in this org, including closed sessions, their choice, starter, state, and link. Needs only the workspace token. ${context}`,
    inputSchema: { type: 'object', properties: { workspaceId } },
    annotations: readAnnotations,
  },
  {
    name: 'read_session',
    description: `Read the Markdown transcript of an open or closed session, including an archived workspace. Needs only the workspace token. Defaults to concise and the newest text. For earlier text, set startLine and startOffset. Use next.line and next.offset for the following read. ${context}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        sessionId,
        detail: {
          type: 'string',
          enum: ['concise', 'full'],
          default: 'concise',
        },
        startLine: {
          type: 'integer',
          minimum: 0,
          description: 'One-based start line. Zero selects line one.',
        },
        startOffset: {
          type: 'integer',
          minimum: 0,
          description:
            'UTF-16 offset within the start line. Defaults to zero when a line is given.',
        },
      },
      required: ['sessionId'],
    },
    annotations: readAnnotations,
  },
  {
    name: 'create_session',
    description: `Create a session in this org for the sender of the active calling turn. Needs an active turn. Omitted model or effort uses that sender's saved default, then the app default. Without firstMessage, creates an empty session. A first message can queue a workspace start. The reply keeps acceptance and reports resume status. ${context}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        ...choice,
        title: {
          type: 'string',
          description:
            'Optional session title. Use plain words separated by spaces. Avoid underscores unless the user tells you to add them. The app keeps the first line, cut at 60 characters at a word.',
        },
        firstMessage: { type: 'string', minLength: 1 },
      },
    },
    annotations: writeAnnotations,
  },
  {
    name: 'send_message',
    description: `Send text to a session in this org for the sender of the active calling turn. Needs an active turn. An omitted choice keeps the session's model and effort. The message joins a running turn, or opens a linked session when the sender cannot use its starter's login. The reply gives the actual receiving session, message, turn, and resume status. ${context}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        sessionId,
        text: { type: 'string', minLength: 1 },
        ...choice,
      },
      required: ['sessionId', 'text'],
    },
    annotations: writeAnnotations,
  },
] as const
