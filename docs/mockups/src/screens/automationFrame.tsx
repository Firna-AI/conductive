import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import {
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { memberViewer, people } from '../fixtures/members'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { viewerOf, type AutomationState } from './automationState'

/**
 * The app around an automation page: the rail and the sidebar of Acme on
 * desktop, with Automations as the current link, or the frame of a phone.
 * `overlay` lies over the page, such as the question of Delete, or a sheet
 * on a phone.
 */
export function AutomationFrame(props: {
  state: AutomationState
  viewport: Viewport
  overlay?: ReactNode
  children: ReactNode
}) {
  const { state } = props
  if (props.viewport === 'mobile') {
    return (
      <MobileFrame>
        {props.children}
        {props.overlay}
      </MobileFrame>
    )
  }
  const suspended = state.org === 'suspended'
  return (
    <AppFrame
      overlay={props.overlay}
      rail={{
        ...acmeRail,
        suspended: suspended ? suspendedOrg : undefined,
        person: state.viewer === 'member' ? people[memberViewer] : undefined,
      }}
      sidebar={
        <Sidebar
          current="automations"
          org={orgs.acme}
          sections={suspended ? suspendedSections() : workspaceSections()}
          suspended={suspended}
          viewer={{ person: viewerOf(state), role: state.viewer }}
        />
      }
    >
      {props.children}
    </AppFrame>
  )
}
