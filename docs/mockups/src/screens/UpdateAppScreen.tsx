import type { Viewport } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { updateAppCopy as copy } from '../components/phone/appStopCopy'
import { noop } from '../../../../src/ui/noop'
import { signInFrame } from '../entries/components/screens/signInFrame.mockup'
import styles from '../../../../src/ui/screens/SignInScreen.module.css'

/**
 * The page of a phone app whose version the server refused, because it is
 * older than the minimum version. Nothing else in the app works until the
 * update, so the page has one action and no foot. Update opens the page of
 * the app in the store of the platform, which is outside the catalogue.
 */
export function UpdateAppScreen(props: { viewport: Viewport }) {
  return (
    <signInFrame.Component
      bare
      label={copy.title}
      moklyInstance="update-app-frame"
      phoneApp
      viewport={props.viewport}
    >
      <h1 className={styles.title}>{copy.title}</h1>
      <p className={styles.text}>{copy.text}</p>
      <Button block onPress={noop} size="lg" tone="primary">
        {copy.action}
      </Button>
    </signInFrame.Component>
  )
}
