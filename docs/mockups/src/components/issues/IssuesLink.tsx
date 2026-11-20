import { CircleDot } from 'lucide-react'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import links from '../workspaces/SidebarLinks.module.css'
import styles from './IssuesLink.module.css'

/**
 * The row under New workspace that opens the Issues page of the org. Its
 * count is the open issues of the person signed in, which no workspace
 * works on yet.
 */
export function IssuesLink(props: {
  to: string
  current?: boolean
  count?: number
  variant: 'sidebar' | 'page'
}) {
  return (
    <ScreenLink
      aria-current={props.current ? 'page' : undefined}
      className={classes(
        links.row,
        props.variant === 'page' && links.page,
        props.current && links.selected,
      )}
      to={props.to}
    >
      <CircleDot aria-hidden className={links.icon} size={14} />
      Issues
      {props.count ? (
        <span className={styles.count}>
          {props.count}
          <span className={a11y.hidden}> to start</span>
        </span>
      ) : null}
    </ScreenLink>
  )
}
