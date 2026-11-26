import { useRef, useState } from 'react'
import { ChevronDown, GitBranch } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import { useControlSizes } from '../../ui/components/common/touch'
import { branchCopy } from '../../ui/components/new-workspace/branchCopy'
import styles from '../../ui/components/new-workspace/BranchPicker.module.css'
import type { BranchTarget, FormBranch } from '../../app/new-workspace-branch'
import { useStore } from '../../app/store'
import type { Repository } from '../../shared/org-settings'
import { useOrgModel } from '../context'
import { ActionButton, IconButton } from '../ui/actions'
import { useMenuLayer } from '../ui/layers'
import { useDismiss } from '../ui/Overlay'
import { PopoverSurface } from '../ui/PopoverSurface'
import { Sheet } from '../ui/Sheet'
import ui from '../ui/ui.module.css'
import { useViewport } from '../ui/viewport'
import { BranchMenu } from './BranchMenu'
import local from './new-workspace.module.css'

/**
 * The dropdown keeps its own width and height limit, as a menu does. Its
 * layer keeps it below the control and limits it only to the room there.
 */
const SURFACE_OPTIONS = {
  anchorWidthAsMinimum: false,
  maxHeight: Number.POSITIVE_INFINITY,
}

/**
 * The target that the closed control names: the default branch while a
 * picked branch targets it, else none. A target on the picked branch needs
 * no word, because the work then stacks on the branch that the control
 * names.
 */
function namedTarget(branch: FormBranch): string | undefined {
  return branch.target === 'default' ? branch.defaultBranch : undefined
}

/**
 * The end of the control: the muted target, such as `→ main`, then the
 * chevron. The target keeps its width, so a long name gives way first.
 * The dialog shows no chevron.
 */
function ControlEnd(props: { target: string | undefined; chevron: boolean }) {
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
 * workspace, on the page and in the dialog (decision 309), with the look
 * and the size of that picker. It always names a branch: the default
 * branch, until the member picks another. While a picked branch targets
 * the default branch, a muted `→ main` follows the name, and the spoken
 * name adds the target. A long name ends in an ellipsis, and the target
 * and the chevron stay in view. On a phone the control may take the whole
 * width of its line. The page uses the default tone. The dialog is
 * `compact`: it uses the plain tone and shows no chevron, as for the
 * repository picker. On the default branch it shows only the muted branch
 * icon, and the spoken name still names the branch.
 *
 * A press opens the dropdown of `BranchMenu`, which reads the branches of
 * the repository again. On a computer the dropdown opens below the
 * control, in the top layer, so no box clips it. It stays below the
 * control also when it does not fit there, and takes at most the room
 * below, so the list of branches scrolls. Escape and a press outside close
 * it. The focus on an element outside the control and the dropdown closes
 * it too. So Tab reaches each control of the dropdown, such as Try again
 * and the Target part, and the dropdown closes as Tab leaves it. A phone
 * opens it as a sheet. A pick of a branch or a press of a target closes
 * it, and the focus goes back to the control. In the dialog a pick can
 * swap the icon for the named button, so the focus goes to the button that
 * the control then shows.
 */
export function BranchControl(props: {
  orgId: string
  repository: Repository
  branch: FormBranch
  pick: (name: string) => void
  choose: (target: BranchTarget) => void
  /**
   * The look of the dialog: plain, with no chevron, and only the icon on
   * the default branch.
   */
  compact?: boolean
}) {
  const { repository, branch } = props
  const compact = props.compact === true
  const phone = useViewport() === 'phone'
  const list = useOrgModel(props.orgId).branches.of(repository.id)
  const shown = useStore(list.store)
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const target = namedTarget(branch)
  const close = () => setOpen(false)
  // The anchor holds the control and the open dropdown, so the focus of a
  // press on the control leaves the dropdown open, and its click closes it.
  useDismiss(open && !phone, anchor, close, { focusOutside: true })
  // The palette key closes the dropdown beside the control, as it closes a
  // menu. A phone sheet holds the key.
  useMenuLayer(open && !phone, () => {
    close()
    return true
  })
  const toggle = () => {
    if (!open) void list.read()
    setOpen(!open)
  }
  const pick = (name: string) => {
    close()
    props.pick(name)
  }
  const choose = (value: BranchTarget) => {
    close()
    props.choose(value)
  }
  const dropdown = (sheet: boolean) => (
    <BranchMenu
      branch={branch}
      choose={choose}
      list={shown}
      pick={pick}
      repository={repository.fullName}
      retry={() => void list.read()}
      returnFocus={() =>
        anchor.current?.querySelector<HTMLElement>('button')?.focus()
      }
      sheet={sheet}
    />
  )
  return (
    <span className={styles.anchor} ref={anchor}>
      {compact && branch.name === branch.defaultBranch ? (
        <IconButton
          expanded={open}
          icon={GitBranch}
          label={branchCopy.control(branch.name, target)}
          menu
          onPress={toggle}
        />
      ) : (
        <span
          className={classes(
            styles.control,
            target !== undefined && styles.targeted,
            phone && styles.wide,
          )}
        >
          <ActionButton
            accessibilityLabel={branchCopy.control(branch.name, target)}
            expanded={open}
            icon={GitBranch}
            menu
            onPress={toggle}
            tone={compact ? 'plain' : undefined}
            trailing={<ControlEnd chevron={!compact} target={target} />}
          >
            {branch.name}
          </ActionButton>
        </span>
      )}
      {open && !phone ? (
        <PopoverSurface
          align="start"
          anchor={anchor}
          className={ui.menuLayer}
          keepSide
          options={SURFACE_OPTIONS}
        >
          <div className={local.branchBox}>{dropdown(false)}</div>
        </PopoverSurface>
      ) : null}
      {open && phone ? (
        <Sheet close={close} title={branchCopy.picker}>
          {dropdown(true)}
        </Sheet>
      ) : null}
    </span>
  )
}
