import { paths } from '../../paths'
import type { BranchChoice } from './BranchPicker'

/** Where the branch choice lives: the New workspace page, or the dialog. */
export type BranchForm = 'page' | 'dialog'

type ChoiceScreens = Readonly<Record<BranchChoice, string>>

/**
 * The screen that each choice of the picker shows, in each form: the base
 * example of the form with that branch. New branch leads back to the base
 * example. The phone view of the dialog keeps the screens of the dialog.
 */
const chosenScreens: Readonly<Record<BranchForm, ChoiceScreens>> = {
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
const pickerScreens: Readonly<Record<BranchForm, ChoiceScreens>> = {
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

/**
 * Where the branch controls of one form lead. `picker` is the open picker
 * with the current choice, which Use an existing branch, Change, the
 * branch control of the dialog, and Try again of a list that did not load
 * open. `choices` is the form with each choice. Null keeps a control
 * static.
 */
export type BranchLinks = Readonly<{
  picker: string | null
  choices: Readonly<Record<BranchChoice, string | null>>
}>

const staticLinks: BranchLinks = {
  picker: null,
  choices: { new: null, existing: null, 'pull-request': null },
}

/**
 * The branch links of a form. Its drawn examples differ from the base
 * example of the form only in the branch and the picker. So a state that
 * differs in any other field, such as the draft, the org, a notice, or the
 * viewer, keeps every branch control static, and no link opens another
 * draft or org. `matchesBase` says whether the full state of the form
 * matches its base example apart from the branch and the picker.
 */
export function branchLinks(
  form: BranchForm,
  choice: BranchChoice,
  matchesBase: boolean,
): BranchLinks {
  if (!matchesBase) return staticLinks
  return { picker: pickerScreens[form][choice], choices: chosenScreens[form] }
}
