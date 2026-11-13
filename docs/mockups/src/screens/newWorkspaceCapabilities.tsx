import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { CapabilitiesControl } from '../components/capabilities/CapabilitiesButton'
import {
  capabilitiesIntro,
  capabilitiesLabel,
} from '../components/capabilities/capabilitiesCopy'
import { CapabilitiesPanel } from '../components/capabilities/CapabilitiesPanel'
import { capabilityParts } from '../components/capabilities/capabilityParts'
import { Sheet } from '../components/common/Sheet'
import { memberViewer, you } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import { preApproved } from '../fixtures/secretRequests'
import { acmeSecrets } from '../fixtures/secrets'
import { paths } from '../paths'

/** The parts of the state of New workspace that the control reads. */
type DraftState = {
  capabilities: 'closed' | 'open'
  org: 'active' | 'suspended' | 'new'
  viewer: 'admin' | 'member'
}

/**
 * The control of a new workspace. Acme offers its secrets, and the
 * creator pre-approved one. Firna, a new org, has none yet. Mac access is
 * on by default (secrets decision 9).
 */
function panelOf(state: DraftState, sheet: boolean) {
  const firna = state.org === 'new'
  const parts = capabilityParts({
    org: firna ? orgs.firna.name : orgs.acme.name,
    secrets: firna ? [] : acmeSecrets,
    preApproved: firna ? [] : preApproved,
    macAccess: true,
    secretsTo: firna ? paths.secretsEmpty : paths.secrets,
    viewer: state.viewer === 'admin' ? you : memberViewer,
  })
  return (
    <CapabilitiesPanel
      intro={capabilitiesIntro.create}
      parts={parts}
      sheet={sheet}
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
  if (state.capabilities === 'closed') return { to }
  if (viewport === 'mobile') return { expanded: true }
  return { panel: panelOf(state, false) }
}

/** The open control of New workspace as a sheet, on a phone. */
export function newWorkspaceCapabilitiesSheet(state: DraftState): ReactNode {
  if (state.capabilities === 'closed') return null
  return <Sheet title={capabilitiesLabel}>{panelOf(state, true)}</Sheet>
}
