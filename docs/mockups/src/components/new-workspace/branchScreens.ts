import { paths } from '../../paths'
import type { BranchChoice } from './BranchPicker'

/** Where the branch choice lives: the New workspace page, or the dialog. */
export type BranchForm = 'page' | 'dialog'

type ChoiceScreens = Readonly<Record<BranchChoice, string>>

/**
 * The screen that each choice of the picker shows, in each form: the form
 * with that branch. New branch leads back to the default form. A phone
 * always opens the page, so its picker leads to the screens of the page.
 */
export const chosenScreens: Readonly<Record<BranchForm, ChoiceScreens>> = {
  page: {
    new: paths.newWorkspace,
    existing: paths.newWorkspaceBranchChosen,
    'pull-request': paths.newWorkspaceBranchPullRequest,
  },
  dialog: {
    new: paths.newWorkspaceDialog,
    existing: paths.newWorkspaceBranchDialogChosen,
    'pull-request': paths.newWorkspaceBranchDialogPullRequest,
  },
}

/**
 * The screen that opens the picker again in each form, with the current
 * choice still checked, so that opening the picker never resets it.
 */
export const pickerScreens: Readonly<Record<BranchForm, ChoiceScreens>> = {
  page: {
    new: paths.newWorkspaceBranch,
    existing: paths.newWorkspaceBranchChange,
    'pull-request': paths.newWorkspaceBranchPullRequestChange,
  },
  dialog: {
    new: paths.newWorkspaceBranchDialog,
    existing: paths.newWorkspaceBranchDialogChange,
    'pull-request': paths.newWorkspaceBranchDialogPullRequestChange,
  },
}
