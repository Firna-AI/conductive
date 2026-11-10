import { Button } from '@firna/ui/button'
import { siteActionCopy } from '../../../../../src/marketing/access-copy'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { GitHubMark } from '../common/GitHubMark'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../common/classes'
import { siteIcons } from './siteIcons'
import styles from './SiteActions.module.css'

const DownloadIcon = siteIcons.download

/**
 * The main action of the site, Sign up, which starts the GitHub sign-in.
 * The first sign-in of a new person creates the account, which then waits
 * for app access.
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
        {siteActionCopy.signUp}
      </Button>
    </ScreenLink>
  )
}

/**
 * The two actions of the hero and of the last call to action: Sign up, which
 * goes to the GitHub sign-in at `to`, and Download for Mac, which leads to
 * the Mac app section of the home page with the download of each chip.
 * `stack` puts them under each other at full width, as on a phone.
 */
export function SiteActions(props: { to: string; stack?: boolean }) {
  return (
    <div className={classes(styles.actions, props.stack && styles.stack)}>
      <StartButton block={props.stack} size="lg" to={props.to} />
      <ScreenLink asChild fragment="mac-app" to={paths.marketing}>
        <Button
          block={props.stack}
          iconNode={<DownloadIcon className={styles.icon} size={16} />}
          onPress={noop}
          size="lg"
          tone="secondary"
        >
          {siteActionCopy.download}
        </Button>
      </ScreenLink>
    </div>
  )
}
