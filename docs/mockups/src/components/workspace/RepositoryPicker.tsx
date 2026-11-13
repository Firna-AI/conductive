import { Button } from '@firna/ui/button'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ChevronDown, FolderGit2 } from 'lucide-react'
import { repositories, type RepositoryKey } from '../../fixtures/repositories'
import {
  missingRepository,
  movedRepository,
} from '../../fixtures/repositoryMove'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { Menu, type MenuEntry } from '../common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { repositoryMenu, repositoryProgress } from './repositoryMoveCopy'
import styles from './RepositoryPicker.module.css'

/**
 * The chosen repositories of the org, with the current one marked. A pick
 * moves the workspace to a new branch of that repository. A chosen
 * repository that the cloud computer does not hold keeps its place, with
 * New workspace as its detail. A press on it opens New workspace with that
 * repository. The rows have no icons, as in the menu of New workspace.
 */
export function repositoryMenuEntries(current: RepositoryKey): MenuEntry[] {
  return [
    { kind: 'label', label: repositoryMenu.label },
    ...Object.values(repositories).map((repository): MenuEntry => ({
      kind: 'item',
      label: repository.name,
      checked: repository.key === current,
      highlighted: repository.key === movedRepository,
    })),
    {
      kind: 'item',
      label: missingRepository,
      detail: repositoryMenu.missing,
    },
    { kind: 'divider' },
    { kind: 'note', text: repositoryMenu.note },
    { kind: 'note', text: repositoryMenu.missingNote },
  ]
}

/** A phone keeps the button in the line under the name, as Copy link. */
const inLine = {
  touchArea: { top: 16, bottom: 9 },
  style: { paddingHorizontal: 4 },
}

/**
 * The repository of the open workspace, as a button in its header. Every
 * member of the org may change it, as repository change decision 2 says.
 * `open` draws the menu below the button on desktop. A phone shows the
 * menu as a sheet instead. While the change runs, a spinner takes the
 * place of the icon, and the button shows the new repository.
 */
export function RepositoryPicker(props: {
  repository: RepositoryKey
  open?: boolean
  changing?: boolean
  inline?: boolean
}) {
  const control = useControlSizes()
  const theme = useSharedUiTheme()
  const name = repositories[props.repository].name
  const content = (
    <span className={styles.trigger}>
      {props.changing ? (
        <Spinner color={theme.colors.primary} size={12} />
      ) : (
        <FolderGit2 aria-hidden className={styles.icon} size={13} />
      )}
      <span className={styles.name}>{name}</span>
      {props.changing ? null : (
        <ChevronDown aria-hidden className={styles.icon} size={12} />
      )}
    </span>
  )
  const button = (
    <Button
      accessibilityLabel={
        props.changing
          ? `${repositoryProgress}: ${name}`
          : repositoryMenu.button(name)
      }
      content={content}
      expanded={props.open ?? false}
      hasPopup="menu"
      hitSlop={props.inline ? inLine.touchArea : undefined}
      inline={props.inline}
      onPress={noop}
      size="sm"
      style={
        props.inline
          ? inLine.style
          : { height: control.height, paddingHorizontal: 6 }
      }
      tone="plain"
    />
  )
  return (
    <span className={styles.anchor}>
      {props.open || props.changing ? (
        button
      ) : (
        <ScreenLink asChild to={paths.repositoryMenu}>
          {button}
        </ScreenLink>
      )}
      {props.open && !props.inline ? (
        <Menu
          entries={repositoryMenuEntries(props.repository)}
          label={repositoryMenu.label}
          placement="below-start"
          wide
        />
      ) : null}
    </span>
  )
}
