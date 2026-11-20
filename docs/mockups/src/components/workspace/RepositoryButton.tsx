import { Button } from '@firna/ui/button'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ChevronDown, FolderGit2 } from 'lucide-react'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import { repositoryMenu, repositoryProgress } from './repositoryMoveCopy'
import styles from './RepositoryPicker.module.css'

/**
 * The button shrinks inside the room that the line gives it, so a long name
 * ends with an ellipsis and the chevron still shows.
 */
const shrinks = { flexShrink: 1, minWidth: 0 }

/** A phone keeps the button in the line under the name, as Copy link. */
const inLine = {
  touchArea: { top: 16, bottom: 9 },
  style: { ...shrinks, paddingHorizontal: 4 },
}

/**
 * The button of the repository in the header, with the name that it
 * shows. While the change runs, a spinner takes the place of the icon, the
 * chevron goes, and `name` is the new repository. `inline` keeps it in the
 * line under the name of a phone. It takes no fixtures, so the app can use
 * it too.
 */
export function RepositoryButton(props: {
  name: string
  changing?: boolean
  inline?: boolean
  /** The menu of the button is open. */
  expanded?: boolean
  onPress?: () => void
}) {
  const control = useControlSizes()
  const theme = useSharedUiTheme()
  const { name } = props
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
  return (
    <Button
      accessibilityLabel={
        props.changing
          ? `${repositoryProgress}: ${name}`
          : repositoryMenu.button(name)
      }
      content={content}
      expanded={props.expanded ?? false}
      hasPopup="menu"
      hitSlop={props.inline ? inLine.touchArea : undefined}
      inline={props.inline}
      onPress={props.onPress ?? noop}
      size="sm"
      style={
        props.inline
          ? inLine.style
          : { ...shrinks, height: control.height, paddingHorizontal: 6 }
      }
      tone="plain"
    />
  )
}
