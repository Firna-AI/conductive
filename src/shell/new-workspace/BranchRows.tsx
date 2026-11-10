import { useId } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  ChevronDown,
  ExternalLink,
  GitBranch,
  GitBranchPlus,
  GitPullRequest,
} from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import external from '../../../docs/mockups/src/components/common/ExternalLink.module.css'
import menu from '../../../docs/mockups/src/components/common/Menu.module.css'
import picker from '../../../docs/mockups/src/components/new-workspace/BranchPicker.module.css'
import type { BranchRows } from '../../app/branch-list'
import {
  continuable,
  optionKey,
  pullRequestText,
} from '../../app/branch-options'
import type { Repository } from '../../shared/org-settings'
import type { WorkspaceBranchOption } from '../../shared/workspace-branches'
import ui from '../ui/ui.module.css'

/** The `data-option` of New branch, which no row of the list has. */
export const newBranchKey = 'new'

/** The `data-option` of Show more, which no row of the list has. */
export const moreKey = 'more'

type PullRequestOption = Extract<
  WorkspaceBranchOption,
  { type: 'pull-request' }
>

const itemClass = classes(menu.item, ui.plainButton, ui.menuItem)

/**
 * A choice of the picker. The menu marks the current one. A detail, such as
 * the branch that New branch starts from, is part of its name.
 */
function Choice(props: {
  option: string
  label: string
  icon: LucideIcon
  detail?: string
  checked: boolean
  /** The row that takes the focus as a sheet opens. */
  autofocus: boolean
  choose: () => void
}) {
  const Icon = props.icon
  return (
    <button
      aria-checked={props.checked}
      aria-label={props.detail ? `${props.label}, ${props.detail}` : undefined}
      className={itemClass}
      data-autofocus={props.autofocus ? true : undefined}
      data-option={props.option}
      onClick={props.choose}
      role="menuitemradio"
      tabIndex={-1}
      type="button"
    >
      <Icon aria-hidden className={menu.icon} size={14} />
      <span className={menu.label}>{props.label}</span>
      {props.detail ? (
        <span className={menu.detail}>{props.detail}</span>
      ) : null}
      {props.checked ? (
        <Check aria-hidden className={menu.check} size={14} />
      ) : null}
    </button>
  )
}

/**
 * A pull request whose branch is in another repository, such as a fork. A
 * new workspace cannot continue it, so the row is off and says why. Open on
 * GitHub stands beside it, so that one press has one target.
 */
function Unavailable(props: { option: PullRequestOption }) {
  const { option } = props
  const label = useId()
  const reason = useId()
  return (
    <div className={menu.unavailable} role="none">
      <div
        aria-describedby={reason}
        aria-disabled="true"
        aria-labelledby={label}
        className={classes(menu.unavailableItem, ui.menuItem)}
        data-option={optionKey(option)}
        role="menuitem"
        tabIndex={-1}
      >
        <GitPullRequest aria-hidden className={menu.icon} size={14} />
        <span className={menu.unavailableText}>
          <span className={menu.unavailableLabel} id={label}>
            {pullRequestText(option)}
          </span>
          <span className={menu.reason} id={reason}>
            Its branch is in another repository.
          </span>
        </span>
      </div>
      <span className={menu.unavailableAction}>
        <a
          aria-describedby={label}
          className={classes(external.link, picker.gitHub)}
          href={option.url}
          rel="noreferrer"
          role="menuitem"
          tabIndex={-1}
          target="_blank"
        >
          Open on GitHub
          <ExternalLink aria-hidden size={12} />
        </a>
      </span>
    </div>
  )
}

/** Show more, which loads the next page under the rows. */
function ShowMore(props: { reading: boolean; more: () => void }) {
  const theme = useSharedUiTheme()
  return (
    <button
      aria-disabled={props.reading ? true : undefined}
      className={itemClass}
      data-option={moreKey}
      onClick={() => {
        if (!props.reading) props.more()
      }}
      role="menuitem"
      tabIndex={-1}
      type="button"
    >
      {props.reading ? (
        <Spinner color={theme.colors.muted} size={14} />
      ) : (
        <ChevronDown aria-hidden className={menu.icon} size={14} />
      )}
      <span className={menu.label}>Show more</span>
    </button>
  )
}

/**
 * The rows of the picker. New branch comes first and stays the default, in
 * each state of the list. Then the open pull requests and the branches
 * without one, each in its group, in the order of the pages. A pull request
 * from another repository shows as a row that is off. A search without a
 * match says so. A sheet gives the focus to the checked row, or else to
 * New branch, so that no keyboard covers the list as it opens.
 */
export function BranchEntries(props: {
  rows: BranchRows
  repository: Repository
  chosen: WorkspaceBranchOption | null
  choose: (option: WorkspaceBranchOption | null) => void
  more: () => void
}) {
  const { rows } = props
  const chosen = props.chosen ? optionKey(props.chosen) : newBranchKey
  const loaded = rows.state === 'ready' ? rows.rows : []
  const focused = loaded.some((row) => optionKey(row) === chosen)
    ? chosen
    : newBranchKey
  const choice = (option: WorkspaceBranchOption) => {
    const key = optionKey(option)
    const pullRequest = option.type === 'pull-request'
    return (
      <Choice
        autofocus={focused === key}
        checked={chosen === key}
        choose={() => props.choose(option)}
        icon={pullRequest ? GitPullRequest : GitBranch}
        key={key}
        label={pullRequest ? pullRequestText(option) : option.name}
        option={key}
      />
    )
  }
  const pullRequests = loaded.filter(
    (row): row is PullRequestOption => row.type === 'pull-request',
  )
  const branches = loaded.filter((row) => row.type === 'branch')
  return (
    <>
      <Choice
        autofocus={focused === newBranchKey}
        checked={chosen === newBranchKey}
        choose={() => props.choose(null)}
        detail={`from ${props.repository.defaultBranch}`}
        icon={GitBranchPlus}
        label="New branch"
        option={newBranchKey}
      />
      {rows.state === 'ready' && loaded.length === 0 ? (
        <p className={menu.note} role="none">
          {rows.query === ''
            ? 'No existing branches or pull requests on GitHub.'
            : `No branch or pull request matches "${rows.query}".`}
        </p>
      ) : null}
      {loaded.length > 0 ? <hr className={menu.divider} /> : null}
      {pullRequests.length > 0 ? (
        <div className={menu.group} role="none">
          Open pull requests
        </div>
      ) : null}
      {pullRequests.map((row) =>
        continuable(row) ? (
          choice(row)
        ) : (
          <Unavailable key={optionKey(row)} option={row} />
        ),
      )}
      {branches.length > 0 ? (
        <div className={menu.group} role="none">
          Branches
        </div>
      ) : null}
      {branches.map(choice)}
      {rows.state === 'ready' &&
      (rows.more.state === 'ready' || rows.more.state === 'reading') ? (
        <ShowMore more={props.more} reading={rows.more.state === 'reading'} />
      ) : null}
    </>
  )
}
