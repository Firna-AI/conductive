import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { CapabilitiesControl } from '../components/capabilities/CapabilitiesButton'
import { capabilitiesLabel } from '../components/capabilities/capabilitiesCopy'
import { OpenCapabilities } from '../components/capabilities/capabilityParts'
import type { MacAccessView } from '../components/capabilities/MacAccessPart'
import { Sheet } from '../components/common/Sheet'
import { memberViewer, you } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import { preApproved } from '../fixtures/secretRequests'
import { acmeSecrets } from '../fixtures/secrets'
import { paths } from '../paths'
import type { NewWorkspaceFormState } from './newWorkspaceParts'

/** The parts of the state of New workspace that the control reads. */
type DraftState = Pick<NewWorkspaceFormState, 'capabilities'> & {
  org: 'active' | 'suspended' | 'new'
  viewer: 'admin' | 'member'
}

/**
 * The Mac access of the draft while the control is open: off, as a new
 * workspace starts, or turned on. A switch that turns on in the Mac app
 * checks the line of this Mac, so the create also starts a grant until
 * Stop on this Mac (Mac access decision 1 C).
 */
function macAccessOf(state: DraftState): MacAccessView | undefined {
  if (state.capabilities === 'open') return { on: false }
  if (state.capabilities === 'mac-access-on') {
    return { on: true, thisMac: 'checked' }
  }
  return undefined
}

/**
 * The control of a new workspace. Acme offers its secrets, and the
 * creator pre-approved one. Firna, a new org, has none yet.
 */
function panelOf(state: DraftState, macAccess: MacAccessView, sheet: boolean) {
  const firna = state.org === 'new'
  return (
    <OpenCapabilities
      sheet={sheet}
      view={{
        place: 'create',
        org: firna ? orgs.firna.name : orgs.acme.name,
        secrets: firna ? [] : acmeSecrets,
        preApproved: firna ? [] : preApproved,
        macAccess,
        secretsTo: firna ? paths.secretsEmpty : paths.secrets,
        viewer: state.viewer === 'admin' ? you : memberViewer,
      }}
    />
  )
}

/**
 * The Capabilities icon of New workspace, on the page or in the dialog
 * (secrets decision 6). `to` is the screen with the control open. A
 * computer draws the open control above the icon. A phone draws it as a
 * sheet, from `newWorkspaceCapabilitiesSheet`.
 */
export function newWorkspaceCapabilities(
  state: DraftState,
  viewport: Viewport,
  to: string | undefined,
): CapabilitiesControl {
  const macAccess = macAccessOf(state)
  if (macAccess === undefined) return { to }
  if (viewport === 'mobile') return { expanded: true }
  return { panel: panelOf(state, macAccess, false) }
}

/** The open control of New workspace as a sheet, on a phone. */
export function newWorkspaceCapabilitiesSheet(state: DraftState): ReactNode {
  const macAccess = macAccessOf(state)
  if (macAccess === undefined) return null
  return (
    <Sheet title={capabilitiesLabel}>{panelOf(state, macAccess, true)}</Sheet>
  )
}
