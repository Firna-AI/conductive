/**
 * The IDs of the items of a transcript. A later event of the same message,
 * tool call, or turn end finds its item by the same ID, also when it arrives
 * after its turn ended, and replaces that item in place.
 */
export const userKey = (messageId: string) => `user:${messageId}`

export const agentKey = (turnId: string, messageId: string) =>
  `agent:${turnId}:${messageId}`

export const toolKey = (turnId: string, toolId: string) =>
  `tool:${turnId}:${toolId}`

export const endKey = (turnId: string) => `end:${turnId}`

export const stoppedKey = (turnId: string) => `stopped:${turnId}`

export const failedKey = (turnId: string) => `failed:${turnId}`

/** The note of Continue: one for each new branch in a session. */
export const continuedKey = (branch: string) => `continued:${branch}`
