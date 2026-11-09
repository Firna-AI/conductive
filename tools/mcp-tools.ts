import { TOOL_AGENTS, TOOL_EFFORTS } from './input.ts'

export const WORKSPACE_MCP_TOOLS = [
  {
    name: 'run_mac_command',
    description:
      "Ask to run a command on the active turn sender's connected Mac. Approval stays on that Mac.",
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', minLength: 1 },
        folder: { type: 'string', minLength: 1 },
        reason: { type: 'string', minLength: 1 },
        timeoutSeconds: {
          type: 'integer',
          minimum: 1,
          maximum: 1800,
          default: 60,
        },
        longerTimeoutReason: { type: 'string' },
        requestId: { type: 'string' },
      },
      required: ['command', 'folder', 'reason'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    },
  },
  {
    name: 'create_workspace',
    description:
      "Create a workspace in this org with this workspace's owner, and start its first message immediately. The reply includes its number and web link. A workspace link in a message names that workspace. A workspace link in an answer shows as a chip.",
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: { type: 'string', minLength: 1 },
        firstMessage: { type: 'string', minLength: 1 },
        model: {
          type: 'object',
          properties: {
            agent: { type: 'string', enum: TOOL_AGENTS },
            model: { type: 'string', minLength: 1 },
          },
          required: ['agent', 'model'],
        },
        effort: { type: 'string', enum: TOOL_EFFORTS },
        sectionId: { type: 'string', minLength: 1 },
      },
      required: ['repositoryId', 'firstMessage'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
  },
  {
    name: 'list_workspaces',
    description:
      'List the number, web link, name, branch, and state of every workspace in this org. A workspace link in a message names that workspace. A workspace link in an answer shows as a chip.',
    inputSchema: { type: 'object', properties: {} },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
] as const
