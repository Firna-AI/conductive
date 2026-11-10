import { InputFrame } from '@firna/ui/input'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { GitBranch, GitBranchPlus, GitPullRequest, Search } from 'lucide-react'
import {
  branchSearches,
  chosenBranch,
  chosenPullRequest,
  openPullRequests,
  otherBranches,
  type PullRequestChoice,
} from '../../fixtures/branches'
import { repositories } from '../../fixtures/repositories'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { LoadFailure } from '../common/LoadFailure'
import { Menu, type MenuEntry, type MenuPlacement } from '../common/Menu'
import { useControlSizes } from '../common/touch'
import { chosenScreens, type BranchForm } from './branchScreens'
import styles from './BranchPicker.module.css'

/** The branch of a new workspace: new, as by default, or an existing one. */
export type BranchChoice = 'new' | 'existing' | 'pull-request'

/**
 * The branch picker: closed, open, open with a search that finds a pull
 * request or finds nothing, or open while its list loads or after the list
 * did not load.
 */
export type PickerState =
  'closed' | 'open' | 'search' | 'no-match' | 'loading' | 'failed'

/** The default branch of the repository, which the picker never offers. */
const defaultBranch = repositories.storefront.defaultBranch

/** The text of a pull request in a row and on the line, such as "#486 …". */
export function pullRequestText(pullRequest: PullRequestChoice): string {
  return `#${pullRequest.number} ${pullRequest.title}`
}

function search(state: PickerState): string {
  if (state === 'search') return branchSearches.found
  if (state === 'no-match') return branchSearches.none
  return ''
}

/** The pull requests and the branches that the search of a state finds. */
function found(state: PickerState) {
  const query = search(state).toLowerCase()
  const pullRequests = openPullRequests.filter((item) =>
    `${pullRequestText(item)} ${item.branch}`.toLowerCase().includes(query),
  )
  const branches = otherBranches.filter((item) =>
    item.name.toLowerCase().includes(query),
  )
  return { pullRequests, branches }
}

/**
 * The rows of the picker. New branch comes first and stays the default.
 * Then the open pull requests, and the branches without one. A branch with
 * an open pull request shows only as that pull request. New branch, the
 * chosen branch, and the chosen pull request lead to the form with that
 * choice, in the form of the picker.
 */
function entries(
  choice: BranchChoice,
  state: PickerState,
  form: BranchForm,
): MenuEntry[] {
  const screens = chosenScreens[form]
  const rows: MenuEntry[] = [
    {
      kind: 'item',
      label: 'New branch',
      icon: GitBranchPlus,
      detail: `from ${defaultBranch}`,
      checked: choice === 'new',
      to: screens.new,
    },
  ]
  if (state === 'loading' || state === 'failed') return rows
  const { pullRequests, branches } = found(state)
  if (pullRequests.length === 0 && branches.length === 0) {
    return [
      ...rows,
      {
        kind: 'note',
        text: `No branch or pull request matches "${search(state)}".`,
      },
    ]
  }
  rows.push({ kind: 'divider' })
  if (pullRequests.length > 0) {
    rows.push({ kind: 'label', label: 'Open pull requests' })
    for (const item of pullRequests) {
      const sample = item === chosenPullRequest
      rows.push({
        kind: 'item',
        label: pullRequestText(item),
        icon: GitPullRequest,
        checked: choice === 'pull-request' && sample,
        to: sample ? screens['pull-request'] : undefined,
      })
    }
  }
  if (branches.length > 0) {
    rows.push({ kind: 'label', label: 'Branches' })
    for (const item of branches) {
      const sample = item === chosenBranch
      rows.push({
        kind: 'item',
        label: item.name,
        icon: GitBranch,
        detail: item.updated,
        checked: choice === 'existing' && sample,
        to: sample ? screens.existing : undefined,
      })
    }
  }
  return rows
}

/** The list that loads, or that did not load, under New branch. */
function Status(props: { state: 'loading' | 'failed' }) {
  const theme = useSharedUiTheme()
  if (props.state === 'failed') {
    return (
      <LoadFailure
        title="The branches didn't load"
        to={paths.newWorkspaceBranch}
      />
    )
  }
  return (
    <span className={styles.loading}>
      <Spinner color={theme.colors.muted} size={13} />
      Loading branches
    </span>
  )
}

/**
 * The branch picker of New workspace: a search field, New branch, the open
 * pull requests, and the other branches of the repository on GitHub,
 * without its default branch. It opens below its control on a computer,
 * and in a sheet on a phone. The menu marks the current choice. `form` is
 * the form of the picker, the page by default, whose screens its choices
 * lead to.
 */
export function BranchPicker(props: {
  choice: BranchChoice
  state: PickerState
  placement: Extract<MenuPlacement, 'below-start' | 'sheet'>
  form?: BranchForm
}) {
  const { field } = useControlSizes()
  const { state } = props
  return (
    <Menu
      entries={entries(props.choice, props.state, props.form ?? 'page')}
      label="Branch"
      placement={props.placement}
      search={
        <InputFrame
          accessibilityLabel="Search branches and pull requests"
          onChangeText={noop}
          placeholder="Search branches and pull requests"
          prefixIcon={Search}
          size={field}
          value={search(props.state)}
        />
      }
      status={
        state === 'loading' || state === 'failed' ? (
          <Status state={state} />
        ) : undefined
      }
      wide
    />
  )
}
