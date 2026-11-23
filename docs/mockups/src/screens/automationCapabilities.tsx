import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { CapabilitiesControl } from '../components/capabilities/CapabilitiesButton'
import {
  capabilitiesIntro,
  capabilitiesLabel,
} from '../../../../src/ui/components/capabilities/capabilitiesCopy'
import { CapabilitiesPanel } from '../../../../src/ui/components/capabilities/CapabilitiesPanel'
import { automationCapabilityParts } from '../components/capabilities/capabilityParts'
import { Sheet } from '../../../../src/ui/components/common/Sheet'
import type { Automation } from '../fixtures/automations'
import { orgs } from '../fixtures/orgs'
import { acmeSecrets } from '../fixtures/secrets'
import { paths } from '../paths'
import type { AutomationState } from './automationState'

/**
 * The control of an automation: the secrets of Acme, with the secrets that
 * each run workspace pre-approves checked. It has only the secrets part,
 * because no person watches the Mac of the owner during a run (automation
 * capabilities decision 2 A).
 */
function panelOf(automation: Automation, sheet: boolean) {
  const parts = automationCapabilityParts({
    org: orgs.acme.name,
    secrets: acmeSecrets,
    preApproved: automation.preApproved ?? [],
    secretsTo: paths.secrets,
  })
  return (
    <CapabilitiesPanel
      intro={capabilitiesIntro.automation}
      parts={parts}
      sheet={sheet}
    />
  )
}

/**
 * The Capabilities icon in the bar of the prompt, which only the owner
 * gets. A press opens the control, which a computer draws above the icon
 * and a phone as a sheet, from `automationCapabilitySheet`. The mockups
 * draw the control open for the automation that reviews pull requests.
 */
export function automationCapabilityControl(
  state: AutomationState,
  automation: Automation,
  viewport: Viewport,
): CapabilitiesControl {
  if (state.capabilities === 'closed') {
    return {
      to:
        automation.key === 'review-prs'
          ? paths.automationCapabilities
          : undefined,
    }
  }
  if (viewport === 'mobile') return { expanded: true }
  return { panel: panelOf(automation, false) }
}

/** The open Capabilities control of the owner as a sheet, on a phone. */
export function automationCapabilitySheet(
  state: AutomationState,
  automation: Automation,
): ReactNode {
  if (state.capabilities === 'closed') return null
  return <Sheet title={capabilitiesLabel}>{panelOf(automation, true)}</Sheet>
}
