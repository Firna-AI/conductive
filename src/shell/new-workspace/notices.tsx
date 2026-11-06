import type { ReactNode } from 'react'
import { CircleAlert, KeyRound, Plug } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import type { ApiError } from '../../app/api/client'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { modelLabel } from '../ui/ModelPicker'

const agentNames = { claude: 'Claude', codex: 'Codex' } as const

/**
 * The notice over the composer when a message cannot go yet (decision 33):
 * the org has no key for its cloud computers, or the agent of the chosen
 * model is not connected. The key notice names no provider, and only an
 * admin gets its action. A notice turns Send off.
 */
export function useBlockingNotice(
  org: OrgSummary,
  choice: AgentChoice | undefined,
  models: readonly AgentModel[],
): ReactNode {
  const app = useApp()
  const go = useGo()
  const boatKey = valueOf(useStore(useOrgModel(org.id).boatKey))
  const account = useStore(app.account.account)
  if (boatKey && !boatKey.configured) {
    if (org.role !== 'admin') {
      return (
        <Notice
          body={`An admin of ${org.name} adds it in the org settings.`}
          icon={KeyRound}
          title={`The cloud computers of ${org.name} need a key`}
        />
      )
    }
    return (
      <Notice
        action={
          <ActionButton
            icon={KeyRound}
            onPress={() => go(routes.settings(org.id, 'boat-key'))}
          >
            Add key
          </ActionButton>
        }
        icon={KeyRound}
        title={`Add a key for the cloud computers of ${org.name}`}
      />
    )
  }
  const login = account?.agentLogins.find(
    (item) => item.agent === choice?.agent,
  )
  if (choice && account && !login?.connected) {
    const agent = agentNames[choice.agent]
    return (
      <Notice
        action={
          <ActionButton
            icon={Plug}
            onPress={() => go(routes.account(choice.agent))}
          >
            {`Connect ${agent}`}
          </ActionButton>
        }
        icon={Plug}
        title={`Connect ${agent} to use ${modelLabel(models, choice)}`}
      />
    )
  }
  return null
}

function failureBody(error: ApiError): string {
  if (error.status === 0) {
    return "The app can't reach the server. Your message is kept."
  }
  if (error.status >= 500)
    return "Its sandbox didn't start. Your message is kept."
  return `${error.message} Your message is kept.`
}

/** A create that failed. The draft stays, and Try again sends it again. */
export function CreateFailed(props: { error: ApiError; retry: () => void }) {
  return (
    <Notice
      action={
        <ActionButton onPress={props.retry} tone="primary">
          Try again
        </ActionButton>
      }
      body={failureBody(props.error)}
      icon={CircleAlert}
      title="The workspace wasn't created"
      tone="danger"
    />
  )
}
