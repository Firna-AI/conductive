export const MAC_ACCESS_OFF = {
  code: 'mac_access_off',
  message: 'Mac access is off in the Capabilities of this workspace.',
} as const

export function commandAccessError(reason: string) {
  if (reason === MAC_ACCESS_OFF.code) return MAC_ACCESS_OFF
  return {
    code: reason,
    message:
      reason === 'turn_ended'
        ? 'The agent turn has ended.'
        : 'The Mac is not available.',
  }
}

export function commandFailureState(reason: string) {
  return reason === 'turn_ended' || reason === MAC_ACCESS_OFF.code
    ? ('failed' as const)
    : ('unavailable' as const)
}
