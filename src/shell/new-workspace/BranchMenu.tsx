import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type Ref,
  type RefObject,
} from 'react'
import { InputFrame, type InputFrameProps } from '@firna/ui/input'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Search } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import menu from '../../../docs/mockups/src/components/common/Menu.module.css'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import picker from '../../../docs/mockups/src/components/new-workspace/BranchPicker.module.css'
import type { BranchList, BranchRows } from '../../app/branch-list'
import { optionKey } from '../../app/branch-options'
import { useStore } from '../../app/store'
import type { Repository } from '../../shared/org-settings'
import type { WorkspaceBranchOption } from '../../shared/workspace-branches'
import { LoadFailure } from '../ui/LoadFailure'
import { useLayerFocus } from '../ui/Overlay'
import { BranchEntries, newBranchKey } from './BranchRows'
import { useWithinWindow } from './within-window'

/** The handle of the text field of Firna, which takes the focus. */
type FieldHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

/** The parts of the picker that the arrow keys move between. */
const ITEM = '[role^="menuitem"]'

/**
 * The arrow keys move from the search field down the rows and back up,
 * and Home and End go to the first and the last row. Tab closes the picker
 * beside its control, as it closes every menu, and a sheet keeps Tab.
 * The keys count in the capture phase, because a text field stops them.
 */
function moveFocus(
  event: KeyboardEvent<HTMLDivElement>,
  close: () => void,
  sheet: boolean,
) {
  if (event.key === 'Tab') {
    if (!sheet) close()
    return
  }
  const box = event.currentTarget
  const field = box.querySelector('input')
  const items = Array.from(box.querySelectorAll<HTMLElement>(ITEM))
  const stops = field ? [field, ...items] : items
  const at = stops.findIndex((stop) => stop === document.activeElement)
  const inField = field !== null && at === 0
  const targets: Record<string, HTMLElement | undefined> = {
    ArrowDown: stops[(at + 1) % stops.length],
    ArrowUp: stops[(at - 1 + stops.length) % stops.length],
    Home: inField ? undefined : items[0],
    End: inField ? undefined : items.at(-1),
  }
  const target = targets[event.key]
  if (!target) return
  event.preventDefault()
  target.focus()
}

/** The row of `key` in the picker, such as a row that Show more added. */
function rowOf(box: HTMLElement, key: string): HTMLElement | undefined {
  return Array.from(box.querySelectorAll<HTMLElement>('[data-option]')).find(
    (row) => row.dataset.option === key,
  )
}

/**
 * Keeps the focus in the picker when the control that has it goes, such
 * as Show more after the last page, or Try again: the first row that Show
 * more added takes it, else the search field on a computer, or New branch
 * in a sheet, which has no search ref. `moreFromRef` holds the number of
 * rows when Show more went.
 */
function useKeptFocus(
  boxRef: RefObject<HTMLElement | null>,
  rows: BranchRows,
  moreFromRef: RefObject<number | null>,
  searchRef: RefObject<FieldHandle | null> | null,
) {
  useEffect(() => {
    const node = boxRef.current
    if (!node || (rows.state === 'ready' && rows.more.state === 'reading')) {
      return
    }
    const from = moreFromRef.current
    moreFromRef.current = null
    const active = document.activeElement
    const lost = active === null || active === document.body
    const added =
      rows.state === 'ready' && from !== null ? rows.rows[from] : null
    const target = added ? rowOf(node, optionKey(added)) : undefined
    if (target && (lost || node.contains(active))) target.focus()
    else if (lost && searchRef) searchRef.current?.focus()
    else if (lost) rowOf(node, newBranchKey)?.focus()
  }, [boxRef, rows, moreFromRef, searchRef])
}

/** The list under the rows while it loads, or after it did not load. */
function Status(props: { rows: BranchRows; retry: () => Promise<void> }) {
  const theme = useSharedUiTheme()
  const { rows } = props
  if (rows.state === 'loading') {
    return (
      <span className={picker.loading}>
        <Spinner color={theme.colors.muted} size={13} />
        Loading branches
      </span>
    )
  }
  if (rows.state === 'failed') {
    return (
      <LoadFailure
        error={rows.error}
        retry={props.retry}
        title="The branches didn't load"
      />
    )
  }
  if (rows.more.state !== 'failed') return null
  return (
    <LoadFailure
      error={rows.more.error}
      retry={props.retry}
      title="More branches didn't load"
    />
  )
}

/**
 * The branch picker of New workspace: a search field, New branch, the open
 * pull requests, and the branches of the repository on GitHub without its
 * default branch. It hangs below its control on a computer, inside the
 * window, where the search takes the focus, and fills a sheet on a phone. The search and the
 * pages come from `list`, and a choice goes to `choose`, with `null` for
 * New branch.
 */
export function BranchMenu(props: {
  placement: 'below-start' | 'sheet'
  list: BranchList
  repository: Repository
  chosen: WorkspaceBranchOption | null
  choose: (option: WorkspaceBranchOption | null) => void
  close: () => void
}) {
  const { list, placement } = props
  const sheet = placement === 'sheet'
  const { field } = useControlSizes()
  const { text, rows } = useStore(list.state)
  const box = useRef<HTMLDivElement>(null)
  const search = useRef<FieldHandle>(null)
  const moreFrom = useRef<number | null>(null)
  const rowsId = useId()
  // The box fits the window before the search takes the focus, so the
  // focus does not scroll the page.
  useWithinWindow(box, !sheet)
  useLayerFocus(box, { modal: false, enabled: !sheet, initial: search })
  useKeptFocus(box, rows, moreFrom, sheet ? null : search)
  const more = () => {
    if (rows.state === 'ready') moreFrom.current = rows.rows.length
    void list.more()
  }
  const status = rows.state !== 'ready' || rows.more.state === 'failed'
  return (
    <div
      className={classes(menu.menu, menu[placement], menu.wide)}
      onKeyDownCapture={(event) => moveFocus(event, props.close, sheet)}
      ref={box}
    >
      <div className={menu.search}>
        <InputFrame
          accessibilityLabel="Search branches and pull requests"
          aria-controls={rowsId}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          inputRef={search}
          onChangeText={(value) => list.search(value)}
          onSubmitEditing={() => list.searchNow()}
          placeholder="Search branches and pull requests"
          prefixIcon={Search}
          size={field}
          spellCheck={false}
          submitBehavior="submit"
          value={text}
        />
      </div>
      <div aria-label="Branch" className={menu.rows} id={rowsId} role="menu">
        <BranchEntries
          choose={props.choose}
          chosen={props.chosen}
          more={more}
          repository={props.repository}
          rows={rows}
        />
      </div>
      {status ? (
        <div className={menu.status}>
          <Status retry={() => list.retry()} rows={rows} />
        </div>
      ) : null}
    </div>
  )
}
