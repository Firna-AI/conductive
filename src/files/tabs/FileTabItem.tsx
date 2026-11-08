import { X } from 'lucide-react'
import { labelName } from '../model/file-labels'
import type { FilesNavigation, FilesTab } from '../navigation'
import { FileIcon } from '../panel/file-icons'
import { IconButton } from '../ui/actions'
import { FilesLink } from '../ui/FilesLink'
import { classes } from '../ui/classes'
import styles from './FileTabItem.module.css'

/**
 * The closable tab of an open file or diff, for the tab row of the centre
 * column on desktop. It is a list item, so the shell puts it in the same
 * list as the session tabs. The tab is a link to its own address. It shows
 * the label of its path, or "File" when no record names the file.
 */
export function FileTabItem(props: {
  tab: FilesTab
  /** The label of the path, from `listLabel`, or null. */
  label: string | null
  selected: boolean
  navigation: FilesNavigation
  onClose: () => void
}) {
  const { tab } = props
  const name = labelName(props.label)
  const diff = tab.kind === 'diff'
  return (
    <li className={classes(styles.tab, props.selected && styles.selected)}>
      <FilesLink
        aria-current={props.selected ? 'page' : undefined}
        aria-label={diff ? `${name} changes` : undefined}
        className={styles.link}
        navigation={props.navigation}
        title={props.label ?? undefined}
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
