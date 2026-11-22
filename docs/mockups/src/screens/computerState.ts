/**
 * The computer of the open workspace, as a part of the workspace state
 * (own computer decisions 1 D and 3 A): the cloud computer, the own
 * computer build-01 of Acme, the own computer lab-server while it is
 * offline, or an own computer that an admin removed from Acme.
 */
export const computerStateProperties = {
  computer: { enum: ['cloud', 'own', 'offline', 'removed'] },
} as const

export const computerStateKeys = ['computer'] as const

/** A workspace on the cloud computer, as before own computers. */
export const computerStateDefaults = { computer: 'cloud' } as const
