/** The runner supplies these values at runtime, separately for each turn. */
export const TOOL_ENV = {
  machineOrigin: 'CONDUCTIVE_MACHINE_ORIGIN',
  workspaceToken: 'CONDUCTIVE_WORKSPACE_TOKEN',
  turnId: 'CONDUCTIVE_TURN_ID',
} as const

/** Context is a turn identifier, not a credential or a sender identity. */
export const TOOL_TURN_HEADER = 'X-Conductive-Turn-Id'
