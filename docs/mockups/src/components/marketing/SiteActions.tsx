import { Button } from '@firna/ui/button'
import { siteActionCopy } from '../../../../../src/marketing/access-copy'
import { noop } from '../../../../../src/ui/noop'
import { paths } from '../../paths'
import { githubMark } from '../../entries/components/common/GitHubMark.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { classes } from '../../../../../src/ui/components/common/classes'
import { siteIcons } from './siteIcons'
import styles from './SiteActions.module.css'

const DownloadIcon = siteIcons.download

/**
 * The main action of the site, Sign up, which starts the GitHub sign-in.
 * The first sign-in of a new person creates the account. The account waits
 * for app access, or gets it at once during open sign-up.
 */
export function StartButton(props: {
  to: string
  size: 'md' | 'lg'
  block?: boolean
  /** The place of the button, which names its mark for Mokly. */
  place: 'header' | 'hero' | 'closing'
}) {
  return (
    <ScreenLink asChild to={props.to}>
      <Button
        block={props.block}
        iconNode={
          <githubMark.Component
            className={styles.mark}
            moklyInstance={`sign-up-${props.place}`}
            size={16}
          />
        }
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
export function SiteActions(props: {
  to: string
  stack?: boolean
  place: 'hero' | 'closing'
}) {
  return (
    <div className={classes(styles.actions, props.stack && styles.stack)}>
      <StartButton
        block={props.stack}
        place={props.place}
        size="lg"
        to={props.to}
      />
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
