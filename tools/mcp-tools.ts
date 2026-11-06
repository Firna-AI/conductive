import { TOOL_AGENTS, TOOL_EFFORTS } from './input.ts'

export const WORKSPACE_MCP_TOOLS = [
  {
    name: 'create_workspace',
    description:
      "Create a workspace in this org with this workspace's owner, and start its first message immediately.",
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
      'List the name, branch, and state of every workspace in this org.',
    inputSchema: { type: 'object', properties: {} },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
] as const
