import type {
  ComputerBuilds,
  ComputerResources,
  ComputerState,
  OwnComputer,
} from './ownComputer'

/**
 * The words of the Own computers tab of the org settings and of the page
 * of one own computer. The mockups and the app share them, so this module
 * imports no fixture. Users see the name "own computer", and the cloud
 * computer keeps its name.
 */
export const ownComputerWords = {
  tab: 'Own computers',
  intro: (org: string) =>
    `Linux servers that run workspaces of ${org}, each workspace in its own container.`,
  memberNote: 'Only an admin can change them.',
  /** The line under the list, with the link to the Cloud computer tab. */
  setupNote: {
    before:
      'Each own computer builds the repositories, the scripts, and the env vars of the ',
    link: 'Cloud computer',
    after: ' tab.',
  },
  emptyAdmin: (org: string) =>
    `Add a Linux server, and new workspaces of ${org} can run on it.`,
  emptyMember: (org: string) =>
    `An admin of ${org} can add Linux servers here.`,
  emptySuspended: (org: string) => `${org} has no own computers.`,
  add: 'Add computer',
  showCommand: 'Show command',
  newCode: 'New code',
} as const

/** The word of each state, which the rows and the pages show. */
export const stateLabels: Readonly<Record<ComputerState, string>> = {
  waiting: 'Waiting to connect',
  expired: 'Code expired',
  offline: 'Offline',
  building: 'Building',
  'build-failed': 'Build failed',
  full: 'Full',
  connected: 'Connected',
}

/** The size of a computer, such as "16 vCPU · 64 GB". */
export function sizeText(resources: ComputerResources): string {
  return `${resources.cpus} vCPU · ${resources.memoryGb} GB`
}

/** The builds of a computer in a few words, such as "Built 3 hours ago". */
export function buildText(builds: ComputerBuilds): string {
  if (builds.now?.kind === 'building') return `Building · ${builds.now.elapsed}`
  if (builds.now?.kind === 'failed') return `Build failed ${builds.now.when}`
  return builds.built === undefined ? 'No build yet' : `Built ${builds.built}`
}

/**
 * The line under the name of a row: the size of the computer, then its
 * builds, when its state does not show them already. A computer that never
 * connected gives the time that its code still works.
 */
export function rowMeta(computer: OwnComputer, state: ComputerState): string {
  const { connection } = computer
  if (connection.kind === 'waiting') {
    return `Not connected yet · Code expires in ${connection.codeLeft}`
  }
  if (computer.resources === undefined) return 'Not connected yet'
  const size = sizeText(computer.resources)
  if (state === 'building' || state === 'build-failed') return size
  return `${size} · ${buildText(computer.builds)}`
}

/**
 * The workspaces of a computer in its row, or when an offline computer was
 * last seen. A computer that never connected has no limit and runs none.
 */
export function usageText(computer: OwnComputer, state: ComputerState): string {
  const { connection, limit } = computer
  if (connection.kind === 'offline') return `Last seen ${connection.lastSeen}`
  if (limit === undefined) return ''
  if (state === 'building' || state === 'build-failed') {
    return `Up to ${limit} at once`
  }
  return `${computer.running} of ${limit} running`
}

/** The words of the page of one own computer. */
export const computerPageWords = {
  back: 'Own computers',
  subtitle: 'Own computer',
  details: 'Computer',
  state: 'State',
  workspaces: 'Workspaces',
  size: 'Size',
  system: 'System',
  added: 'Added',
  inAll: (count: number) => `${count} in all`,
  offlineTitle: (name: string) => `${name} is offline`,
  offlineBody:
    'Its workspaces start when it connects again. Check that the server is on and reaches the internet.',
  limitTitle: 'Workspaces at once',
  limitBody: (name: string, org: string) =>
    `How many workspaces of ${org} run on ${name} at the same time.`,
  limitHint: (resources: ComputerResources, limit: number) =>
    `The default for ${resources.cpus} vCPU and ${resources.memoryGb} GB is ${limit}, which gives each workspace 4 vCPU and 8 GB.`,
  save: 'Save',
  removeTitle: 'Remove computer',
  removeBody: (name: string, org: string) =>
    `${name} stops running workspaces of ${org}. Its workspaces keep their chats.`,
  remove: 'Remove computer',
  cancel: 'Cancel',
  confirmTitle: (name: string) => `Remove ${name}?`,
  confirmBody: (name: string, org: string, workspaces: number) =>
    `Each workspace of ${org} on ${name} stops, and ${name} can no longer connect. Its ${workspaces} workspaces keep their chats, but they cannot start again.`,
  filesNote:
    'Their files stay on the server. Delete them there when you no longer need them.',
} as const
