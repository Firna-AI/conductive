/**
 * The IDs of the items of a transcript. A later event of the same message,
 * tool call, or turn end finds its item by the same ID, also when it arrives
 * after its turn ended, and replaces that item in place.
 */
export const userKey = (messageId: string) => `user:${messageId}`

export const agentKey = (turnId: string, messageId: string) =>
  `agent:${turnId}:${messageId}`

/** The message ID of an agent item, which its key holds after its turn. */
export const agentMessageId = (item: { id: string; turnId: string }) =>
  item.id.slice(agentKey(item.turnId, '').length)

export const toolKey = (turnId: string, toolId: string) =>
  `tool:${turnId}:${toolId}`

export const endKey = (turnId: string) => `end:${turnId}`

export const stoppedKey = (turnId: string) => `stopped:${turnId}`

export const failedKey = (turnId: string) => `failed:${turnId}`

/** The note of Continue: one for each new branch in a session. */
export const continuedKey = (branch: string) => `continued:${branch}`

/** The note of a repository change: one for each new branch in a session. */
export const repositoryChangedKey = (repositoryId: string, branch: string) =>
  `repository-changed:${repositoryId}:${branch}`

/** The line that wakes a session: one for each watch, which fires once. */
export const wakeKey = (watchId: string) => `wake:${watchId}`
