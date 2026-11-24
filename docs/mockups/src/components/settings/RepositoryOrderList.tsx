import type { ReactNode } from 'react'
import { FolderGit2, GripVertical, MoreHorizontal } from 'lucide-react'
import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import type { ReachableRepository } from '../../fixtures/repositories'
import { IconButton } from '../../../../../src/ui/components/common/actions'
import a11y from '../../../../../src/ui/components/common/a11y.module.css'
import { classes } from '../../../../../src/ui/components/common/classes'
import { Menu } from '../../../../../src/ui/components/common/Menu'
import { Sheet } from '../../../../../src/ui/components/common/Sheet'
import {
  defaultRepositoryLabel,
  repositoryMenuOf,
  repositoryPlaceText,
} from '../../../../../src/ui/components/settings/repositoryOrder'
import list from '../../../../../src/ui/components/settings/RepositoryList.module.css'
import styles from '../../../../../src/ui/components/settings/RepositoryOrderList.module.css'
import { RemoveRepositoryDialog } from './RemoveRepositoryDialog'

/**
 * The state of the order on the Repositories tab: the plain list, the row
 * menu of the second repository open, a drag of the last repository to the
 * top, the list after Make default on the second repository, or the
 * question after Remove in the row menu of the first or the last
 * repository.
 */
export const repositoryOrderStates = [
  'list',
  'menu',
  'drag',
  'moved',
  'remove-first',
  'remove-last',
] as const
export type RepositoryOrderState = (typeof repositoryOrderStates)[number]

/** The chosen repositories of the fixture, in the order of the state. */
function orderedRepositories(
  repositories: readonly ReachableRepository[],
  state: RepositoryOrderState,
): ReachableRepository[] {
  const chosen = repositories.filter((repository) => repository.used)
  if (state !== 'moved' || chosen.length < 2) return chosen
  const [first, second, ...rest] = chosen
  return [second, first, ...rest]
}

function Row(props: {
  repository: ReachableRepository
  place: number
  count: number
  canMove: boolean
  menu: 'closed' | 'open'
  drag?: 'placeholder' | 'lifted'
  viewport: Viewport
}) {
  const { repository, place } = props
  return (
    <li
      className={classes(
        list.row,
        props.drag === 'placeholder' && styles.placeholder,
        props.drag === 'lifted' && styles.lifted,
      )}
    >
      {props.canMove ? (
        <GripVertical aria-hidden className={styles.handle} size={14} />
      ) : null}
      <FolderGit2 aria-hidden className={list.icon} size={15} />
      <span className={list.text}>
        <span className={list.name}>{repository.name}</span>
        <span className={list.description}>{repository.description}</span>
      </span>
      {place === 0 ? (
        <span className={styles.label}>{defaultRepositoryLabel}</span>
      ) : null}
      {props.canMove ? (
        <span className={styles.anchor}>
          <IconButton
            expanded={props.menu === 'open'}
            icon={MoreHorizontal}
            label={`More for ${repository.name}`}
            menu
            quiet
          />
          {props.menu === 'open' && props.viewport === 'desktop' ? (
            <Menu
              entries={repositoryMenuOf(place, props.count)}
              label={repository.name}
              placement="below-end"
            />
          ) : null}
        </span>
      ) : null}
    </li>
  )
}

/** Where the dragged repository lands: a line above the first row. */
function DropLine() {
  return (
    <li aria-hidden className={styles.drop}>
      <span className={styles.line} />
    </li>
  )
}

/**
 * The chosen repositories in the order of the org. The first one shows
 * Default. An admin gets a drag handle and a row menu on each row, and a
 * member sees the order read-only. A drag shows the lifted row under the
 * pointer, a faint copy in its place, and a line where it lands.
 */
export function RepositoryOrderList(props: {
  repositories: readonly ReachableRepository[]
  state: RepositoryOrderState
  canMove: boolean
  viewport: Viewport
}) {
  const rows = orderedRepositories(props.repositories, props.state)
  const drag = props.canMove && props.state === 'drag'
  const dragged = rows.length - 1
  const moved = props.state === 'moved' && rows.length > 1
  return (
    <div className={styles.wrap}>
      <ul aria-label="Repositories" className={list.list}>
        {drag ? <DropLine /> : null}
        {rows.map((repository, place) => (
          <Row
            canMove={props.canMove}
            count={rows.length}
            drag={drag && place === dragged ? 'placeholder' : undefined}
            key={repository.name}
            menu={
              props.canMove && props.state === 'menu' && place === 1
                ? 'open'
                : 'closed'
            }
            place={place}
            repository={repository}
            viewport={props.viewport}
          />
        ))}
      </ul>
      {drag ? (
        <ul aria-hidden className={classes(list.list, styles.floating)}>
          <Row
            canMove
            count={rows.length}
            drag="lifted"
            menu="closed"
            place={dragged}
            repository={rows[dragged]}
            viewport={props.viewport}
          />
        </ul>
      ) : null}
      {moved ? (
        <span className={a11y.hidden} role="status">
          {repositoryPlaceText(rows[0].name, 0, rows.length)}
        </span>
      ) : null}
    </div>
  )
}

/**
 * The row menu of the second repository on a phone: a sheet with the name
 * of the repository, which the screen draws over the page.
 */
function RepositoryMenuSheet(props: {
  repositories: readonly ReachableRepository[]
}) {
  const rows = orderedRepositories(props.repositories, 'menu')
  const repository = rows[1]
  if (!repository) return null
  return (
    <Sheet title={repository.name}>
      <Menu
        entries={repositoryMenuOf(1, rows.length)}
        label={repository.name}
        placement="sheet"
      />
    </Sheet>
  )
}

/**
 * What the order of an admin draws over the page in its state: the row
 * menu of a phone as a sheet, the question after Remove of the first or
 * the last repository, or nothing.
 */
export function repositoryOrderOverlay(
  state: RepositoryOrderState,
  repositories: readonly ReachableRepository[],
  viewport: Viewport,
): ReactNode {
  if (state === 'menu' && viewport === 'mobile') {
    return <RepositoryMenuSheet repositories={repositories} />
  }
  if (state !== 'remove-first' && state !== 'remove-last') return null
  return (
    <RemoveRepositoryDialog
      chosen={orderedRepositories(repositories, state)}
      place={state === 'remove-first' ? 0 : -1}
      viewport={viewport}
    />
  )
}
