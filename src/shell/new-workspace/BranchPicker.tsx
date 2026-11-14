import { useRef, useState } from 'react'
import { ChevronDown, GitBranch } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { branchCopy } from '../../../docs/mockups/src/components/new-workspace/branchCopy'
import styles from '../../../docs/mockups/src/components/new-workspace/BranchPicker.module.css'
import type { FormBranch } from '../../app/new-workspace-branch'
import { useStore } from '../../app/store'
import type { Repository } from '../../shared/org-settings'
import { useOrgModel } from '../context'
import { ActionButton, type ActionTone } from '../ui/actions'
import { useMenuLayer } from '../ui/layers'
import { useDismiss } from '../ui/Overlay'
import { PopoverSurface } from '../ui/PopoverSurface'
import { Sheet } from '../ui/Sheet'
import ui from '../ui/ui.module.css'
import { useViewport } from '../ui/viewport'
import { BranchList } from './BranchList'
import local from './new-workspace.module.css'

/**
 * The picker keeps its own width and height limit, as a menu does. Its
 * layer limits it only to the room below the control.
 */
const SURFACE_OPTIONS = {
  anchorWidthAsMinimum: false,
  maxHeight: Number.POSITIVE_INFINITY,
}

/**
 * The branch control beside the repository picker of New workspace, on the
 * page and in the dialog. It always names a branch: the default branch,
 * until the member picks another. A long name ends in an ellipsis, and on
 * a phone the control may take the whole width of its line. The page uses
 * the default tone, and the dialog the plain tone, as for the repository
 * picker.
 *
 * A press opens the picker, which reads the branches of the repository
 * again. On a computer the picker opens below the control, in the top
 * layer, so no box clips it, and Escape and a press outside close it. The
 * focus on an element outside the control and the picker closes it too.
 * So Tab reaches each control of the picker, such as Try again, and the
 * picker closes as Tab leaves it. A phone opens it as a sheet. A pick
 * closes it, and the focus goes back to the control.
 */
export function BranchControl(props: {
  orgId: string
  repository: Repository
  branch: FormBranch
  pick: (name: string) => void
  tone?: ActionTone
}) {
  const { repository, branch } = props
  const phone = useViewport() === 'phone'
  const list = useOrgModel(props.orgId).branches.of(repository.id)
  const shown = useStore(list.store)
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const close = () => setOpen(false)
  // The anchor holds the control and the open picker, so the focus of a
  // press on the control leaves the picker open, and its click closes it.
  useDismiss(open && !phone, anchor, close, { focusOutside: true })
  // The palette key closes the picker beside the control, as it closes a
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
  const picker = (sheet: boolean) => (
    <BranchList
      branch={branch}
      list={shown}
      pick={pick}
      repository={repository.fullName}
      retry={() => void list.read()}
      sheet={sheet}
    />
  )
  return (
    <span className={styles.anchor} ref={anchor}>
      <span className={classes(styles.control, phone && styles.wide)}>
        <ActionButton
          accessibilityLabel={branchCopy.control(branch.name)}
          expanded={open}
          icon={GitBranch}
          menu
          onPress={toggle}
          tone={props.tone}
          trailing={
            <ChevronDown aria-hidden className={styles.chevron} size={13} />
          }
        >
          {branch.name}
        </ActionButton>
      </span>
      {open && !phone ? (
        <PopoverSurface
          align="start"
          anchor={anchor}
          className={ui.menuLayer}
          options={SURFACE_OPTIONS}
        >
          <div className={local.branchBox}>{picker(false)}</div>
        </PopoverSurface>
      ) : null}
      {open && phone ? (
        <Sheet close={close} title={branchCopy.picker}>
          {picker(true)}
        </Sheet>
      ) : null}
    </span>
  )
}
