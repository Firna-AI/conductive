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

/**
 * The words of a workspace on an own computer. A start on an offline or a
 * full own computer waits for it until the 20-minute limit of a start
 * (own computer decision 9 B). A workspace stops 2 minutes after its own
 * computer went offline (own computer decision 10 B). The app deletes no
 * file on a removed own computer, so an archived workspace there keeps its
 * files on that server.
 */
export const ownWorkspaceWords = {
  startStep: (name: string, org: string) =>
    `Starting on ${name}, an own computer of ${org}`,
  resumeStep: (name: string) =>
    `Resuming on ${name} with your files as you left them`,
  waitStep: (name: string) => `Waiting for ${name} to connect`,
  fullWaitStep: (name: string) => `Waiting for a free place on ${name}`,
  offlineError: (name: string) =>
    `${name} did not connect within the 20-minute limit of a start. Try again.`,
  fullError: (name: string) =>
    `${name} is full, and no place came free within the 20-minute limit of a start. Try again.`,
  wentOffline: (name: string) =>
    `${name} went offline. Resume starts the workspace when it connects again.`,
  removedRefusal: (name: string, org: string) =>
    `Its own computer, ${name}, was removed from ${org}.`,
  runsOn: (name: string, org: string) =>
    `Runs on ${name}, an own computer of ${org}.`,
} as const

/**
 * The words of the bar of an archived workspace whose own computer an admin
 * removed. They give no delete day, because the app deletes nothing there:
 * the files stay on that server. Until its 14 days end, the bar gives the
 * day when the workspace leaves the list. After them, the title gives the
 * day of the removal.
 */
export const removedComputerArchiveWords = {
  archived: (name: string, leavesOn: string) =>
    `Its files stay on ${name}, an own computer that an admin removed, and the chat is read-only. It leaves the list on ${leavesOn}.`,
  removed: (name: string) =>
    `It left the list. Its files stay on ${name}, an own computer that an admin removed, and the chat is read-only.`,
  panel: (name: string) => `The files stay on ${name}.`,
} as const
