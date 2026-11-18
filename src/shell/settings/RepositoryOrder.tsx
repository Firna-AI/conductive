import { useEffect, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '@firna/ui/toast'
import { FolderGit2, GripVertical, MoreHorizontal } from 'lucide-react'
import a11y from '../../../docs/mockups/src/components/common/a11y.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import list from '../../../docs/mockups/src/components/settings/RepositoryList.module.css'
import styles from '../../../docs/mockups/src/components/settings/RepositoryOrderList.module.css'
import {
  defaultRepositoryLabel,
  repositoryMenuItems,
} from '../../../docs/mockups/src/components/settings/repositoryOrder'
import { errorMessage } from '../../app/api/client'
import type { OrgModel } from '../../app/org-model'
import { moveRepository } from '../../app/settings-actions'
import type { Repository } from '../../shared/org-settings'
import { SectionText } from '../../../docs/mockups/src/components/settings/Section'
import { IconButton } from '../ui/actions'
import { MenuButton, type MenuEntry } from '../ui/Menu'
import { useListDrag, type ListDrag } from '../ui/useListDrag'
import { useListMoves } from '../ui/useListMoves'

/** A chosen repository as the order moves it: its ID and its spoken name. */
interface Movable {
  id: string
  name: string
  repository: Repository
}

/** The Default label of the first chosen repository, for every person. */
export function DefaultLabel() {
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
 * outside Edit (repository-order decision 1 F). The first one shows
 * Default. Each row moves by a drag, by a long press on a phone, by its
 * row menu with Make default, Move up, and Move down, and by Alt and Up or
 * Down while the focus is in the row. Each move saves at once and starts
 * no build. A failed save takes back that move and shows a toast. The
 * status tells a screen reader the place of a drag or the new place after
 * a move.
 */
export function RepositoryOrder(props: {
  model: OrgModel
  repositories: readonly Repository[]
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
  const moves = useListMoves({ items, move })
  const drag = useListDrag(items, move)
  const dragging = drag.dragged !== null
  const { forget } = moves
  useEffect(() => {
    if (dragging) forget()
  }, [dragging, forget])
  if (items.length === 0) {
    return <SectionText muted>Select Edit to add a repository.</SectionText>
  }

  const entries = (item: Movable, place: number): MenuEntry[] =>
    repositoryMenuItems(place, items.length).map((entry) => ({
      kind: 'item',
      label: entry.label,
      icon: entry.icon,
      disabled: entry.disabled,
      onSelect: () => {
        if (entry.move === 'default') moves.place(item, 0)
        else moves.step(item, entry.move === 'up' ? -1 : 1)
      },
    }))
  return (
    <div className={styles.wrap}>
      <ul aria-label="Repositories" className={list.list}>
        {items.map((item, place) => (
          <Row
            drag={drag}
            entries={entries(item, place)}
            item={item}
            key={item.id}
            onKeyDown={(event) => moves.onKeyDown(item, event)}
            place={place}
          />
        ))}
        {drag.lineAtEnd ? <DropLine /> : null}
      </ul>
      <LiftedRow drag={drag} />
      <span className={a11y.hidden} role="status">
        {drag.status || moves.status}
      </span>
    </div>
  )
}

function Row(props: {
  item: Movable
  place: number
  entries: readonly MenuEntry[]
  drag: ListDrag<Movable>
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean
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
