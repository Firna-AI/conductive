import type { ReactNode } from 'react'
import { Check, ChevronDown, GitBranch } from 'lucide-react'
import {
  ActionButton,
  IconButton,
} from '../../../../../src/ui/components/common/actions'
import { classes } from '../../../../../src/ui/components/common/classes'
import menu from '../../../../../src/ui/components/common/Menu.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { SearchField } from '../common/SearchField'
import {
  useControlSizes,
  useTouch,
} from '../../../../../src/ui/components/common/touch'
import { branchCopy } from '../../../../../src/ui/components/new-workspace/branchCopy'
import styles from '../../../../../src/ui/components/new-workspace/BranchPicker.module.css'

/** A row of the list of branches. */
export type BranchOption = {
  name: string
  /** The muted detail: `default`, or the time since the newest commit. */
  detail: string
  /** The branch of the form, which the row checks. */
  checked: boolean
  /** The row that Enter picks: the first match of a search. */
  highlighted?: boolean
  /** The screen that a pick of the row leads to, in the mockups. */
  to?: string
}

/**
 * The end of the control: the muted target while a picked branch targets
 * the default branch, such as `→ main`, then the chevron. The target keeps
 * its width, so a long name gives way first.
 */
function ControlEnd(props: { target?: string; chevron: boolean }) {
  const { labelSize } = useControlSizes()
  const chevron = props.chevron ? (
    <ChevronDown aria-hidden className={styles.chevron} size={13} />
  ) : null
  if (props.target === undefined) return chevron
  return (
    <span className={styles.end}>
      <span
        className={styles.toTarget}
        style={{ fontSize: labelSize, lineHeight: `${labelSize + 4}px` }}
      >
        {branchCopy.toTarget(props.target)}
      </span>
      {chevron}
    </span>
  )
}

/**
 * The branch control directly right of the repository picker of New
 * workspace, on the page and in the dialog (decision 309). It takes the
 * look and the size of the repository picker: an icon, the name, and a
 * chevron. It shows the default branch until the member picks another
 * branch. While a picked branch targets the default branch, a muted
 * `→ main` follows the name. A long name ends in an ellipsis, and the
 * target and the chevron stay in view. On a phone the control may take the
 * whole width of its line. The page uses the default tone. The dialog is
 * `compact`: it uses the plain tone and shows no chevron, as for the
 * repository picker, and on the default branch it shows only the muted
 * branch icon. `to` is the screen of the open dropdown, in the mockups.
 */
function BranchButton(props: {
  branch: string
  target?: string
  expanded: boolean
  compact: boolean
  /** The control names the default branch. */
  onDefault: boolean
  to?: string
}) {
  const touch = useTouch()
  const iconOnly = props.compact && props.onDefault
  const button = iconOnly ? (
    <IconButton
      expanded={props.expanded}
      icon={GitBranch}
      label={branchCopy.control(props.branch, props.target)}
      menu
    />
  ) : (
    <ActionButton
      accessibilityLabel={branchCopy.control(props.branch, props.target)}
      expanded={props.expanded}
      icon={GitBranch}
      menu
      tone={props.compact ? 'plain' : undefined}
      trailing={<ControlEnd chevron={!props.compact} target={props.target} />}
    >
      {props.branch}
    </ActionButton>
  )
  return (
    <span
      className={classes(
        !iconOnly && styles.control,
        props.target !== undefined && styles.targeted,
        touch && styles.wide,
      )}
    >
      {props.to ? (
        <ScreenLink asChild to={props.to}>
          {button}
        </ScreenLink>
      ) : (
        button
      )}
    </span>
  )
}

/** One row: the name, its detail, and a check on the branch of the form. */
function Row(props: { option: BranchOption }) {
  const { option } = props
  const className = classes(menu.item, option.highlighted && menu.highlighted)
  const content = (
    <>
      <span className={menu.label}>{option.name}</span>
      <span className={menu.detail}>{option.detail}</span>
      {option.checked ? (
        <Check aria-hidden className={menu.check} size={14} />
      ) : null}
    </>
  )
  // A link of the mockups takes no role, so a row that leads to a screen
  // is a plain link, and the other rows are the options of the list.
  if (option.to) {
    return (
      <ScreenLink className={classes(className, styles.link)} to={option.to}>
        {content}
      </ScreenLink>
    )
  }
  return (
    <div aria-selected={option.checked} className={className} role="option">
      {content}
    </div>
  )
}

/**
 * The list of the Start from part of the dropdown: the search field, then
 * the default branch, then the other branches by their newest commit.
 * `status` stands under the rows in place of the branches that the list
 * does not show: a line while the list loads or when a search finds
 * nothing, or a notice after a failed read of GitHub. In a phone sheet the
 * rows take touch size. When the dropdown runs out of room, the rows
 * scroll. It takes no fixtures, so the app can draw its list with it.
 */
export function BranchList(props: {
  query: string
  options: readonly BranchOption[]
  status?: ReactNode
  sheet?: boolean
}) {
  return (
    <div
      aria-label={branchCopy.startFrom}
      className={classes(
        styles.list,
        props.sheet && menu.sheet,
        props.sheet && styles.sheet,
      )}
      role="group"
    >
      <SearchField
        label={branchCopy.search}
        placeholder={branchCopy.search}
        query={props.query}
      />
      {props.options.length > 0 ? (
        <div aria-label="Branches" className={styles.rows} role="listbox">
          {props.options.map((option) => (
            <Row key={option.name} option={option} />
          ))}
        </div>
      ) : null}
      {props.status}
    </div>
  )
}

/** A line in place of the rows: while the list loads, or with no match. */
export function BranchLine(props: { text: string }) {
  return (
    <p className={styles.line} role="status">
      {props.text}
    </p>
  )
}

/**
 * The branch control, with its dropdown drawn open below it on a computer.
 * A view runs no script, so the screen draws the open dropdown in place. A
 * phone opens the dropdown in a sheet, so `expanded` holds without `open`.
 * `to` is the screen of the open dropdown, which a press on the closed
 * control leads to.
 */
export function BranchPicker(props: {
  branch: string
  /** The default branch, while the picked branch targets it. */
  target?: string
  expanded: boolean
  /** The default branch of the repository. */
  defaultBranch: string
  /**
   * The look of the dialog: plain, with no chevron, and only the icon on
   * the default branch.
   */
  compact?: boolean
  to?: string
  /** The open dropdown below the control, on a computer. */
  open?: ReactNode
  /**
   * The place of the control, which sets the room below it: near the
   * middle of the page, or in the header of the dialog.
   */
  room?: 'page' | 'dialog'
}) {
  return (
    <span className={styles.anchor}>
      <BranchButton
        branch={props.branch}
        compact={props.compact === true}
        expanded={props.expanded}
        onDefault={props.branch === props.defaultBranch}
        target={props.target}
        to={props.expanded ? undefined : props.to}
      />
      {props.open ? (
        <div
          className={classes(
            styles.popover,
            props.room === 'page' && styles.pageRoom,
            props.room === 'dialog' && styles.dialogRoom,
          )}
        >
          {props.open}
        </div>
      ) : null}
    </span>
  )
}
