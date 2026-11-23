import { useEffect } from 'react'
import { Blocks } from 'lucide-react'
import {
  capabilitiesIntro,
  capabilitiesLabel,
} from '../../ui/components/capabilities/capabilitiesCopy'
import { CapabilitiesPanel } from '../../ui/components/capabilities/CapabilitiesPanel'
import { useStore } from '../../app/store'
import type { ComposerTool } from '../../chat/components/ComposerTools'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { automationCapabilityParts } from './capability-parts'

/** The chosen secrets of an automation, as its form holds them. */
export interface ChosenSecrets {
  /** The IDs of the secrets that each run workspace pre-approves. */
  ids: readonly string[]
  /** Checks a secret of the org in the form, or takes the check away. */
  choose: (secretId: string, on: boolean) => void
  /** The checks take no change, such as while a save runs. */
  disabled: boolean
}

/**
 * The open control of an automation: the secrets of the org, with the
 * chosen secrets of the form checked. The secrets read again each time that
 * the control opens. A check changes the form, and Save stores it.
 */
function AutomationCapabilitiesPanel(props: {
  org: OrgSummary
  chosen: ChosenSecrets
  sheet: boolean
}) {
  const { org, chosen } = props
  const secrets = useOrgModel(org.id).secrets
  const list = useStore(secrets.list.store)
  useEffect(() => {
    void secrets.read()
  }, [secrets])
  const parts = automationCapabilityParts({
    org,
    secrets: list,
    retry: () => secrets.read(),
    preapproved: chosen.ids,
    setPreapproved: chosen.choose,
    disabled: chosen.disabled,
  })
  return (
    <CapabilitiesPanel
      intro={capabilitiesIntro.automation}
      parts={parts}
      sheet={props.sheet}
    />
  )
}

/**
 * The Capabilities tool of an automation, which only its owner gets
 * (automation capabilities decision 1 A): the icon of New workspace, whose
 * control chooses the secrets that each run workspace starts with as
 * pre-approvals.
 */
export function automationCapabilities(
  org: OrgSummary,
  chosen: ChosenSecrets,
): ComposerTool {
  return {
    key: 'capabilities',
    label: capabilitiesLabel,
    icon: Blocks,
    render: (sheet) => (
      <AutomationCapabilitiesPanel chosen={chosen} org={org} sheet={sheet} />
    ),
  }
}
