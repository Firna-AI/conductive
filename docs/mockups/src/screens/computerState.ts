/**
 * The computer of the open workspace, as a part of the workspace state
 * (own computer decisions 1 D and 3 A): the cloud computer, the own
 * computer build-01 of Acme, build-02 while it runs as many workspaces as
 * its limit, the own computer lab-server while it is offline, lab-server
 * after it went offline while the workspace ran, or an own computer that an
 * admin removed from Acme. After `went-offline`, the workspace keeps its
 * state for 2 minutes, then shows stopped with the message that lab-server
 * went offline (own computer decision 10 B). An archived workspace on a
 * removed computer keeps its files on that server, so `archive` gives only
 * whether its 14 days ended.
 */
export const computerStateProperties = {
  computer: {
    enum: ['cloud', 'own', 'full', 'offline', 'went-offline', 'removed'],
  },
} as const

export const computerStateKeys = ['computer'] as const

/** A workspace on the cloud computer, as before own computers. */
export const computerStateDefaults = { computer: 'cloud' } as const
