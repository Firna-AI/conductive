import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { nameLabel } from '../../../../src/shared/name-label'
import type { CapabilitiesControl } from '../components/capabilities/CapabilitiesButton'
import { capabilitiesLabel } from '../../../../src/ui/components/capabilities/capabilitiesCopy'
import { OpenCapabilities } from '../components/capabilities/capabilityParts'
import type { MacAccessView } from '../components/capabilities/MacAccessPart'
import { Sheet } from '../../../../src/ui/components/common/Sheet'
import { orgs } from '../fixtures/orgs'
import { autocompleteGrants, preApproved } from '../fixtures/secretRequests'
import { acmeSecrets } from '../fixtures/secrets'
import { workspaceSessions } from '../fixtures/sessions'
import { paths } from '../paths'
import { viewerOf } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

/**
 * Each composer state that draws the Capabilities control open, with the
 * switch of Mac access in it. Every member opens the control and changes
 * its secrets (secrets decision 8). In the Mac app, each member also sees
 * the switch of Mac access of their own Mac (Mac access decision 7). The
 * switch is on while this Mac has a grant until Stop for the workspace. It
 * is off without a grant, while the 15 minutes run, after the Stop of a
 * switch-off, after a start that failed or that found this Mac not
 * available, and while the page cannot read the settings of this Mac. A
 * browser shows no Mac access part, so its view of each of these states
 * shows only the secrets.
 */
const openStates: Partial<Record<WorkspaceState['composer'], MacAccessView>> = {
  capabilities: 'off',
  'capabilities-on': 'on',
  'capabilities-fifteen-minutes': 'fifteen-minutes',
  'capabilities-stopped': 'stopped',
  'capabilities-not-started': 'not-started',
  'capabilities-not-reached': 'not-reached',
  'capabilities-not-available': 'not-available',
}

/**
 * The control of Checkout address autocomplete, from its first session: the
 * secrets of Acme with the pre-approved one checked, the approvals of this
 * session and the value for the workspace, each with Remove, and in the Mac
 * app the switch of Mac access.
 */
function panelOf(
  state: WorkspaceState,
  macAccess: MacAccessView,
  sheet: boolean,
) {
  return (
    <OpenCapabilities
      sheet={sheet}
      view={{
        place: 'workspace',
        org: orgs.acme.name,
        secrets: acmeSecrets,
        preApproved,
        grants: autocompleteGrants,
        session: nameLabel(workspaceSessions[0].title),
        macAccess,
        secretsTo: paths.secrets,
        viewer: viewerOf(state),
      }}
    />
  )
}

/**
 * The Capabilities icon of the composer of a workspace. It opens the
 * control, which a computer draws above the icon. A phone draws it as a
 * sheet, from `capabilitiesSheet`.
 */
export function workspaceCapabilities(
  state: WorkspaceState,
  viewport: Viewport,
): CapabilitiesControl {
  const macAccess = openStates[state.composer]
  if (macAccess === undefined) return { to: paths.capabilities }
  if (viewport === 'mobile') return { expanded: true }
  return { panel: panelOf(state, macAccess, false) }
}

/** The open Capabilities control as a sheet, on a phone. */
export function capabilitiesSheet(
  state: WorkspaceState,
  viewport: Viewport,
): ReactNode {
  const macAccess = openStates[state.composer]
  if (macAccess === undefined || viewport !== 'mobile') return null
  return (
    <Sheet title={capabilitiesLabel}>{panelOf(state, macAccess, true)}</Sheet>
  )
}
