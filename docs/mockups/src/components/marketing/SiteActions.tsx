import { Button } from '@firna/ui/button'
import { noop } from '../../noop'
import { GitHubMark } from '../common/GitHubMark'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import styles from './SiteActions.module.css'

/** The main action of the site, which starts the GitHub sign-up. */
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
        Start free with GitHub
      </Button>
    </ScreenLink>
  )
}

/**
 * The two actions of the site: start free with GitHub, and sign in. Both go
 * to the GitHub sign-in, which also signs up a new user. `stack` puts them
 * under each other at full width, as on a phone.
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
