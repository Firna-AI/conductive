export function commandAccessError(reason: string) {
  return {
    code: reason,
    message:
      reason === 'turn_ended'
        ? 'The agent turn has ended.'
        : 'The Mac is not available.',
  }
}

export function commandFailureState(reason: string) {
  return reason === 'turn_ended'
    ? ('failed' as const)
    : ('unavailable' as const)
}
