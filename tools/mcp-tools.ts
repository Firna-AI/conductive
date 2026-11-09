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
      "Create a workspace in this org with this workspace's owner, and start its first message immediately.",
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: {
          type: 'string',
          minLength: 1,
          description: 'A repository ID from list_repositories.',
        },
        firstMessage: { type: 'string', minLength: 1 },
        name: {
          type: 'string',
          description:
            'An optional workspace name. The app keeps its first line, without a final full stop, cut to 60 characters at a word.',
        },
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
              description: 'A model ID from list_models.',
            },
          },
          required: ['agent', 'model'],
        },
        effort: {
          type: 'string',
          enum: TOOL_EFFORTS,
          description: 'An effort from list_models.',
        },
        sectionId: {
          type: 'string',
          minLength: 1,
          description: 'A section ID from list_sections.',
        },
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
      'List the name, branch, and state of every workspace in this org.',
    inputSchema: { type: 'object', properties: {} },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  {
    name: 'list_repositories',
    description:
      "List the repositories that create_workspace accepts, with their IDs. current marks this workspace's repository.",
    inputSchema: { type: 'object', properties: {} },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  {
    name: 'list_sections',
    description:
      "List this org's sections in sidebar order, with their IDs. default marks the section that create_workspace uses when it names none.",
    inputSchema: { type: 'object', properties: {} },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  {
    name: 'list_models',
    description:
      'List the models that the app offers, with their agents and efforts, and the default choice that create_workspace uses when it names no model.',
    inputSchema: { type: 'object', properties: {} },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
] as const
