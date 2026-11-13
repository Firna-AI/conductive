import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from 'react'
import { InputFrame, type InputFrameProps } from '@firna/ui/input'
import { Check, Lock, RotateCw, Search, TriangleAlert } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import menu from '../../../docs/mockups/src/components/common/Menu.module.css'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { branchCopy } from '../../../docs/mockups/src/components/new-workspace/branchCopy'
import styles from '../../../docs/mockups/src/components/new-workspace/BranchPicker.module.css'
import {
  branchRows,
  type BranchRow,
  type BranchStatus,
} from '../../app/branch-rows'
import type { FormBranch } from '../../app/new-workspace-branch'
import { useServices } from '../../app/services'
import type { Loadable } from '../../app/store'
import { formatAgo } from '../../app/time'
import type { RepositoryBranchesResponse } from '../../shared/branches'
import { ActionButton } from '../ui/actions'
import { useLayerFocus } from '../ui/Overlay'

/** The handle of the search field of Firna, which takes the focus. */
type SearchHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

/** A press in the list keeps the focus in the search field. */
function keepFieldFocus(event: MouseEvent) {
  event.preventDefault()
}

/**
 * One branch: its name, its detail, and a check on the branch of the form.
 * The default branch shows `default`, and each other branch the time since
 * its newest commit. The highlighted row is the one that Enter picks.
 */
function Row(props: {
  row: BranchRow
  id: string
  highlighted: boolean
  now: number
  pick: (name: string) => void
}) {
  const { row, highlighted } = props
  const option = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (highlighted) option.current?.scrollIntoView?.({ block: 'nearest' })
  }, [highlighted])
  const detail = row.isDefault
    ? branchCopy.defaultDetail
    : row.committedAt === null
      ? null
      : formatAgo(props.now, row.committedAt)
  return (
    <div
      aria-selected={row.checked}
      className={classes(menu.item, highlighted && menu.highlighted)}
      id={props.id}
      onClick={() => props.pick(row.name)}
      ref={option}
      role="option"
    >
      <span className={menu.label} title={row.name}>
        {row.name}
      </span>
      {detail === null ? null : <span className={menu.detail}>{detail}</span>}
      {row.checked ? (
        <Check aria-hidden className={menu.check} size={14} />
      ) : null}
    </div>
  )
}

/** What stands under the rows, or nothing. */
function Status(props: {
  status: BranchStatus | null
  repository: string
  retry: () => void
}) {
  const { status } = props
  switch (status?.kind) {
    case 'loading':
      return (
        <p className={styles.line} role="status">
          {branchCopy.loading}
        </p>
      )
    case 'no-match':
      return (
        <p className={styles.line} role="status">
          {branchCopy.noMatch(status.query)}
        </p>
      )
    case 'failed':
      return (
        <Notice
          action={
            <ActionButton icon={RotateCw} onPress={props.retry}>
              Try again
            </ActionButton>
          }
          body={branchCopy.failed.body}
          icon={TriangleAlert}
          title={branchCopy.failed.title}
          tone="danger"
        />
      )
    case 'no-access':
      return (
        <Notice
          body={branchCopy.noAccess.body}
          icon={Lock}
          title={branchCopy.noAccess.title(props.repository)}
        />
      )
    case undefined:
      return null
  }
}

/**
 * The open branch picker: the search field, then the default branch, then
 * the other branches by their newest commit, and under them the state of
 * the list. The search field keeps the focus: it is a combobox of the
 * rows. A search highlights its first match, Up and Down move the
 * highlight with a wrap at each end, and Enter picks the highlighted
 * branch. Tab closes a picker beside its control. A phone draws it in a
 * sheet, with rows of touch size, and the sheet holds the focus.
 */
export function BranchList(props: {
  list: Loadable<RepositoryBranchesResponse>
  branch: FormBranch
  /** The full name of the repository, which a notice can name. */
  repository: string
  pick: (name: string) => void
  /** Reads the list again, after a failed read. */
  retry: () => void
  close: () => void
  sheet: boolean
}) {
  const { field } = useControlSizes()
  const { now } = useServices()
  const group = useRef<HTMLDivElement>(null)
  const search = useRef<SearchHandle>(null)
  const [query, setQuery] = useState('')
  // No row is highlighted until a search or an arrow key.
  const [highlight, setHighlight] = useState(-1)
  const id = useId()
  useLayerFocus(group, { modal: false, enabled: !props.sheet })
  const { rows, status } = branchRows(props.list, props.branch, query)
  const time = now()
  const active = Math.min(highlight, rows.length - 1)
  const listboxId = `${id}-branches`
  const optionId = (index: number) => `${id}-branch-${index}`
  const change = (text: string) => {
    setQuery(text)
    setHighlight(text.trim() === '' ? -1 : 0)
  }
  const retry = () => {
    // The notice and its button go, so the field takes the focus back.
    search.current?.focus()
    props.retry()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLInputElement)) return
    if (event.key === 'Tab' && !props.sheet) props.close()
    if (rows.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const from = active < 0 && step < 0 ? 0 : active
      setHighlight((from + step + rows.length) % rows.length)
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      const row = rows[active]
      if (row) props.pick(row.name)
    }
  }
  return (
    <div
      aria-label={branchCopy.picker}
      className={classes(
        styles.list,
        props.sheet && menu.sheet,
        props.sheet && styles.sheet,
      )}
      // The field of Firna keeps its keys from the elements around it, so
      // the list hears them on their way in.
      onKeyDownCapture={onKeyDown}
      ref={group}
      role="group"
    >
      <InputFrame
        accessibilityLabel={branchCopy.search}
        aria-activedescendant={active < 0 ? undefined : optionId(active)}
        aria-autocomplete="list"
        aria-controls={rows.length > 0 ? listboxId : undefined}
        aria-expanded={rows.length > 0}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        inputRef={search}
        onChangeText={change}
        placeholder={branchCopy.search}
        prefixIcon={Search}
        role="combobox"
        size={field}
        spellCheck={false}
        value={query}
      />
      {rows.length > 0 ? (
        <div
          aria-label="Branches"
          className={styles.rows}
          id={listboxId}
          onMouseDown={keepFieldFocus}
          role="listbox"
        >
          {rows.map((row, index) => (
            <Row
              highlighted={index === active}
              id={optionId(index)}
              key={row.name}
              now={time}
              pick={props.pick}
              row={row}
            />
          ))}
        </div>
      ) : null}
      <Status repository={props.repository} retry={retry} status={status} />
    </div>
  )
}
