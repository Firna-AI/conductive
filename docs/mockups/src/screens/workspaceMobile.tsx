import type { ReactNode } from 'react'
import type { BarModel } from '../../../../src/ui/components/workspace/barModel'
import { usePhoneAppProp } from '../components/phone/PhoneApp'
import type { MobileTabKey } from '../components/workspace/tools'
import { plainData } from '../defined'
import { mobileFrame } from '../entries/components/layout/AppFrame.mockup'
import { mobileTabBar } from '../entries/components/workspace/MobileTabBar.mockup'
import { pullRequestRow } from '../entries/components/workspace/PullRequestBar.mockup'

/**
 * An open workspace on a phone: its header, the row of its pull request,
 * the body with one view at a time, and the tabs that switch the view. An
 * archived workspace shows only its chat, without the row and the tabs.
 * The overlay and the toast lie over the whole screen. In the phone apps
 * the tabs take the mark of the phone apps.
 */
export function WorkspaceMobile(props: {
  header: ReactNode
  bar: BarModel
  archived: boolean
  /** The body: the chat, the files, or the tool. */
  body: ReactNode
  /** The tab of the view. */
  selected: MobileTabKey
  overlay: ReactNode
  toast: ReactNode
}) {
  const phoneApp = usePhoneAppProp()
  return (
    <mobileFrame.Component>
      {props.header}
      {props.archived ? null : (
        <pullRequestRow.Component
          bar={plainData(props.bar)}
          moklyInstance="pull-request-row"
        />
      )}
      {props.body}
      {props.archived ? null : (
        <mobileTabBar.Component
          moklyInstance="mobile-tab-bar"
          selected={props.selected}
          {...phoneApp}
        />
      )}
      {props.overlay}
      {props.toast}
    </mobileFrame.Component>
  )
}
