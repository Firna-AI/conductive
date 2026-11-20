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
import { orgs } from '../fixtures/orgs'
import { autocompleteGrants, preApproved } from '../fixtures/secretRequests'
import { acmeSecrets } from '../fixtures/secrets'
import { paths } from '../paths'
import { viewerOf } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

/**
 * Whether the composer state draws the Capabilities control open, with
 * Mac access on or off. Every member opens and changes it (secrets
 * decision 8).
 */
function openControl(state: WorkspaceState): 'on' | 'off' | undefined {
  if (state.composer === 'capabilities') return 'on'
  if (state.composer === 'capabilities-mac-off') return 'off'
  return undefined
}

/**
 * The control of Checkout address autocomplete: the secrets of Acme with
 * the pre-approved one checked, the approvals of its sessions and its
 * value for the workspace, each with Remove, and Mac access.
 */
function panelOf(state: WorkspaceState, macAccess: boolean, sheet: boolean) {
  const parts = capabilityParts({
    org: orgs.acme.name,
    secrets: acmeSecrets,
    preApproved,
    grants: autocompleteGrants,
    macAccess,
    secretsTo: paths.secrets,
    viewer: viewerOf(state),
  })
  return (
    <CapabilitiesPanel
      intro={capabilitiesIntro.workspace}
      parts={parts}
      sheet={sheet}
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
  const open = openControl(state)
  if (open === undefined) return { to: paths.capabilities }
  if (viewport === 'mobile') return { expanded: true }
  return { panel: panelOf(state, open === 'on', false) }
}

/** The open Capabilities control as a sheet, on a phone. */
export function capabilitiesSheet(
  state: WorkspaceState,
  viewport: Viewport,
): ReactNode {
  const open = openControl(state)
  if (open === undefined || viewport !== 'mobile') return null
  return (
    <Sheet title={capabilitiesLabel}>
      {panelOf(state, open === 'on', true)}
    </Sheet>
  )
}
