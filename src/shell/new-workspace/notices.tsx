import type { ReactNode } from 'react'
import { CircleAlert, FolderGit2, Plug } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import type { ApiError } from '../../app/api/client'
import type { CreateState } from '../../app/new-workspace-model'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { modelLabel } from '../ui/ModelPicker'

const agentNames = { claude: 'Claude', codex: 'Codex' } as const

/**
 * The notice over the composer when a message cannot go yet: the agent of
 * the chosen model is not connected. A notice turns Send off. Its Connect
 * goes to the account through `open`.
 */
export function useBlockingNotice(
  choice: AgentChoice | undefined,
  models: readonly AgentModel[],
  open: (to: string) => void,
): ReactNode {
  const app = useApp()
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
            onPress={() => open(routes.account(choice.agent))}
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
 * What an org without chosen repositories asks first, without the full
 * stop. An admin chooses them. A member who is not an admin reads that an
 * admin chooses them, because only an admin can.
 */
export function repositoriesFirst(org: Pick<OrgSummary, 'name' | 'role'>) {
  return org.role === 'admin'
    ? `Choose the repositories of ${org.name} first`
    : `An admin of ${org.name} chooses its repositories first`
}

/**
 * The notice of an org that has chosen no repositories yet, so no workspace
 * can start. An admin gets Choose repositories, which goes to the
 * Repositories tab of the org settings through `open`.
 */
export function ChooseRepositoriesNotice(props: {
  org: OrgSummary
  open: (to: string) => void
}) {
  const { org } = props
  return (
    <Notice
      action={
        org.role === 'admin' ? (
          <ActionButton
            icon={FolderGit2}
            onPress={() => props.open(routes.settings(org.id, 'repositories'))}
          >
            Choose repositories
          </ActionButton>
        ) : undefined
      }
      icon={FolderGit2}
      title={repositoriesFirst(org)}
    />
  )
}

/**
 * The code of a start that failed before the server took the message. Its
 * message is the one that the Worker saved for the start, such as its time
 * limit.
 */
const startFailed = 'workspace_start_failed'

const notStarted = "Its sandbox didn't start. Your message is kept."

/**
 * The text of a create request that failed, by its status and code. The
 * form keeps the message, and Try again sends it with the same ID.
 */
function failureBody(error: ApiError): string {
  if (error.status === 0) {
    return "The app can't reach the server. Your message is kept."
  }
  if (error.code === startFailed)
    return `${error.message} Your message is kept.`
  if (error.status >= 500) return notStarted
  return `${error.message} Your message is kept.`
}

/**
 * A create request that failed. The draft stays, and Try again sends it
 * again. Try again is off while the message cannot go, as Send is. A start
 * that failed before the server took the message shows the message that
 * the Worker saved for it.
 */
function CreateFailed(props: {
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

/** The notice of a create that failed, or `null` while none failed. */
export function createFailure(
  create: CreateState,
  ready: boolean,
  retry: () => void,
): ReactNode {
  if (create.state !== 'failed') return null
  return <CreateFailed error={create.error} ready={ready} retry={retry} />
}
