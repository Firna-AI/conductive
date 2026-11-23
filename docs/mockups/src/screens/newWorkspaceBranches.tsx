import type { ReactNode } from 'react'
import { GitBranch, Lock, RotateCw, TriangleAlert } from 'lucide-react'
import { ActionButton } from '../../../../src/ui/components/common/actions'
import { Notice } from '../../../../src/ui/components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { Sheet } from '../../../../src/ui/components/common/Sheet'
import {
  BranchMenu,
  type BranchTargets,
} from '../components/new-workspace/BranchMenu'
import {
  BranchLine,
  BranchPicker,
  type BranchOption,
} from '../components/new-workspace/BranchPicker'
import {
  branchCopy,
  branchRefusalCopy,
  targetCopy,
} from '../../../../src/ui/components/new-workspace/branchCopy'
import { CreateRefusedNotice } from '../components/new-workspace/notices'
import {
  branchSearches,
  defaultBranch,
  pickedBranch,
  searchedBranches,
} from '../fixtures/branches'
import {
  openScreen,
  pickTo,
  screensOf,
  type BranchSurface,
} from './newWorkspaceBranchScreens'
import type { NewWorkspaceFormState } from './newWorkspaceParts'

type Form = NewWorkspaceFormState

/**
 * The creates that the branch check refused (decision 303): a picked
 * branch that is no longer on GitHub, or a GitHub account that cannot read
 * the repository.
 */
export const branchRefusals = ['missing-branch', 'no-access'] as const

/** The branch that the control shows, and that the new branch starts from. */
function formBranch(state: Form): string {
  return state.branch === 'picked' ? pickedBranch : defaultBranch
}

/** The picked branch targets the default branch, so the control names it. */
function targetsMain(state: Form): boolean {
  return state.branch === 'picked' && state.target === 'default'
}

/** The text in the search field of the open dropdown. */
function queryOf(menu: Form['branchMenu']): string {
  if (menu === 'search') return branchSearches.some
  if (menu === 'no-match') return branchSearches.none
  return ''
}

/**
 * The rows of the Start from part: the default branch first, then the
 * other branches by their newest commit, which a search narrows. The
 * default branch needs no read of GitHub, so it shows while the list loads,
 * and after a read that failed. A search highlights its first match, which
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
    to: pickTo(name, state, surface),
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
            <ScreenLink asChild to={screensOf(surface).mainOpen}>
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

/**
 * The Target part of a picked branch, or none for the default branch: the
 * picked branch first, then main, with a check on the target of the form.
 * A press on a row closes the dropdown on that target.
 */
function targetsOf(
  state: Form,
  surface: BranchSurface,
): BranchTargets | undefined {
  if (state.branch !== 'picked') return undefined
  const screens = screensOf(surface)
  return {
    options: [
      {
        branch: pickedBranch,
        checked: state.target === 'picked',
        to: screens.picked,
      },
      {
        branch: defaultBranch,
        checked: state.target === 'default',
        to: screens.targetMain,
      },
    ],
    line:
      state.target === 'picked'
        ? targetCopy.picked
        : targetCopy.defaultBranch(pickedBranch),
  }
}

/** The open dropdown, in its box on a computer or in a sheet on a phone. */
function openMenu(
  state: Form,
  repository: string,
  surface: BranchSurface,
  sheet: boolean,
): ReactNode {
  return (
    <BranchMenu
      options={optionsOf(state, surface)}
      query={queryOf(state.branchMenu)}
      sheet={sheet}
      status={statusOf(state, repository, surface)}
      targets={targetsOf(state, surface)}
    />
  )
}

/**
 * The branch control directly right of the repository picker (decision
 * 309). It adds `→ main` while a picked branch targets the default branch.
 * In the dialog it is compact: no chevron, and only the muted branch icon
 * on the default branch.
 * On a computer the open dropdown hangs below it. A phone opens the
 * dropdown as a sheet instead, from `branchSheet`. A press on the closed
 * control opens the dropdown.
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
      compact={surface === 'dialog'}
      defaultBranch={defaultBranch}
      expanded={expanded}
      open={
        expanded && !props.mobile
          ? openMenu(state, props.repository, surface, false)
          : undefined
      }
      room={surface}
      target={targetsMain(state) ? defaultBranch : undefined}
      to={openScreen(state, surface)}
    />
  )
}

/** The open dropdown of a phone, as a sheet, or `null` while it is closed. */
export function branchSheet(state: Form, repository: string): ReactNode {
  if (state.branchMenu === 'closed') return null
  return (
    <Sheet title={branchCopy.picker}>
      {openMenu(state, repository, 'page', true)}
    </Sheet>
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
            <ScreenLink asChild to={screensOf(surface).main}>
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
