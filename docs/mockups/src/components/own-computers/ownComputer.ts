/**
 * The data of an own computer that the screens show: a Linux server that
 * an admin added to an org, where each workspace runs in its own container.
 * This module imports no fixture, so the app can share it.
 */

/**
 * The connection of the computer: it is connected, it was connected before
 * and is offline now, or it never connected. A computer that never
 * connected waits while the one-time code of its install command works,
 * and its code expires after 1 hour.
 */
export type ComputerConnection =
  | { kind: 'connected' }
  | { kind: 'offline'; lastSeen: string }
  | { kind: 'waiting'; codeLeft: string }
  | { kind: 'expired' }

/**
 * The builds of the setup of the org on the computer: when the newest good
 * build ended, and a build that runs now or the newest build that failed.
 * Before its first good build, no workspace can start on the computer.
 */
export type ComputerBuilds = {
  built?: string
  now?: { kind: 'building'; elapsed: string } | { kind: 'failed'; when: string }
}

/**
 * What the computer reported of itself at its newest connection: its
 * vCPUs, its memory in GB, and its system.
 */
export type ComputerResources = {
  cpus: number
  memoryGb: number
  system: string
}

/** An own computer of an org, as the screens show it. */
export type OwnComputer = {
  name: string
  connection: ComputerConnection
  builds: ComputerBuilds
  /** The workspaces of the org that run on the computer now. */
  running: number
  /**
   * The number of workspaces that run at once, which an admin sets. It
   * comes from the resources at the first connection, so a computer that
   * never connected has none yet.
   */
  limit?: number
  resources?: ComputerResources
  /** Every workspace of the org on the computer, also the stopped ones. */
  workspaces: number
  /** The day when an admin added the computer. */
  added: string
}

/**
 * The state of a computer, in the order that wins: it never connected and
 * waits, or its code expired; it is offline; it has no good build yet, so
 * its first build runs or failed; it runs as many workspaces as its limit;
 * or it is connected with room.
 */
export const computerStates = [
  'waiting',
  'expired',
  'offline',
  'building',
  'build-failed',
  'full',
  'connected',
] as const

export type ComputerState = (typeof computerStates)[number]

/** The state of a computer, as `computerStates` orders them. */
export function computerState(computer: OwnComputer): ComputerState {
  const { connection, builds } = computer
  if (connection.kind !== 'connected') return connection.kind
  if (builds.built === undefined) {
    return builds.now?.kind === 'failed' ? 'build-failed' : 'building'
  }
  const limit = computer.limit ?? 0
  return computer.running >= limit ? 'full' : 'connected'
}

/**
 * Whether a workspace can start on the computer: it has a good build. An
 * offline or a full computer still takes a start, which waits for it.
 */
export function canStartOn(computer: OwnComputer): boolean {
  return computer.builds.built !== undefined
}

/**
 * The default limit of a computer: one workspace for each 4 vCPU and 8 GB,
 * the size of a cloud computer, and at least one.
 */
export function defaultLimit(resources: ComputerResources): number {
  const byCpus = Math.floor(resources.cpus / 4)
  const byMemory = Math.floor(resources.memoryGb / 8)
  return Math.max(1, Math.min(byCpus, byMemory))
}
