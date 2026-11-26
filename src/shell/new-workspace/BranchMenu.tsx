import { useRef, type KeyboardEvent } from 'react'
import { Check } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import menu from '../../ui/components/common/Menu.module.css'
import {
  branchCopy,
  targetCopy,
} from '../../ui/components/new-workspace/branchCopy'
import styles from '../../ui/components/new-workspace/BranchMenu.module.css'
import type { BranchTarget, FormBranch } from '../../app/new-workspace-branch'
import type { Loadable } from '../../app/store'
import type { RepositoryBranchesResponse } from '../../shared/branches'
import { useLayerFocus } from '../ui/Overlay'
import ui from '../ui/ui.module.css'
import { BranchList } from './BranchList'

/** One row of the Target part: the branch that it names, and its target. */
interface TargetRow {
  name: string
  value: BranchTarget
}

/**
 * Up and Down move the focus between the rows of the Target part, with a
 * wrap at each end. A move chooses nothing, because a choice closes the
 * dropdown.
 */
function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const rows = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'),
  )
  const at = rows.findIndex((row) => row === document.activeElement)
  if (at < 0) return
  event.preventDefault()
  const step = event.key === 'ArrowDown' ? 1 : -1
  rows[(at + step + rows.length) % rows.length]?.focus()
}

/**
 * The Target part under Start from: a hairline, its label, the two targets
 * with the picked branch first, and the line about what the pull request
 * then holds. Each row names only its branch, and a check marks the target
 * of the form. The rows take one stop of Tab, on the checked row. A press
 * of a row, or Enter or Space on it, chooses its target, which closes the
 * dropdown. The part keeps its height, so it stays in view when the list of
 * branches scrolls.
 */
function TargetPart(props: {
  branch: FormBranch
  target: BranchTarget
  choose: (target: BranchTarget) => void
}) {
  const { branch, target } = props
  const rows: readonly TargetRow[] = [
    { name: branch.name, value: 'picked' },
    { name: branch.defaultBranch, value: 'default' },
  ]
  return (
    <div className={styles.targets}>
      <hr className={menu.divider} />
      <div aria-hidden className={menu.group}>
        {targetCopy.label}
      </div>
      <div
        aria-label={targetCopy.label}
        className={styles.rows}
        onKeyDown={moveFocus}
        role="radiogroup"
      >
        {rows.map((row) => {
          const checked = row.value === target
          return (
            <button
              aria-checked={checked}
              className={classes(menu.item, ui.plainButton, ui.menuItem)}
              key={row.value}
              onClick={() => props.choose(row.value)}
              role="radio"
              tabIndex={checked ? 0 : -1}
              type="button"
            >
              <span className={menu.label} title={row.name}>
                {row.name}
              </span>
              {checked ? (
                <Check aria-hidden className={menu.check} size={14} />
              ) : null}
            </button>
          )
        })}
      </div>
      <p className={menu.note}>
        {target === 'picked'
          ? targetCopy.picked
          : targetCopy.defaultBranch(branch.name)}
      </p>
    </div>
  )
}

/**
 * The open dropdown of the branch control, in two parts (decision 309), as
 * `BranchMenu` of the mockups draws it. Start from holds the search field
 * and the list of branches, as `BranchList` says. Target follows it only
 * for a picked branch that is not the default branch. A computer draws the
 * dropdown in its box below the control, and a phone in a sheet, with rows
 * of touch size. When the room runs out, the list of branches scrolls, and
 * the labels, the search field, and the Target part stay in view.
 *
 * As the dropdown beside its control opens, the search field takes the
 * focus, and as it closes, `returnFocus` gives the focus back to the
 * control, also when a pick replaced the button of the control. A phone
 * sheet holds the focus itself.
 */
export function BranchMenu(props: {
  list: Loadable<RepositoryBranchesResponse>
  branch: FormBranch
  /** The full name of the repository, which a notice can name. */
  repository: string
  pick: (name: string) => void
  choose: (target: BranchTarget) => void
  /** Reads the list again, after a failed read. */
  retry: () => void
  sheet: boolean
  /** Gives the focus back to the control as the dropdown closes. */
  returnFocus?: () => void
}) {
  const group = useRef<HTMLDivElement>(null)
  useLayerFocus(group, {
    modal: false,
    enabled: !props.sheet,
    returnFocus: props.returnFocus,
  })
  const { target } = props.branch
  return (
    <div
      aria-label={branchCopy.picker}
      className={classes(
        styles.menu,
        props.sheet && menu.sheet,
        props.sheet && styles.sheet,
      )}
      ref={group}
      role="group"
    >
      <div aria-hidden className={classes(menu.group, styles.label)}>
        {branchCopy.startFrom}
      </div>
      <BranchList
        branch={props.branch}
        list={props.list}
        pick={props.pick}
        repository={props.repository}
        retry={props.retry}
        sheet={props.sheet}
      />
      {target === null ? null : (
        <TargetPart
          branch={props.branch}
          choose={props.choose}
          target={target}
        />
      )}
    </div>
  )
}
