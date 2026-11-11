import { X } from 'lucide-react'
import { IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { useTouch } from '../common/touch'
import tabScroll from '../workspace/TabScroll.module.css'
import styles from './PreviewTabs.module.css'

export type PreviewTab = {
  /** The port and the cut name of the server, from `previewTabLabel`. */
  label: string
  /** The tooltip and the spoken name: the whole name and the folder. */
  title?: string
  to: string
  selected: boolean
}

/**
 * The tabs of the open previews. Each tab is a link to its preview, with
 * its Close button beside its label, as the tabs of the centre tab row
 * have. `fadeEnd` marks a row that clips tabs at its end. A view runs no
 * script, so the screen says when its row clips.
 */
export function PreviewTabs(props: {
  tabs: readonly PreviewTab[]
  fadeEnd?: boolean
}) {
  return (
    <nav
      aria-label="Previews"
      className={classes(
        styles.tabs,
        useTouch() && styles.touch,
        props.fadeEnd && tabScroll.fadeEnd,
      )}
    >
      {props.tabs.map((tab) => (
        <span
          className={classes(styles.tab, tab.selected && styles.selected)}
          key={tab.label}
        >
          <ScreenLink
            aria-current={tab.selected ? 'page' : undefined}
            aria-label={tab.title}
            className={styles.link}
            title={tab.title}
            to={tab.to}
          >
            {tab.label}
          </ScreenLink>
          <span className={styles.close}>
            <IconButton icon={X} label={`Close ${tab.label}`} quiet />
          </span>
        </span>
      ))}
    </nav>
  )
}
