/**
 * The own computers of Acme: Linux servers that Cal, the admin of Acme,
 * added (own computer decision 2 A). Each workspace on one runs in its own
 * container there. Acme has none until a screen gives it these.
 */
import type {
  ComputerResources,
  OwnComputer,
} from '../components/own-computers/ownComputer'
import { runningBuild } from './computer'

/** The own computers of Acme, in the order that Cal added them. */
export const ownComputerKeys = [
  'build-01',
  'build-02',
  'lab-server',
  'build-03',
] as const

export type OwnComputerKey = (typeof ownComputerKeys)[number]

const large: ComputerResources = {
  cpus: 16,
  memoryGb: 64,
  system: 'Ubuntu 24.04 · x86_64',
}

const small: ComputerResources = {
  cpus: 8,
  memoryGb: 32,
  system: 'Debian 12 · x86_64',
}

/**
 * Each own computer of Acme in its state: build-01 with room, build-02
 * full, lab-server offline, and build-03, which Cal just added, during its
 * first build.
 */
export const ownComputers: Readonly<Record<OwnComputerKey, OwnComputer>> = {
  'build-01': {
    name: 'build-01',
    connection: { kind: 'connected' },
    builds: { built: '3 hours ago' },
    running: 2,
    limit: 4,
    resources: large,
    workspaces: 6,
    added: '12 Nov',
  },
  'build-02': {
    name: 'build-02',
    connection: { kind: 'connected' },
    builds: { built: '3 hours ago' },
    running: 4,
    limit: 4,
    resources: large,
    workspaces: 9,
    added: '12 Nov',
  },
  'lab-server': {
    name: 'lab-server',
    connection: { kind: 'offline', lastSeen: '2 hours ago' },
    builds: { built: '20 hours ago' },
    running: 0,
    limit: 2,
    resources: small,
    workspaces: 3,
    added: '18 Nov',
  },
  'build-03': {
    name: 'build-03',
    connection: { kind: 'connected' },
    // The build card of its page gives the time of a build that runs.
    builds: { now: { kind: 'building', elapsed: runningBuild.elapsed } },
    running: 0,
    limit: 4,
    resources: large,
    workspaces: 0,
    added: 'Today',
  },
}

/** build-03 after Add computer, before its first connection. */
const addedComputer: OwnComputer = {
  name: 'build-03',
  connection: { kind: 'waiting', codeLeft: '52 min' },
  builds: {},
  running: 0,
  workspaces: 0,
  added: 'Today',
}

/** The views of the Own computers tab of Acme, as the settings name them. */
export const computerListViews = [
  'none',
  'list',
  'before-add',
  'waiting',
  'expired',
] as const

export type ComputerListView = (typeof computerListViews)[number]

/**
 * The own computers of Acme in a view of the tab: none yet, the four of
 * the list, the first three before Cal added build-03, or those three with
 * build-03, which waits for its first connection or whose one-time code
 * expired.
 */
export function acmeComputers(view: ComputerListView): readonly OwnComputer[] {
  const first = [
    ownComputers['build-01'],
    ownComputers['build-02'],
    ownComputers['lab-server'],
  ]
  switch (view) {
    case 'none':
      return []
    case 'list':
      return Object.values(ownComputers)
    case 'before-add':
      return first
    case 'waiting':
      return [...first, addedComputer]
    case 'expired':
      return [...first, { ...addedComputer, connection: { kind: 'expired' } }]
  }
}

/** The one-time code of the install command of build-03. */
export const installCode = '7KQM-2XWD-H4PN-9TFC'

/**
 * An own computer that Cal removed from Acme. Its workspaces keep their
 * chats, and their files stay on the server.
 */
export const removedComputer = 'old-runner'
