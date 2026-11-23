import { computerPaths } from '../computerPaths'
import { pageWithProps } from '../pageLookup'
import { readyWorkspace, type WorkspaceState } from './workspaceState'

const pages = computerPaths.workspace

/** A path of the pages of a workspace on an own computer. */
type OwnComputerPath = (typeof pages)[keyof typeof pages]

/** Checkout address autocomplete, stopped after lab-server went offline. */
const wentOffline: WorkspaceState = {
  ...readyWorkspace,
  sandbox: 'stopped',
  computer: 'went-offline',
}

/** A resume of Checkout address autocomplete that waits for lab-server. */
const waiting: WorkspaceState = {
  ...readyWorkspace,
  sandbox: 'starting',
  computer: 'offline',
}

/** The chat of a turn that stopped with its sandbox, and no pull request. */
const stoppedTurn = { conversation: 'sandbox-stopped', banner: 'none' } as const

/**
 * Each page of a workspace on an own computer, by its path, with its
 * props. Each path has one, so a new page needs its props here. The
 * entries read their props here, and Resume and Try again find their
 * pages here.
 */
export const ownComputerPages: Readonly<
  Record<OwnComputerPath, WorkspaceState>
> = {
  [pages.starting]: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'starting',
    conversation: 'queued',
    banner: 'no-commits',
    computer: 'own',
  },
  [pages.menu]: { ...readyWorkspace, computer: 'own', overlay: 'restart' },
  [pages.wentOffline]: wentOffline,
  [pages.wentOfflineDuringTurn]: { ...wentOffline, ...stoppedTurn },
  [pages.waiting]: waiting,
  [pages.waitingStoppedTurn]: { ...waiting, ...stoppedTurn },
  [pages.offline]: { ...readyWorkspace, sandbox: 'error', computer: 'offline' },
  [pages.full]: { ...readyWorkspace, sandbox: 'starting', computer: 'full' },
  [pages.fullFailed]: { ...readyWorkspace, sandbox: 'error', computer: 'full' },
  [pages.removed]: {
    ...readyWorkspace,
    sandbox: 'refused',
    computer: 'removed',
  },
}

/**
 * The page that Resume or Try again opens: the next state of the same
 * workspace, if the catalogue draws it. The next state keeps every prop,
 * except that the sandbox starts, no start error is saved, and an own
 * computer that went offline is offline. With no such page, the button
 * has no link.
 */
export function recoveryPage(state: WorkspaceState): string | undefined {
  const next: WorkspaceState = {
    ...state,
    sandbox: 'starting',
    startError: readyWorkspace.startError,
    computer: state.computer === 'went-offline' ? 'offline' : state.computer,
  }
  return pageWithProps(ownComputerPages, next)
}
