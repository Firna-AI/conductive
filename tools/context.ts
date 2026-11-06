/** The runner supplies these values at runtime, separately for each turn. */
export const TOOL_ENV = {
  machineOrigin: 'CONDUCTING_MACHINE_ORIGIN',
  workspaceToken: 'CONDUCTING_WORKSPACE_TOKEN',
  turnId: 'CONDUCTING_TURN_ID',
} as const

/** Context is a turn identifier, not a credential or a sender identity. */
export const TOOL_TURN_HEADER = 'X-Conducting-Turn-Id'
