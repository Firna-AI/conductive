import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { classes } from '../../../../../src/ui/components/common/classes'
import menu from '../../../../../src/ui/components/common/Menu.module.css'
import { ScreenLink } from '../common/ScreenLink'
import { BranchList, type BranchOption } from './BranchPicker'
import {
  branchCopy,
  targetCopy,
} from '../../../../../src/ui/components/new-workspace/branchCopy'
import styles from '../../../../../src/ui/components/new-workspace/BranchMenu.module.css'

/** One of the two targets of a picked branch, as a row of the Target part. */
type TargetOption = {
  branch: string
  /** The target of the form, which the row checks. */
  checked: boolean
  /** The screen that a press on the row leads to, in the mockups. */
  to?: string
}

/** The Target part: the two targets, and the line about the pull request. */
export type BranchTargets = {
  options: readonly TargetOption[]
  line: string
}

/** One target row: the name of the branch, and a check on the target. */
function TargetRow(props: { option: TargetOption }) {
  const { option } = props
  const content = (
    <>
      <span className={menu.label}>{option.branch}</span>
      {option.checked ? (
        <Check aria-hidden className={menu.check} size={14} />
      ) : null}
    </>
  )
  // A link of the mockups takes no role, as the rows of the list do.
  if (option.to) {
    return (
      <ScreenLink className={classes(menu.item, styles.link)} to={option.to}>
        {content}
      </ScreenLink>
    )
  }
  return (
    <div aria-checked={option.checked} className={menu.item} role="radio">
      {content}
    </div>
  )
}

/**
 * The Target part under the list: a hairline, its label, the two targets
 * with the picked branch first, and the line about what the pull request
 * then holds. It keeps its height, so it stays in view.
 */
function TargetPart(props: { targets: BranchTargets }) {
  return (
    <div className={styles.targets}>
      <hr className={menu.divider} />
      <div aria-hidden className={menu.group}>
        {targetCopy.label}
      </div>
      <div
        aria-label={targetCopy.label}
        className={styles.rows}
        role="radiogroup"
      >
        {props.targets.options.map((option) => (
          <TargetRow key={option.branch} option={option} />
        ))}
      </div>
      <p className={menu.note}>{props.targets.line}</p>
    </div>
  )
}

/**
 * The open dropdown of the branch control, in two parts (decision 309).
 * Start from holds the search field and the list of branches, with the
 * default branch first. Target shows only for a picked branch that is not
 * the default branch: the picked branch, which New workspace selects first
 * (decision 305), then the default branch, with the line about what the
 * pull request then holds. A computer draws it in the box below the
 * control, and a phone in a sheet, with rows of touch size. When the room
 * runs out, the list of branches scrolls, and the Target part stays in
 * view. `status` stands under the rows, as in `BranchList`. It takes no
 * fixtures, so the app can draw its dropdown with it.
 */
export function BranchMenu(props: {
  query: string
  options: readonly BranchOption[]
  status?: ReactNode
  /** The Target part, for a picked branch that is not the default branch. */
  targets?: BranchTargets
  sheet?: boolean
}) {
  return (
    <div
      aria-label={branchCopy.picker}
      className={classes(
        styles.menu,
        props.sheet && menu.sheet,
        props.sheet && styles.sheet,
      )}
      role="group"
    >
      <div aria-hidden className={classes(menu.group, styles.label)}>
        {branchCopy.startFrom}
      </div>
      <BranchList
        options={props.options}
        query={props.query}
        sheet={props.sheet}
        status={props.status}
      />
      {props.targets ? <TargetPart targets={props.targets} /> : null}
    </div>
  )
}
