export class NativeHistoryError extends Error {
  constructor() {
    super('The earlier agent session could not resume.')
  }
}

export function claudeHistoryFailure(message: string): boolean {
  return (
    /^No conversation found with session ID:/i.test(message.trim()) ||
    /invalid signature in (?:a )?thinking block/i.test(message)
  )
}

export class AgentRpcError extends Error {
  readonly code: number | null
  readonly data: unknown
  constructor(message: string, code: number | null, data: unknown) {
    super(message)
    this.code = code
    this.data = data
  }
}

export function codexHistoryFailure(error: unknown): boolean {
  if (!(error instanceof AgentRpcError)) return false
  if (
    typeof error.data === 'object' &&
    error.data !== null &&
    'type' in error.data &&
    error.data.type === 'modelProviderMismatch'
  )
    return true
  return (
    (error.code === -32600 && /^thread not loaded:/i.test(error.message)) ||
    (error.code === -32603 &&
      /^failed to read session metadata\b/i.test(error.message))
  )
}
