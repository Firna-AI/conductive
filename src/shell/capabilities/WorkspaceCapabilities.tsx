import { useEffect, useState, useSyncExternalStore } from 'react'
import { useToast } from '@firna/ui/toast'
import { Blocks } from 'lucide-react'
import {
  capabilitiesIntro,
  capabilitiesLabel,
} from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import { CapabilitiesPanel } from '../../../docs/mockups/src/components/capabilities/CapabilitiesPanel'
import type { WorkspaceGrants } from '../../app/api/read-secrets'
import { WorkspaceCapabilitiesModel } from '../../app/capabilities-model'
import { nameInSentence } from '../../app/people'
import {
  asApiError,
  loading,
  useStore,
  valueOf,
  type Loadable,
} from '../../app/store'
import type { ComposerTool } from '../../chat/components/ComposerTools'
import type { ChatController } from '../../chat/state/controller'
import type { User } from '../../shared/api'
import { nameLabel } from '../../shared/name-label'
import type { OrgSummary } from '../../shared/orgs'
import type { OrgSecret } from '../../shared/secrets'
import { useOrgModel } from '../context'
import { inSentence, useWhen } from '../settings/when'
import { useAction } from '../ui/useAction'
import { capabilityParts } from './capability-parts'
import { GrantList, type ShownApproval } from './GrantList'

/** The title of each session of the workspace, open or closed, or Untitled. */
function useSessionTitles(chat: ChatController): (id: string) => string {
  const snapshot = useSyncExternalStore(
    chat.subscribe,
    chat.getSnapshot,
    chat.getSnapshot,
  )
  const sessions = [...snapshot.sessions, ...snapshot.history]
  return (id) =>
    nameLabel(sessions.find((item) => item.id === id)?.title ?? null)
}

/**
 * The secrets as the control shows them: a load until the capabilities of
 * the workspace load, the failure of their read, and else the secrets of
 * the org as their own read gives them.
 */
function shownSecrets(
  grants: Loadable<WorkspaceGrants>,
  list: Loadable<readonly OrgSecret[]>,
): Loadable<readonly OrgSecret[]> {
  if (grants.state === 'ready') return list
  return grants.state === 'failed' ? grants : loading
}

/**
 * A change of the control. While it saves, the controls take no other
 * change. A failure shows a toast that names what failed.
 */
function useChange() {
  const { toast } = useToast()
  return useAction(async (write: () => Promise<void>, failure: string) => {
    try {
      await write()
    } catch (cause) {
      const { message } = asApiError(cause)
      toast({ title: failure, description: message, tone: 'error' })
      throw cause
    }
  })
}

/**
 * The open control of a workspace (secrets decision 8 B): the secrets of
 * the org that it pre-approves, the approvals of its sessions, each with
 * Remove, and Mac access. It reads the secrets and the capabilities each
 * time that it opens, and every member changes them. A change applies to
 * each session of the workspace from that moment.
 */
function WorkspaceCapabilitiesPanel(props: {
  org: OrgSummary
  workspaceId: string
  viewer: User
  chat: ChatController
  sheet: boolean
}) {
  const { org, viewer } = props
  const orgModel = useOrgModel(org.id)
  const { secrets } = orgModel
  const [model] = useState(
    () =>
      new WorkspaceCapabilitiesModel(
        orgModel.services.api,
        org.id,
        props.workspaceId,
      ),
  )
  const list = useStore(secrets.list.store)
  const grants = useStore(model.grants.store)
  const title = useSessionTitles(props.chat)
  const { when } = useWhen(60_000)
  const change = useChange()
  useEffect(() => {
    void secrets.read()
    void model.read()
  }, [secrets, model])
  const known = valueOf(list) ?? []
  const nameOf = (id: string) =>
    known.find((secret) => secret.id === id)?.name ?? ''
  const shown = valueOf(grants)
  const approvals = (shown?.sessionApprovals ?? []).flatMap(
    (approval): ShownApproval[] => {
      const secret = nameOf(approval.secretId)
      if (secret === '') return []
      const who = nameInSentence(
        approval.approvedBy,
        approval.approvedByUserId,
        viewer.id,
      )
      const at = inSentence(when(approval.approvedAt))
      const session = title(approval.sessionId)
      return [{ approval, secret, session, who, when: at }]
    },
  )
  const parts = capabilityParts({
    org,
    secrets: shownSecrets(grants, list),
    retry: async () => {
      await Promise.all([secrets.read(), model.read()])
    },
    preapproved: shown?.preapprovedSecretIds ?? [],
    setPreapproved: (secretId, on) =>
      change.run(
        () => model.setPreapproved(secretId, on),
        `The pre-approval of ${nameOf(secretId)} was not saved`,
      ),
    macAccess: shown?.macAccess ?? null,
    setMacAccess: (on) =>
      change.run(() => model.setMacAccess(on), 'Mac access was not saved'),
    disabled: change.pending || shown === undefined,
    grants: (
      <GrantList
        approvals={approvals}
        disabled={change.pending}
        remove={(item) =>
          change.run(
            () =>
              model.removeApproval(
                item.approval.secretId,
                item.approval.sessionId,
              ),
            `The approval of ${item.secret} was not removed`,
          )
        }
      />
    ),
  })
  return (
    <CapabilitiesPanel
      intro={capabilitiesIntro.workspace}
      parts={parts}
      sheet={props.sheet}
    />
  )
}

/**
 * The Capabilities tool beside the message box of a workspace (secrets
 * decision 8 B), with the same icon as New workspace. `chat` gives the
 * titles of the sessions of the approvals.
 */
export function workspaceCapabilities(props: {
  org: OrgSummary
  workspaceId: string
  viewer: User
  chat: ChatController
}): ComposerTool {
  return {
    key: 'capabilities',
    label: capabilitiesLabel,
    icon: Blocks,
    render: (sheet) => (
      <WorkspaceCapabilitiesPanel
        chat={props.chat}
        key={props.workspaceId}
        org={props.org}
        sheet={sheet}
        viewer={props.viewer}
        workspaceId={props.workspaceId}
      />
    ),
  }
}
