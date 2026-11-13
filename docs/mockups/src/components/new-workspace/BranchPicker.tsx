import type { ReactNode } from 'react'
import { Check, ChevronDown, GitBranch } from 'lucide-react'
import { ActionButton, type ActionTone } from '../common/actions'
import { classes } from '../common/classes'
import menu from '../common/Menu.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { SearchField } from '../common/SearchField'
import { useTouch } from '../common/touch'
import { branchCopy } from './branchCopy'
import styles from './BranchPicker.module.css'

/** A row of the branch picker. */
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
 * The branch control beside the repository picker of New workspace, on the
 * page and in the dialog. It shows the default branch until the member
 * picks another branch. A long name ends in an ellipsis, and on a phone the
 * control may take the whole width of its line. The page uses the default
 * tone, and the dialog the plain tone, as for the repository picker. `to`
 * is the screen of the open picker, in the mockups.
 */
function BranchButton(props: {
  branch: string
  expanded: boolean
  tone?: ActionTone
  to?: string
}) {
  const touch = useTouch()
  const button = (
    <ActionButton
      accessibilityLabel={branchCopy.control(props.branch)}
      expanded={props.expanded}
      icon={GitBranch}
      menu
      tone={props.tone}
      trailing={
        <ChevronDown aria-hidden className={styles.chevron} size={13} />
      }
    >
      {props.branch}
    </ActionButton>
  )
  return (
    <span className={classes(styles.control, touch && styles.wide)}>
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
 * The open branch picker: the search field, then the default branch, then
 * the other branches by their newest commit. `status` stands under the rows
 * in place of the branches that the list does not show: a line while the
 * list loads or when a search finds nothing, or a notice after a failed
 * read of GitHub. A phone draws it in a sheet, with rows of touch size.
 * It takes no fixtures, so the app can draw its picker with it.
 */
export function BranchList(props: {
  query: string
  options: readonly BranchOption[]
  status?: ReactNode
  sheet?: boolean
}) {
  return (
    <div
      aria-label={branchCopy.picker}
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
 * The branch control, with its picker drawn open below it on a computer.
 * A view runs no script, so the screen draws the open picker in place. A
 * phone opens the picker in a sheet, so `expanded` holds without `open`.
 * `to` is the screen of the open picker, which a press on the closed
 * control leads to.
 */
export function BranchPicker(props: {
  branch: string
  expanded: boolean
  tone?: ActionTone
  to?: string
  /** The open picker below the control, on a computer. */
  open?: ReactNode
}) {
  return (
    <span className={styles.anchor}>
      <BranchButton
        branch={props.branch}
        expanded={props.expanded}
        to={props.expanded ? undefined : props.to}
        tone={props.tone}
      />
      {props.open ? <div className={styles.popover}>{props.open}</div> : null}
    </span>
  )
}
