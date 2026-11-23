import { paths } from '../paths'
import { recoveryPage } from './ownComputerPages'
import type { WorkspaceState } from './workspaceState'

/**
 * The pages that the one way forward of the bar of a workspace opens, from
 * the state of the workspace: Try again after a failed first start, and
 * Restore. Resume and the Try again of a later start open the next state
 * of the same workspace, as `recoveryPage` finds it. Each button has no
 * link where the catalogue draws no such page.
 */

/** A page that the one way forward opens, as a part of the notice. */
export function recovery(page: string | undefined): { recoverTo?: string } {
  return page ? { recoverTo: page } : {}
}

/**
 * The page that Try again opens after a failed first start: the retry of
 * the drawn first start on the cloud computer, or the next state of the
 * same workspace on an own computer, when the catalogue draws it. A
 * workspace never moves to another computer.
 */
export function firstStartRetry(state: WorkspaceState): string | undefined {
  return state.computer === 'cloud' ? paths.retrying : recoveryPage(state)
}

/**
 * The page that Restore opens: the restored workspace that the catalogue
 * draws on the cloud computer. It draws no restored workspace on an own
 * computer, so Restore there has no link.
 */
export function restorePage(state: WorkspaceState): string | undefined {
  return state.computer === 'cloud' ? paths.restored : undefined
}
