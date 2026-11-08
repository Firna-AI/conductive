import type { ReactNode } from 'react'
import { CircleAlert, Plug } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import type { ApiError } from '../../app/api/client'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { modelLabel } from '../ui/ModelPicker'

const agentNames = { claude: 'Claude', codex: 'Codex' } as const

/**
 * The notice over the composer when a message cannot go yet: the agent of
 * the chosen model is not connected. A notice turns Send off.
 */
export function useBlockingNotice(
  choice: AgentChoice | undefined,
  models: readonly AgentModel[],
): ReactNode {
  const app = useApp()
  const go = useGo()
  const account = useStore(app.account.account)
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

/**
 * The code of a create whose first start failed before the create answered.
 * Its message is the one that the Worker saved for the start, such as its
 * time limit.
 */
const startFailed = 'workspace_start_failed'

function failureBody(error: ApiError): string {
  if (error.status === 0) {
    return "The app can't reach the server. Your message is kept."
  }
  if (error.code === startFailed)
    return `${error.message} Your message is kept.`
  if (error.status >= 500)
    return "Its sandbox didn't start. Your message is kept."
  return `${error.message} Your message is kept.`
}

/**
 * A create that failed. The draft stays, and Try again sends it again. Try
 * again is off while the message cannot go, as Send is. A first start that
 * failed shows the message that the Worker saved for it.
 */
export function CreateFailed(props: {
  error: ApiError
  ready: boolean
  retry: () => void
}) {
  return (
    <Notice
      action={
        <ActionButton
          disabled={!props.ready}
          onPress={props.retry}
          tone="primary"
        >
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
