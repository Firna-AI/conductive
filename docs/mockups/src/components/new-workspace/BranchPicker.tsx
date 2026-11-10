import { InputFrame } from '@firna/ui/input'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { GitBranch, GitBranchPlus, GitPullRequest, Search } from 'lucide-react'
import {
  branchSearches,
  chosenBranch,
  chosenPullRequest,
  continuable,
  openPullRequests,
  otherBranches,
  pullRequestHref,
  type PullRequestChoice,
} from '../../fixtures/branches'
import { repositories } from '../../fixtures/repositories'
import { noop } from '../../noop'
import { ExternalLink } from '../common/ExternalLink'
import { LoadFailure } from '../common/LoadFailure'
import { Menu, type MenuEntry, type MenuPlacement } from '../common/Menu'
import { useControlSizes } from '../common/touch'
import type { BranchLinks } from './branchScreens'
import styles from './BranchPicker.module.css'

/** The branch of a new workspace: new, as by default, or an existing one. */
export type BranchChoice = 'new' | 'existing' | 'pull-request'

/**
 * The branch picker: closed, open, open with a search that finds a pull
 * request, finds nothing, or finds the pull request from a fork, or open
 * while its list loads or after the list did not load.
 */
export type PickerState =
  'closed' | 'open' | 'search' | 'no-match' | 'fork' | 'loading' | 'failed'

/** The default branch of the repository, which the picker never offers. */
const defaultBranch = repositories.storefront.defaultBranch

/** The text of a pull request in a row and on the line, such as "#486 …". */
export function pullRequestText(pullRequest: PullRequestChoice): string {
  return `#${pullRequest.number} ${pullRequest.title}`
}

function search(state: PickerState): string {
  if (state === 'search') return branchSearches.found
  if (state === 'no-match') return branchSearches.none
  if (state === 'fork') return branchSearches.fork
  return ''
}

/**
 * The text that a search reads in a pull request: its number, its title,
 * and its branch. A pull request from another repository shows no branch
 * of the repository, so a search reads only its number and its title.
 */
function searchText(item: PullRequestChoice): string {
  const text = pullRequestText(item)
  return continuable(item) ? `${text} ${item.branch}` : text
}

/** The pull requests and the branches that the search of a state finds. */
function found(state: PickerState) {
  const query = search(state).toLowerCase()
  const pullRequests = openPullRequests.filter((item) =>
    searchText(item).toLowerCase().includes(query),
  )
  const branches = otherBranches.filter((item) =>
    item.name.toLowerCase().includes(query),
  )
  return { pullRequests, branches }
}

/**
 * The row of a pull request whose branch is in another repository, such
 * as a fork. A new workspace cannot continue it, so the row is off, says
 * where its branch is, and opens the pull request on GitHub.
 */
function forkRow(item: PullRequestChoice): MenuEntry {
  return {
    kind: 'unavailable',
    label: pullRequestText(item),
    icon: GitPullRequest,
    reason: `Its branch is in another repository, ${item.head.name}.`,
    action: (
      <ExternalLink className={styles.gitHub} href={pullRequestHref(item)}>
        Open on GitHub
      </ExternalLink>
    ),
  }
}

/**
 * The rows of the picker. New branch comes first and stays the default.
 * Then the open pull requests, and the branches without one. A branch with
 * an open pull request shows only as that pull request. A pull request
 * from another repository shows as a row that is off. New branch, the
 * chosen branch, and the chosen pull request lead to the form with that
 * choice, where `links` names a screen.
 */
function entries(
  choice: BranchChoice,
  state: PickerState,
  links: BranchLinks,
): MenuEntry[] {
  const screens = links.choices
  const rows: MenuEntry[] = [
    {
      kind: 'item',
      label: 'New branch',
      icon: GitBranchPlus,
      detail: `from ${defaultBranch}`,
      checked: choice === 'new',
      to: screens.new ?? undefined,
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
      if (!continuable(item)) {
        rows.push(forkRow(item))
        continue
      }
      const sample = item === chosenPullRequest
      rows.push({
        kind: 'item',
        label: pullRequestText(item),
        icon: GitPullRequest,
        checked: choice === 'pull-request' && sample,
        to: sample ? (screens['pull-request'] ?? undefined) : undefined,
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
        to: sample ? (screens.existing ?? undefined) : undefined,
      })
    }
  }
  return rows
}

/**
 * The list that loads, or that did not load, under New branch. Try again
 * opens the loaded picker of the same form, where one is drawn.
 */
function Status(props: {
  state: 'loading' | 'failed'
  retryTo: string | null
}) {
  const theme = useSharedUiTheme()
  if (props.state === 'failed') {
    return (
      <LoadFailure
        title="The branches didn't load"
        to={props.retryTo ?? undefined}
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
 * without its default branch. A pull request from another repository
 * stays in the list as a row that is off, with Open on GitHub. It opens below its control on a computer,
 * and in a sheet on a phone. The menu marks the current choice. `links`
 * are the branch links of the form that owns the picker.
 */
export function BranchPicker(props: {
  choice: BranchChoice
  state: PickerState
  placement: Extract<MenuPlacement, 'below-start' | 'sheet'>
  links: BranchLinks
}) {
  const { field } = useControlSizes()
  const { state } = props
  return (
    <Menu
      entries={entries(props.choice, props.state, props.links)}
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
          <Status retryTo={props.links.picker} state={state} />
        ) : undefined
      }
      wide
    />
  )
}
