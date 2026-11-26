import type { ReactNode } from 'react'
import type { BarModel } from '../../../../src/ui/components/workspace/barModel'
import type { MobileTabKey } from '../components/workspace/tools'
import { plainData } from '../defined'
import { mobileFrame } from '../entries/components/layout/AppFrame.mockup'
import { mobileTabBar } from '../entries/components/workspace/MobileTabBar.mockup'
import { pullRequestRow } from '../entries/components/workspace/PullRequestBar.mockup'

/**
 * An open workspace on a phone: its header, the row of its pull request,
 * the body with one view at a time, and the tabs that switch the view. An
 * archived workspace shows only its chat, without the row and the tabs.
 * The overlay and the toast lie over the whole screen.
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
        />
      )}
      {props.overlay}
      {props.toast}
    </mobileFrame.Component>
  )
}
