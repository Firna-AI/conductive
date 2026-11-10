import { useEffect, useState, type ReactNode, type RefObject } from 'react'
import sheetStyles from '../../../docs/mockups/src/components/common/Sheet.module.css'
import { BranchList } from '../../app/branch-list'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { useStore } from '../../app/store'
import type { Repository } from '../../shared/org-settings'
import type { WorkspaceBranchOption } from '../../shared/workspace-branches'
import { useOrgServices } from '../context'
import { useMenuLayer } from '../ui/layers'
import { useDismiss } from '../ui/Overlay'
import { Sheet } from '../ui/Sheet'
import { useViewport } from '../ui/viewport'
import { BranchMenu } from './BranchMenu'

/** The branch choice of a New workspace form, with its picker. */
export interface BranchPicker {
  /** Whether the picker shows. */
  open: boolean
  /** Opens the picker, or closes it, as its control does. */
  toggle: () => void
  /** The picker: beside the control on a computer, a sheet on a phone. */
  layer: ReactNode
  /** The branch or pull request that the draft continues, or `null`. */
  chosen: WorkspaceBranchOption | null
}

/**
 * The branch of a New workspace form, which the page and the dialog share:
 * New branch, or an existing branch or open pull request of `repository`.
 * The choice lives in the draft, so a close keeps it, and the picker opens
 * with it still checked. The list belongs to the form: it keeps its search
 * and its rows while the picker closes and opens again, and a new form
 * reads them again. A close stops the search that waits for its pause and
 * each read that runs. The reads go through the services of the org, so a
 * refusal of a suspended org marks the org. Escape and a press outside
 * `anchor`, the wrapper of the control and the picker, close the picker. A
 * phone shows it in a sheet.
 */
export function useBranchPicker(
  orgId: string,
  model: NewWorkspaceModel,
  repository: Repository,
  anchor: RefObject<HTMLSpanElement | null>,
): BranchPicker {
  const services = useOrgServices(orgId)
  const [list] = useState(() => new BranchList(services, orgId))
  const [open, setOpen] = useState(false)
  const { branch } = useStore(model.draft)
  const phone = useViewport() === 'phone'
  const close = () => setOpen(false)
  // While the picker shows, its list reads the rows of the repository. A
  // close, or another repository, stops the search that waits and each read.
  useEffect(() => {
    if (!open) return undefined
    list.open(repository.id)
    return () => list.stop()
  }, [open, list, repository.id])
  useDismiss(open && !phone, anchor, close)
  // The palette key closes the picker beside its control. A sheet holds it.
  useMenuLayer(open && !phone, () => {
    close()
    return true
  })
  const choose = (option: WorkspaceBranchOption | null) => {
    if (option === null) model.newBranch()
    else model.chooseBranch(repository.id, option)
    close()
  }
  const menu = (placement: 'below-start' | 'sheet') => (
    <BranchMenu
      choose={choose}
      chosen={branch}
      close={close}
      list={list}
      placement={placement}
      repository={repository}
    />
  )
  let layer: ReactNode = null
  if (open && phone) {
    layer = (
      <Sheet close={close} title="Branch">
        <div className={sheetStyles.body}>{menu('sheet')}</div>
      </Sheet>
    )
  } else if (open) layer = menu('below-start')
  return {
    open,
    toggle: () => {
      // The list starts to load before the first render of the picker.
      if (!open) list.open(repository.id)
      setOpen(!open)
    },
    layer,
    chosen: branch,
  }
}
