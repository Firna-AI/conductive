import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { CapabilitiesControl } from '../components/capabilities/CapabilitiesButton'
import { capabilitiesLabel } from '../components/capabilities/capabilitiesCopy'
import { OpenCapabilities } from '../components/capabilities/capabilityParts'
import type { MacAccessView } from '../components/capabilities/MacAccessPart'
import { Sheet } from '../components/common/Sheet'
import { orgs } from '../fixtures/orgs'
import { autocompleteGrants, preApproved } from '../fixtures/secretRequests'
import { acmeSecrets } from '../fixtures/secrets'
import { paths } from '../paths'
import { viewerOf } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

/** The Mac access of an open control, and whether it is drawn at its end. */
type OpenState = { macAccess: MacAccessView; atEnd: boolean }

/**
 * Each composer state that draws the Capabilities control open. Every
 * member opens and changes it (secrets decision 8), and each member sees
 * the line of their own Mac (Mac access decision 4). While Mac access is
 * on, the line is checked, unchecked, or unchecked after a start that
 * failed or that found this Mac not available. The states of the line draw
 * the control at its end, where the line is.
 */
const openStates: Partial<Record<WorkspaceState['composer'], OpenState>> = {
  capabilities: { macAccess: { on: true, thisMac: 'checked' }, atEnd: false },
  'capabilities-checked': {
    macAccess: { on: true, thisMac: 'checked' },
    atEnd: true,
  },
  'capabilities-unchecked': {
    macAccess: { on: true, thisMac: 'unchecked' },
    atEnd: true,
  },
  'capabilities-not-started': {
    macAccess: { on: true, thisMac: 'not-started' },
    atEnd: true,
  },
  'capabilities-not-reached': {
    macAccess: { on: true, thisMac: 'not-reached' },
    atEnd: true,
  },
  'capabilities-mac-off': { macAccess: { on: false }, atEnd: false },
}

/**
 * The control of Checkout address autocomplete: the secrets of Acme with
 * the pre-approved one checked, the approvals of its sessions and its
 * value for the workspace, each with Remove, and Mac access.
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
  const open = openStates[state.composer]
  if (open === undefined) return { to: paths.capabilities }
  if (viewport === 'mobile') return { expanded: true }
  return {
    panel: panelOf(state, open.macAccess, false),
    atEnd: open.atEnd,
  }
}

/** The open Capabilities control as a sheet, on a phone. */
export function capabilitiesSheet(
  state: WorkspaceState,
  viewport: Viewport,
): ReactNode {
  const open = openStates[state.composer]
  if (open === undefined || viewport !== 'mobile') return null
  return (
    <Sheet title={capabilitiesLabel}>
      {panelOf(state, open.macAccess, true)}
    </Sheet>
  )
}
