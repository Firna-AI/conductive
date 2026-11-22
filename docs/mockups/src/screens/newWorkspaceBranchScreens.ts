import { defaultBranch, pickedBranch } from '../fixtures/branches'
import { branchPaths } from '../paths'
import type { NewWorkspaceFormState } from './newWorkspaceParts'

/**
 * The screens that the branch control of New workspace leads to, in the
 * mockups: a press on the control, a pick in its dropdown, and Send.
 */

/** Where the form draws its branch control: the page, or the dialog. */
export type BranchSurface = 'page' | 'dialog'

type Form = NewWorkspaceFormState

/** The screens of the branch control on one surface, closed and open. */
type BranchScreens = {
  main: string
  mainOpen: string
  picked: string
  pickedOpen: string
  targetMain: string
  /** The dialog draws no open dropdown on target main. */
  targetMainOpen?: string
}

export function screensOf(surface: BranchSurface): BranchScreens {
  return branchPaths[surface]
}

/** The screen of the closed control on a branch and a target. */
function closedScreen(
  branch: Form['branch'],
  target: Form['target'],
  surface: BranchSurface,
): string {
  const screens = screensOf(surface)
  if (branch === 'default') return screens.main
  return target === 'picked' ? screens.picked : screens.targetMain
}

/** The screen of the open dropdown in the state of the form. */
export function openScreen(
  state: Form,
  surface: BranchSurface,
): string | undefined {
  const screens = screensOf(surface)
  if (state.branch === 'default') return screens.mainOpen
  return state.target === 'picked' ? screens.pickedOpen : screens.targetMainOpen
}

/**
 * The screen that a pick of a row of the list leads to. A pick closes the
 * dropdown. main puts the control back on the default branch, and the
 * branch of Checkout address autocomplete keeps the target of the form.
 */
export function pickTo(
  name: string,
  state: Form,
  surface: BranchSurface,
): string | undefined {
  if (name === defaultBranch) {
    return closedScreen('default', state.target, surface)
  }
  if (name === pickedBranch) {
    return closedScreen('picked', state.target, surface)
  }
  return undefined
}

/**
 * Where Send leads from a form with a picked branch that it targets: the
 * workspace that stacks on that branch. Otherwise the form keeps the start
 * of a workspace on its usual screen.
 */
export function branchSendTo(state: Form): string | undefined {
  if (state.branch !== 'picked' || state.target !== 'picked') return undefined
  return branchPaths.stacked
}
