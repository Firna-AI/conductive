import type { ReactNode } from 'react'
import { GitBranch, Lock, RotateCw, TriangleAlert } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { Sheet } from '../components/common/Sheet'
import {
  BranchLine,
  BranchList,
  BranchPicker,
  type BranchOption,
} from '../components/new-workspace/BranchPicker'
import {
  branchCopy,
  branchRefusalCopy,
} from '../components/new-workspace/branchCopy'
import { CreateRefusedNotice } from '../components/new-workspace/notices'
import { TargetChoice } from '../components/new-workspace/TargetChoice'
import {
  branchSearches,
  defaultBranch,
  pickedBranch,
  searchedBranches,
} from '../fixtures/branches'
import { branchPaths } from '../paths'
import type { NewWorkspaceFormState } from './newWorkspaceParts'

/** Where the form draws its branch control: the page, or the dialog. */
export type BranchSurface = 'page' | 'dialog'

type Form = NewWorkspaceFormState

/**
 * The creates that the branch check refused (decision 293): a picked
 * branch that is no longer on GitHub, or a GitHub account that cannot read
 * the repository.
 */
export const branchRefusals = ['missing-branch', 'no-access'] as const

/** The branch that the control shows, and that the new branch starts from. */
function formBranch(state: Form): string {
  return state.branch === 'picked' ? pickedBranch : defaultBranch
}

/** The text in the search field of the open picker. */
function queryOf(menu: Form['branchMenu']): string {
  if (menu === 'search') return branchSearches.some
  if (menu === 'no-match') return branchSearches.none
  return ''
}

/**
 * The screen that a pick leads to, in the mockups: the default branch
 * closes the picker, and the branch of Checkout address autocomplete shows
 * the target choice.
 */
function pickTo(name: string, surface: BranchSurface): string | undefined {
  const page = surface === 'page'
  if (name === defaultBranch) {
    return page ? branchPaths.page : branchPaths.dialog
  }
  if (name === pickedBranch) {
    return page ? branchPaths.target : branchPaths.targetDialog
  }
  return undefined
}

/**
 * The rows of the open picker: the default branch first, then the other
 * branches by their newest commit, which a search narrows. The default
 * branch needs no read of GitHub, so it shows while the list loads, and
 * after a read that failed. A search highlights its first match, which
 * Enter picks.
 */
function optionsOf(state: Form, surface: BranchSurface): BranchOption[] {
  const query = queryOf(state.branchMenu)
  const loaded = ['open', 'search', 'no-match'].includes(state.branchMenu)
  const current = formBranch(state)
  const row = (name: string, detail: string): BranchOption => ({
    name,
    detail,
    checked: name === current,
    to: pickTo(name, surface),
  })
  const rows: BranchOption[] = []
  if (defaultBranch.includes(query)) {
    rows.push(row(defaultBranch, branchCopy.defaultDetail))
  }
  if (loaded) {
    for (const branch of searchedBranches(query)) {
      rows.push(row(branch.name, branch.updated))
    }
  }
  if (query !== '' && rows.length > 0) {
    rows[0] = { ...rows[0], highlighted: true }
  }
  return rows
}

/**
 * What stands under the rows: a line while the list loads or when a search
 * finds nothing, the failed read of GitHub with Try again, or a GitHub
 * account that cannot read the repository.
 */
function statusOf(
  state: Form,
  repository: string,
  surface: BranchSurface,
): ReactNode {
  switch (state.branchMenu) {
    case 'loading':
      return <BranchLine text={branchCopy.loading} />
    case 'no-match':
      return <BranchLine text={branchCopy.noMatch(branchSearches.none)} />
    case 'failed':
      return (
        <Notice
          action={
            <ScreenLink
              asChild
              to={
                surface === 'page'
                  ? branchPaths.picker
                  : branchPaths.dialogPicker
              }
            >
              <ActionButton icon={RotateCw}>Try again</ActionButton>
            </ScreenLink>
          }
          body={branchCopy.failed.body}
          icon={TriangleAlert}
          title={branchCopy.failed.title}
          tone="danger"
        />
      )
    case 'no-access':
      return (
        <Notice
          body={branchCopy.noAccess.body}
          icon={Lock}
          title={branchCopy.noAccess.title(repository)}
        />
      )
    default:
      return undefined
  }
}

/** The open picker, in its box on a computer or in a sheet on a phone. */
function openList(
  state: Form,
  repository: string,
  surface: BranchSurface,
  sheet: boolean,
): ReactNode {
  return (
    <BranchList
      options={optionsOf(state, surface)}
      query={queryOf(state.branchMenu)}
      sheet={sheet}
      status={statusOf(state, repository, surface)}
    />
  )
}

/**
 * The branch control beside the repository picker. On a computer the open
 * picker hangs below it. A phone opens the picker as a sheet instead, from
 * `branchSheet`. A press on the closed control opens the picker.
 */
export function branchControl(props: {
  state: Form
  repository: string
  surface: BranchSurface
  mobile: boolean
}): ReactNode {
  const { state, surface } = props
  const expanded = state.branchMenu !== 'closed'
  return (
    <BranchPicker
      branch={formBranch(state)}
      expanded={expanded}
      open={
        expanded && !props.mobile
          ? openList(state, props.repository, surface, false)
          : undefined
      }
      to={surface === 'page' ? branchPaths.picker : branchPaths.dialogPicker}
      tone={surface === 'dialog' ? 'plain' : undefined}
    />
  )
}

/** The open picker of a phone, as a sheet, or `null` while it is closed. */
export function branchSheet(state: Form, repository: string): ReactNode {
  if (state.branchMenu === 'closed') return null
  return (
    <Sheet title={branchCopy.picker}>
      {openList(state, repository, 'page', true)}
    </Sheet>
  )
}

/** The target choice of a picked branch, or `null` for the default branch. */
export function targetChoice(state: Form, inline: boolean): ReactNode {
  if (state.branch !== 'picked') return null
  return (
    <TargetChoice
      defaultBranch={defaultBranch}
      inline={inline}
      picked={pickedBranch}
      value={state.target}
    />
  )
}

/**
 * The notice of a create that the branch check refused, or `null`. A
 * missing branch offers a start from the default branch, which keeps the
 * message. A GitHub account that cannot read the repository gets Try
 * again, which works once the account has access.
 */
export function branchRefusal(
  result: string,
  repository: string,
  surface: BranchSurface,
): ReactNode {
  switch (result) {
    case 'missing-branch':
      return (
        <CreateRefusedNotice
          action={
            <ScreenLink
              asChild
              to={surface === 'page' ? branchPaths.page : branchPaths.dialog}
            >
              <ActionButton icon={GitBranch}>
                {branchRefusalCopy.startFrom(defaultBranch)}
              </ActionButton>
            </ScreenLink>
          }
          body={branchRefusalCopy.missing(pickedBranch)}
          key="refused"
        />
      )
    case 'no-access':
      return (
        <CreateRefusedNotice
          action={<ActionButton tone="primary">Try again</ActionButton>}
          body={branchRefusalCopy.noAccess(repository)}
          key="refused"
        />
      )
    default:
      return null
  }
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
