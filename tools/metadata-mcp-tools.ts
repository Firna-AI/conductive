export const MAC_MCP_TOOL = {
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
} as const

export const METADATA_MCP_TOOLS = [
  {
    name: 'list_repositories',
    description:
      "Needs only the workspace token. List the repositories that create_workspace accepts, with their IDs. current marks this workspace's repository.",
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
      "Needs only the workspace token. List this org's sections in sidebar order, with their IDs. default marks the section that create_workspace uses when it names none.",
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
      'Needs only the workspace token. List the models that the app offers, with their agents, efforts, and boolean fast marks, and the standard-speed default choice that create_workspace uses when it names no model.',
    inputSchema: { type: 'object', properties: {} },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
] as const
