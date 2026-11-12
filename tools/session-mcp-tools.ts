import {
  toolContext,
  workspaceId,
  sessionId,
  modelChoice,
  requestId,
  paging,
  readAnnotations,
  writeAnnotations,
  writeAccess,
} from './mcp-schema.ts'

export const SESSION_MCP_TOOLS = [
  {
    name: 'list_sessions',
    description: `List sessions of a workspace in this org, including closed sessions, their choice, starter, state, and link. Needs only the workspace token. ${toolContext}`,
    inputSchema: { type: 'object', properties: { workspaceId, ...paging } },
    annotations: readAnnotations,
  },
  {
    name: 'read_session',
    description: `Read the Markdown transcript of an open or closed session, including an archived workspace. Needs only the workspace token. Defaults to concise and the newest text. For earlier text, set startLine and startOffset. Use next.line and next.offset for the following read. ${toolContext}`,
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
    description: `Create a session in this org for the sender of the active calling turn. ${writeAccess} Omitted model or effort uses that sender's saved default, then the app default. Without firstMessage, creates an empty session. A first message can queue a workspace start. The reply keeps acceptance and reports resume status. ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        ...modelChoice,
        requestId,
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
    description: `Send text to a session in this org for the sender of the active calling turn. ${writeAccess} An omitted choice keeps the session's model and effort. The message joins a running turn, or opens a linked session when the sender cannot use its starter's login. The reply gives the actual receiving session, message, turn, and resume status. ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        sessionId,
        text: { type: 'string', minLength: 1 },
        ...modelChoice,
        requestId,
      },
      required: ['sessionId', 'text'],
    },
    annotations: writeAnnotations,
  },
  {
    name: 'get_session',
    description: `Get a session's choice, starter, title, closed mark, state, and link. Needs only the workspace token. ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: { workspaceId, sessionId },
      required: ['sessionId'],
    },
    annotations: readAnnotations,
  },
  {
    name: 'rename_session',
    description: `Rename a session. ${writeAccess} ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        sessionId,
        title: {
          type: 'string',
          minLength: 1,
          description:
            'Use plain words separated by spaces. Avoid underscores unless the user tells you to add them.',
        },
      },
      required: ['sessionId', 'title'],
    },
    annotations: writeAnnotations,
  },
  {
    name: 'close_session',
    description: `Close a session. A running turn refuses the close unless stopRunningTurn is true. Closing the calling session can end this turn. ${writeAccess} ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        sessionId,
        stopRunningTurn: { type: 'boolean', default: false },
      },
      required: ['sessionId'],
    },
    annotations: writeAnnotations,
  },
  {
    name: 'stop_session',
    description: `Stop a session's running turn. Without a running turn, succeeds and reports idle. Stopping the calling session can end this turn. ${writeAccess} ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: { workspaceId, sessionId },
      required: ['sessionId'],
    },
    annotations: writeAnnotations,
  },
  {
    name: 'get_message',
    description: `Get one message's text, sender, state, turn, and time. Needs only the workspace token. ${toolContext}`,
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId,
        sessionId,
        messageId: { type: 'string', minLength: 1 },
      },
      required: ['sessionId', 'messageId'],
    },
    annotations: readAnnotations,
  },
] as const
