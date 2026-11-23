import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { CapabilitiesControl } from '../components/capabilities/CapabilitiesButton'
import { capabilitiesLabel } from '../../../../src/ui/components/capabilities/capabilitiesCopy'
import { OpenCapabilities } from '../components/capabilities/capabilityParts'
import type { MacAccessView } from '../components/capabilities/MacAccessPart'
import { Sheet } from '../../../../src/ui/components/common/Sheet'
import { memberViewer, you } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import { preApproved } from '../fixtures/secretRequests'
import {
  acmeSecrets,
  manySecrets,
  replicaUrl,
  secretSearch,
  undescribedSecret,
} from '../fixtures/secrets'
import { paths } from '../paths'
import type { NewWorkspaceFormState } from './newWorkspaceParts'

/** The parts of the state of New workspace that the control reads. */
type DraftState = Pick<NewWorkspaceFormState, 'capabilities'> & {
  org: 'active' | 'suspended' | 'new'
  viewer: 'admin' | 'member'
}

/** The secrets that the control lists for the state. */
function secretsOf(state: DraftState) {
  if (state.org === 'new') return []
  if (state.capabilities === 'search') return manySecrets
  if (state.capabilities === 'info') return [...acmeSecrets, undescribedSecret]
  return acmeSecrets
}

/**
 * The switch of Mac access of the draft while the control is open: off, as
 * a new workspace starts, or turned on, so that the create starts a grant
 * until Stop on this Mac (Mac access decision 7). Only the Mac app shows
 * the switch.
 */
function macAccessOf(state: DraftState): MacAccessView | undefined {
  if (!isOpen(state)) return undefined
  return state.capabilities === 'mac-access-on' ? 'on' : 'off'
}

/**
 * The control of a new workspace. Acme offers its secrets, and the
 * creator pre-approved one. Firna, a new org, has none yet. `search` lists
 * twelve secrets, with a search that keeps three. `info` shows one
 * description, and a secret without a description, which has no info icon.
 */
function panelOf(state: DraftState, macAccess: MacAccessView, sheet: boolean) {
  const firna = state.org === 'new'
  return (
    <OpenCapabilities
      sheet={sheet}
      view={{
        place: 'create',
        org: firna ? orgs.firna.name : orgs.acme.name,
        secrets: secretsOf(state),
        preApproved: firna ? [] : preApproved,
        search: state.capabilities === 'search' ? secretSearch : undefined,
        info: state.capabilities === 'info' ? replicaUrl.name : undefined,
        macAccess,
        secretsTo: firna ? paths.secretsEmpty : paths.secrets,
        viewer: state.viewer === 'admin' ? you : memberViewer,
      }}
    />
  )
}

/**
 * The control is drawn open, also with Mac access on, a search, or a
 * description.
 */
function isOpen(state: DraftState): boolean {
  return ['open', 'mac-access-on', 'search', 'info'].includes(
    state.capabilities,
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
