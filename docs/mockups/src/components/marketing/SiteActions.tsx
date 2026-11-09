import { Button } from '@firna/ui/button'
import { noop } from '../../noop'
import { GitHubMark } from '../common/GitHubMark'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import styles from './SiteActions.module.css'

/**
 * The words of the main action. A new person waits for app access, so the
 * words promise a place on the waitlist, not use at once.
 */
export const startLabel = 'Join the waitlist'

/**
 * The main action of the site, which starts the GitHub sign-in. The first
 * sign-in of a new person puts them on the waitlist.
 */
export function StartButton(props: {
  to: string
  size: 'md' | 'lg'
  block?: boolean
}) {
  return (
    <ScreenLink asChild to={props.to}>
      <Button
        block={props.block}
        iconNode={<GitHubMark className={styles.mark} size={16} />}
        onPress={noop}
        size={props.size}
        tone="primary"
      >
        {startLabel}
      </Button>
    </ScreenLink>
  )
}

/**
 * The two actions of the site: join the waitlist, and sign in. Both go to
 * the GitHub sign-in, which also creates the account of a new person.
 * `stack` puts them under each other at full width, as on a phone.
 */
export function SiteActions(props: { to: string; stack?: boolean }) {
  return (
    <div className={classes(styles.actions, props.stack && styles.stack)}>
      <StartButton block={props.stack} size="lg" to={props.to} />
      <ScreenLink asChild to={props.to}>
        <Button block={props.stack} onPress={noop} size="lg" tone="secondary">
          Sign in
        </Button>
      </ScreenLink>
    </div>
  )
}
