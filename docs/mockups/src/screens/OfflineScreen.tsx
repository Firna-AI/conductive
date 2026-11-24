import type { Viewport } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { RotateCw } from 'lucide-react'
import { ScreenLink } from '../components/common/ScreenLink'
import { offlineCopy as copy } from '../components/phone/appStopCopy'
import { noop } from '../../../../src/ui/noop'
import { paths } from '../paths'
import { signInFrame } from '../entries/components/screens/signInFrame.mockup'
import styles from '../../../../src/ui/screens/SignInScreen.module.css'

/**
 * The page of a phone app that starts without a connection, before it has
 * any data to show. The legal pages cannot open without a connection, so
 * the page has no foot. Try again starts the app again, which opens the
 * workspace list of a person who is signed in.
 */
export function OfflineScreen(props: { viewport: Viewport }) {
  return (
    <signInFrame.Component
      bare
      label={copy.title}
      moklyInstance="offline-frame"
      phoneApp
      viewport={props.viewport}
    >
      <h1 className={styles.title}>{copy.title}</h1>
      <p className={styles.text}>{copy.text}</p>
      <ScreenLink asChild to={paths.shell}>
        <Button block icon={RotateCw} onPress={noop} size="lg" tone="primary">
          {copy.action}
        </Button>
      </ScreenLink>
    </signInFrame.Component>
  )
}
