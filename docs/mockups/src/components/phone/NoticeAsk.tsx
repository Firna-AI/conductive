import type { Viewport } from '@mokly/mokly'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { noticeAskCopy } from './noticeCopy'

/**
 * The ask for notices of the phone app: what the notices are for, Not now,
 * and Turn on notices, which opens the alert of the system. A phone shows
 * a sheet, and the desktop layout of a tablet a dialog.
 */
export function NoticeAsk(props: {
  viewport: Viewport
  notNowTo: string
  turnOnTo: string
}) {
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={props.notNowTo}>
            <actionButton.Component moklyInstance="notice-ask-not-now">
              {noticeAskCopy.notNow}
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={props.turnOnTo}>
            <actionButton.Component
              moklyInstance="notice-ask-turn-on"
              tone="primary"
            >
              {noticeAskCopy.turnOn}
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="notice-ask"
      title={noticeAskCopy.title}
      viewport={props.viewport}
    >
      <dialogText.Component moklyInstance="notice-ask-events">
        {noticeAskCopy.body}
      </dialogText.Component>
      <dialogText.Component moklyInstance="notice-ask-privacy">
        {noticeAskCopy.privacy}
      </dialogText.Component>
    </confirmDialog.Component>
  )
}
