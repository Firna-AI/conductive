import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { RailState } from '../components/layout/OrgRail'
import { SettingsDialog } from '../components/settings/SettingsDialog'
import type { SettingsNavGroup } from '../components/settings/SettingsNav'
import { defined } from '../defined'
import {
  appFrame,
  mobileFrame,
} from '../entries/components/layout/AppFrame.mockup'
import { page as pagePart } from '../entries/components/layout/Page.mockup'
import { chooseWorkspace } from '../entries/components/screens/listParts.mockup'
import { paths } from '../paths'

/**
 * A tab of Settings, on each viewport. A desktop draws the page below, the
 * workspace list of the org, with the Settings dialog over it. A phone
 * draws the tab as a screen of its own, with Settings as the way back to
 * the list of the tabs. `dialog` is a dialog or a sheet that the tab
 * opened, which lies over both. `below` replaces the page below, such as
 * the empty main area of a first run, which has no workspace list.
 */
export function SettingsFrame(props: {
  viewport: Viewport
  groups: readonly SettingsNavGroup[]
  title: string
  group: string
  rail: RailState
  sidebar?: ReactNode
  below?: ReactNode
  dialog?: ReactNode
  children: ReactNode
}) {
  if (props.viewport === 'mobile') {
    return (
      <mobileFrame.Component>
        <pagePart.Component
          back={{ label: 'Settings', to: paths.settings }}
          subtitle={props.group}
          title={props.title}
          viewport="mobile"
        >
          {props.children}
        </pagePart.Component>
        {props.dialog}
      </mobileFrame.Component>
    )
  }
  return (
    <appFrame.Component
      overlay={
        <>
          <SettingsDialog
            group={props.group}
            groups={props.groups}
            title={props.title}
          >
            {props.children}
          </SettingsDialog>
          {props.dialog}
        </>
      }
      rail={props.rail}
      {...defined({ sidebar: props.sidebar })}
    >
      {props.below ?? (
        <chooseWorkspace.Component moklyInstance="choose-workspace" />
      )}
    </appFrame.Component>
  )
}
