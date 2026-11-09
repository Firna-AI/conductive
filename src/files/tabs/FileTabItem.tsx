import { X } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { splitPath, type FilesNavigation, type FilesTab } from '../navigation'
import { FileIcon } from '../panel/file-icons'
import { IconButton } from '../ui/actions'
import { FilesLink } from '../ui/FilesLink'
import { classes } from '../ui/classes'

/**
 * The closable tab of an open file or diff, for the tab row of the centre
 * column on desktop. It is a list item, so the shell puts it in the same
 * list as the session tabs, and it takes their styles from the mockups. The
 * tab is a link to its own address.
 */
export function FileTabItem(props: {
  tab: FilesTab
  selected: boolean
  navigation: FilesNavigation
  onClose: () => void
}) {
  const { tab } = props
  const { name } = splitPath(tab.path)
  const diff = tab.kind === 'diff'
  return (
    <li className={classes(styles.tab, props.selected && styles.selected)}>
      <FilesLink
        aria-current={props.selected ? 'page' : undefined}
        aria-label={diff ? `${name} changes` : undefined}
        className={styles.link}
        navigation={props.navigation}
        title={tab.path}
        to={tab}
      >
        <FileIcon
          className={styles.icon}
          diff={diff}
          path={tab.path}
          size={13}
        />
        <span className={styles.title}>{name}</span>
      </FilesLink>
      <span className={styles.close}>
        <IconButton
          icon={X}
          label={`Close ${diff ? `${name} changes` : name}`}
          onPress={props.onClose}
          quiet
        />
      </span>
    </li>
  )
}
