import { useEffect, useSyncExternalStore } from 'react'
import { useToast } from '@firna/ui/toast'
import { Blocks } from 'lucide-react'
import {
  capabilitiesIntro,
  capabilitiesLabel,
} from '../../ui/components/capabilities/capabilitiesCopy'
import { CapabilitiesPanel } from '../../ui/components/capabilities/CapabilitiesPanel'
import { keptCapabilities } from '../../app/capabilities-model'
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
import type { OrgSummary } from '../../shared/orgs'
import type { OrgSecret } from '../../shared/secrets'
import { useOrgModel } from '../context'
import { useThisMac } from '../mac/this-mac'
import { inSentence, useWhen } from '../settings/when'
import { useAction } from '../ui/useAction'
import { capabilityParts } from './capability-parts'
import { GrantList, type ShownApproval, type ShownValue } from './GrantList'
import { useMacSwitch } from './mac-switch'

/** The session whose message box shows the control, or null. */
function useActiveSession(chat: ChatController): string | null {
  return useSyncExternalStore(
    chat.subscribe,
    () => chat.getSnapshot().activeSessionId,
    () => chat.getSnapshot().activeSessionId,
  )
}

/**
 * The secrets as the control shows them: a load until the capabilities and
 * the values of the workspace load, the failure of one of their reads, and
 * else the secrets of the org as their own read gives them.
 */
function shownSecrets(
  reads: readonly Loadable<unknown>[],
  list: Loadable<readonly OrgSecret[]>,
): Loadable<readonly OrgSecret[]> {
  const failed = reads.find((read) => read.state === 'failed')
  if (failed?.state === 'failed') return failed
  return reads.every((read) => read.state === 'ready') ? list : loading
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
 * the org that it pre-approves, the approvals of the session whose message
 * box shows it and the values that members gave for the workspace, each
 * with Remove, and Mac access. An approval whose secret the workspace
 * already allows does not show, and it shows again when that grant ends. The workspace
 * pre-loads them, as `usePreloadedCapabilities` says, so the control shows
 * them at once. Each open reads them again behind the shown values, because
 * every member changes them. A change applies to
 * each session of the workspace from that moment.
 *
 * In the Mac app, the control also has the switch of Mac access of this
 * Mac, as `useMacSwitch` says, and each open reads the settings of this Mac
 * again. The switch changes only the grant of this Mac, so it saves nothing
 * in the workspace. A browser shows no Mac access part.
 */
function WorkspaceCapabilitiesPanel(props: {
  org: OrgSummary
  workspaceId: string
  viewer: User
  chat: ChatController
  sheet: boolean
}) {
  const { org, viewer, workspaceId } = props
  const orgModel = useOrgModel(org.id)
  const { secrets } = orgModel
  const model = keptCapabilities(orgModel, workspaceId)
  const list = useStore(secrets.list.store)
  const grants = useStore(model.grants.store)
  const values = useStore(model.values.store)
  const session = useActiveSession(props.chat)
  const { when } = useWhen(60_000)
  const change = useChange()
  const mac = useThisMac()
  const macAccess = useMacSwitch(mac, workspaceId)
  useEffect(() => {
    void secrets.read()
    void model.read()
  }, [secrets, model])
  useEffect(() => {
    mac?.open()
  }, [mac])
  const known = valueOf(list) ?? []
  const nameOf = (id: string) =>
    known.find((secret) => secret.id === id)?.name ?? ''
  const shown = valueOf(grants)
  const preapproved = shown?.preapprovedSecretIds ?? []
  const approvals = (shown?.sessionApprovals ?? []).flatMap(
    (approval): ShownApproval[] => {
      if (approval.sessionId !== session) return []
      const secret = known.find((item) => item.id === approval.secretId)
      if (!secret || secret.allAgents) return []
      if (preapproved.includes(secret.id)) return []
      const who = nameInSentence(
        approval.approvedBy,
        approval.approvedByUserId,
        viewer.id,
      )
      const at = inSentence(when(approval.approvedAt))
      return [{ approval, secret: secret.name, who, when: at }]
    },
  )
  const given = (valueOf(values) ?? []).map((value): ShownValue => ({
    id: value.id,
    name: value.name,
    who: nameInSentence(value.suppliedBy, value.suppliedBy.id, viewer.id),
    when: inSentence(when(value.createdAt)),
  }))
  const parts = capabilityParts({
    org,
    secrets: shownSecrets([grants, values], list),
    retry: async () => {
      await Promise.all([secrets.read(), model.read()])
    },
    preapproved,
    setPreapproved: (secretId, on) =>
      change.run(
        () => model.setPreapproved(secretId, on),
        `The pre-approval of ${nameOf(secretId)} was not saved`,
      ),
    macAccess,
    disabled: change.pending || shown === undefined,
    grants: (
      <GrantList
        approvals={approvals}
        disabled={change.pending}
        removeValue={(item) =>
          change.run(
            () => model.removeValue(item.id),
            `The value of ${item.name} was not removed`,
          )
        }
        values={given}
        removeApproval={(item) =>
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
 * Reads the secrets of the org and the Capabilities of the workspace when
 * the workspace shows, if they have no answer yet. So the control opens
 * with them at once, and a return to the workspace reads nothing more. A
 * failed read shows nothing here: the control reads again when it opens.
 */
export function usePreloadedCapabilities(orgId: string, workspaceId: string) {
  const orgModel = useOrgModel(orgId)
  useEffect(() => {
    const { secrets } = orgModel
    if (secrets.list.store.get().state !== 'ready') void secrets.read()
    void keptCapabilities(orgModel, workspaceId).preload()
  }, [orgModel, workspaceId])
}

/**
 * The Capabilities tool beside the message box of a workspace (secrets
 * decision 8 B), with the same icon as New workspace. `chat` gives the
 * session whose approvals the control shows.
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
