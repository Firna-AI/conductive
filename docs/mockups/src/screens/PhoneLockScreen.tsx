import type { Viewport } from '@mokly/mokly'
import { LockScreen } from '../components/phone/LockScreen'
import { lockScreenNotices, lockScreenTime } from '../fixtures/phoneNotices'
import { paths } from '../paths'

/**
 * The lock screen of the phone of Cal, with one notice for each kind of
 * event. A tablet in landscape shows the same notices beside the time.
 * The notice of the secret request opens its workspace, where the request
 * waits above the composer.
 */
export function PhoneLockScreen(props: { viewport: Viewport }) {
  return (
    <LockScreen
      layout={props.viewport === 'mobile' ? 'phone' : 'tablet'}
      links={{ secret: paths.secretRequests }}
      notices={lockScreenNotices}
      time={lockScreenTime}
    />
  )
}
