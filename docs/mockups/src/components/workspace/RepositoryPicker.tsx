import { repositories, type RepositoryKey } from '../../fixtures/repositories'
import { movedRepository } from '../../fixtures/repositoryMove'
import { paths } from '../../paths'
import {
  Menu,
  type MenuEntry,
} from '../../../../../src/ui/components/common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { RepositoryButton } from '../../../../../src/ui/components/workspace/RepositoryButton'
import { repositoryMenu } from '../../../../../src/ui/components/workspace/repositoryMoveCopy'
import styles from '../../../../../src/ui/components/workspace/RepositoryPicker.module.css'

/**
 * The repositories that the org chose, with the current one marked. A pick
 * moves the workspace to a new branch of that repository. The menu lists
 * no other repository. The rows have no icons, as in the menu of New
 * workspace.
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
  ]
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
  const button = (
    <RepositoryButton
      changing={props.changing}
      expanded={props.open}
      inline={props.inline}
      name={repositories[props.repository].name}
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
