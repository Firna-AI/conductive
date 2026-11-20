import { useEffect } from 'react'
import { Blocks } from 'lucide-react'
import {
  capabilitiesIntro,
  capabilitiesLabel,
} from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import { CapabilitiesPanel } from '../../../docs/mockups/src/components/capabilities/CapabilitiesPanel'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { useStore } from '../../app/store'
import type { ComposerTool } from '../../chat/components/ComposerTools'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { capabilityParts } from './capability-parts'

/**
 * The open control of New workspace: the secrets of the org that the new
 * workspace pre-approves, and its Mac access, as the draft holds them. The
 * secrets read again each time that the control opens. While the create
 * runs, the choices take no change.
 */
function DraftCapabilitiesPanel(props: {
  org: OrgSummary
  model: NewWorkspaceModel
  sheet: boolean
}) {
  const { org, model } = props
  const secrets = useOrgModel(org.id).secrets
  const list = useStore(secrets.list.store)
  const { capabilities } = useStore(model.draft)
  const sending = useStore(model.create).state === 'sending'
  useEffect(() => {
    void secrets.read()
  }, [secrets])
  const parts = capabilityParts({
    org,
    secrets: list,
    retry: () => secrets.read(),
    preapproved: capabilities.preapprovedSecretIds,
    setPreapproved: (secretId, on) => model.setPreapproved(secretId, on),
    macAccess: capabilities.macAccess,
    setMacAccess: (on) => model.setMacAccess(on),
    disabled: sending,
  })
  return (
    <CapabilitiesPanel
      intro={capabilitiesIntro.create}
      parts={parts}
      sheet={props.sheet}
    />
  )
}

/**
 * The Capabilities tool of New workspace, on the page and in the dialog
 * (secrets decision 6 G): a small icon with its label on hover, whose
 * control chooses what the agents of the new workspace can use. The create
 * sends the choices with the first message.
 */
export function draftCapabilities(
  org: OrgSummary,
  model: NewWorkspaceModel,
): ComposerTool {
  return {
    key: 'capabilities',
    label: capabilitiesLabel,
    icon: Blocks,
    render: (sheet) => (
      <DraftCapabilitiesPanel model={model} org={org} sheet={sheet} />
    ),
  }
}
