import type { ComputerState } from './ownComputer'

/**
 * The words of the computer choice of New workspace and of the automation
 * form (own computer decision 3 A), and of an own computer in a workspace.
 * The cloud computer is the default and keeps its name. The mockups and
 * the app share them, so this module imports no fixture.
 */
export const computerChoiceWords = {
  control: 'Computer',
  cloud: 'Cloud computer',
  cloudDetail: 'default',
  ownGroup: 'Own computers',
  /** The control, as a screen reader names it. */
  controlLabel: (name: string) => `Computer: ${name}`,
  note: (name: string, org: string, built: string) =>
    `Starts on ${name}, an own computer of ${org}, built ${built}.`,
  offlineTitle: (name: string) => `${name} is offline`,
  offlineBody: 'The workspace starts when it connects again.',
  fullTitle: (name: string) => `${name} is full`,
  fullBody: (running: number, limit: number) =>
    `It runs ${running} of ${limit} workspaces. The workspace starts when one of them stops.`,
  automationHint:
    'Each run opens a new workspace on a new branch of this repository, in this section, on this computer.',
  removedTitle: 'This automation turned off',
  removedBody: (name: string, org: string) =>
    `Its own computer, ${name}, was removed from ${org}.`,
  removedOwner: 'Choose another computer, then turn it on.',
  removedMember: (owner: string) => `Only ${owner} can choose another one.`,
} as const

/**
 * The muted detail of an own computer in the menu of the choice. A
 * computer without a good build stays in its place, off, with the note of
 * when it is ready, as a repository that waits for its build does.
 */
export function menuDetail(
  state: ComputerState,
  running: number,
  limit: number,
): string {
  switch (state) {
    case 'connected':
      return `${running} of ${limit} running`
    case 'full':
      return 'Full'
    case 'offline':
      return 'Offline'
    case 'building':
      return 'Ready after the build'
    case 'build-failed':
      return 'Ready after a build succeeds'
    case 'waiting':
    case 'expired':
      return 'Not connected yet'
  }
}

/** The words of a workspace on an own computer. */
export const ownWorkspaceWords = {
  startStep: (name: string, org: string) =>
    `Starting on ${name}, an own computer of ${org}`,
  resumeStep: (name: string) =>
    `Resuming on ${name} with your files as you left them`,
  waitStep: (name: string) => `Waiting for ${name} to connect`,
  offlineError: (name: string) =>
    `${name} did not connect within the 20-minute limit of a start. Try again.`,
  removedRefusal: (name: string, org: string) =>
    `Its own computer, ${name}, was removed from ${org}.`,
  runsOn: (name: string, org: string) =>
    `Runs on ${name}, an own computer of ${org}.`,
} as const
