import type { KeyboardEvent, RefCallback } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '@firna/ui/toast'
import { FolderGit2, GripVertical, MoreHorizontal } from 'lucide-react'
import a11y from '../../ui/components/common/a11y.module.css'
import { classes } from '../../ui/components/common/classes'
import list from '../../ui/components/settings/RepositoryList.module.css'
import styles from '../../ui/components/settings/RepositoryOrderList.module.css'
import {
  defaultRepositoryLabel,
  repositoryMenuItems,
} from '../../ui/components/settings/repositoryOrder'
import { errorMessage } from '../../app/api/client'
import type { OrgModel } from '../../app/org-model'
import { moveRepository } from '../../app/settings-actions'
import type { Repository } from '../../shared/org-settings'
import { SectionText } from '../../ui/components/settings/Section'
import { IconButton } from '../ui/actions'
import { MenuButton, type MenuEntry } from '../ui/Menu'
import type { ListDrag } from '../ui/useListDrag'
import { useListOrder } from '../ui/useListOrder'
import { RemoveRepositoryDialog } from './RemoveRepositoryDialog'
import { useRowRemoval } from './useRowRemoval'

/** A chosen repository as the order moves it: its ID and its spoken name. */
interface Movable {
  id: string
  name: string
  repository: Repository
}

/** The Default label of the first chosen repository, for every person. */
function DefaultLabel() {
  return <span className={styles.label}>{defaultRepositoryLabel}</span>
}

/** The text and the label of a chosen repository, as every row shows it. */
function RowText(props: { repository: Repository; first: boolean }) {
  const { repository } = props
  return (
    <>
      <FolderGit2 aria-hidden className={list.icon} size={15} />
      <span className={list.text}>
        <span className={list.name}>{repository.fullName}</span>
        {repository.description === '' ? null : (
          <span className={list.description}>{repository.description}</span>
        )}
      </span>
      {props.first ? <DefaultLabel /> : null}
    </>
  )
}

/** The lifted copy of the dragged row, under the pointer. */
function LiftedRow(props: { drag: ListDrag<Movable> }) {
  const { dragged, lifted } = props.drag
  if (!dragged || !lifted) return null
  return createPortal(
    <ul
      aria-hidden
      className={list.list}
      style={{
        position: 'fixed',
        zIndex: 40,
        top: lifted.top - 22,
        left: lifted.left,
        width: lifted.width,
        border: 0,
        pointerEvents: 'none',
      }}
    >
      <li className={classes(list.row, styles.lifted)}>
        <GripVertical aria-hidden className={styles.handle} size={14} />
        <RowText first={false} repository={dragged.repository} />
      </li>
    </ul>,
    document.body,
  )
}

/** The drop line before a row, which takes no space. */
function DropLine() {
  return (
    <li aria-hidden className={styles.drop}>
      <span className={styles.line} />
    </li>
  )
}

/**
 * The chosen repositories of the org in the repository order, for an admin
 * outside Edit, as the repository order protocol doc says. The first one
 * shows Default. Each row moves by a drag, by a long press on a phone, by
 * its row menu with Make default, Move up, and Move down, and by Alt and
 * Up or Down while the focus is in the row. Each move saves at once and
 * starts no build. A failed save takes back that move and shows a toast.
 * Remove, the last item of the row menu, asks first, as `useRowRemoval`
 * and `RemoveRepositoryDialog` say. The question renders outside the rows,
 * so its keys never reach the moves of a row. The status tells a screen
 * reader the place of a drag, the new place after a move, or a removal.
 * It stays when no row is left. `focusEdit` gives the focus to Edit.
 */
export function RepositoryOrder(props: {
  model: OrgModel
  repositories: readonly Repository[]
  focusEdit: () => void
}) {
  const { toast } = useToast()
  const items: Movable[] = props.repositories
    .filter((repository) => repository.selected)
    .map((repository) => ({
      id: repository.id,
      name: repository.fullName,
      repository,
    }))
  const move = (id: string, index: number) => {
    void moveRepository(props.model, id, index).catch((error: unknown) =>
      toast({
        title: "The repository didn't move.",
        description: errorMessage(error),
        tone: 'error',
      }),
    )
  }
  const { drag, moves, status } = useListOrder({ items, move })
  const removal = useRowRemoval({
    rows: items,
    status,
    forgetMoves: moves.forget,
    focusEdit: props.focusEdit,
  })
  const entries = (item: Movable, place: number): MenuEntry[] =>
    repositoryMenuItems(place, items.length).map((entry) =>
      entry.kind === 'divider'
        ? entry
        : {
            kind: 'item',
            label: entry.label,
            icon: entry.icon,
            disabled: entry.disabled,
            tone: entry.tone,
            onSelect: () => {
              if (entry.action === 'remove') removal.ask(item, place)
              else if (entry.action === 'default') moves.place(item, 0)
              else moves.step(item, entry.action === 'up' ? -1 : 1)
            },
          },
    )
  return (
    <>
      <div className={styles.wrap}>
        {items.length === 0 ? (
          <SectionText muted>Select Edit to add a repository.</SectionText>
        ) : (
          <ul aria-label="Repositories" className={list.list}>
            {items.map((item, place) => (
              <Row
                drag={drag}
                entries={entries(item, place)}
                item={item}
                key={item.id}
                menuRef={removal.menuRef(item.id)}
                onKeyDown={(event) => moves.onKeyDown(item, event)}
                place={place}
              />
            ))}
            {drag.lineAtEnd ? <DropLine /> : null}
          </ul>
        )}
        <LiftedRow drag={drag} />
        <span className={a11y.hidden} role="status">
          {removal.status}
        </span>
      </div>
      {removal.asked ? (
        <RemoveRepositoryDialog
          asked={removal.asked}
          close={removal.close}
          done={removal.done}
          model={props.model}
          returnFocus={removal.returnFocus}
        />
      ) : null}
    </>
  )
}

function Row(props: {
  item: Movable
  place: number
  entries: readonly MenuEntry[]
  drag: ListDrag<Movable>
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean
  /** The ref of the row menu button, which takes the focus after a removal. */
  menuRef: RefCallback<unknown>
}) {
  const { item, drag } = props
  return (
    <>
      {drag.lineBefore === item.id ? <DropLine /> : null}
      <li
        {...drag.bind(item, props.place)}
        className={classes(
          list.row,
          drag.dragged?.id === item.id && styles.placeholder,
        )}
        onKeyDown={(event) => {
          props.onKeyDown(event)
        }}
        ref={drag.itemRef(item.id)}
      >
        <GripVertical aria-hidden className={styles.handle} size={14} />
        <RowText first={props.place === 0} repository={item.repository} />
        <MenuButton
          entries={props.entries}
          label={item.name}
          trigger={({ open, toggle }) => (
            <IconButton
              buttonRef={props.menuRef}
              expanded={open}
              icon={MoreHorizontal}
              label={`More for ${item.name}`}
              menu
              onPress={toggle}
              quiet
            />
          )}
        />
      </li>
    </>
  )
}
