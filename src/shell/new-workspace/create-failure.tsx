import type { ReactNode } from 'react'
import { CircleAlert, GitBranch } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { branchRefusalCopy } from '../../../docs/mockups/src/components/new-workspace/branchCopy'
import type { ApiError } from '../../app/api/client'
import type { CreateState } from '../../app/new-workspace-draft'
import { ActionButton } from '../ui/actions'

/** A create request that failed, with what it asked for. */
type FailedCreate = Extract<CreateState, { state: 'failed' }>

/** What the form gives the notice of a failed create. */
export interface FailureActions {
  /** Whether the message can go now. Try again waits for it, as Send does. */
  ready: boolean
  /** Sends the message again, with the same message ID. */
  retry: () => void
  /** The full name of a repository of the org, by its ID. */
  repositoryName: (id: string) => string | undefined
  /**
   * Start from and the default branch of the form, or `null` while the form
   * shows no repository. It puts the control back on that branch.
   */
  startFrom: { branch: string; start: () => void } | null
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

/** Try again, which is off while the message cannot go, as Send is. */
function TryAgain(props: { actions: FailureActions }) {
  const { actions } = props
  return (
    <ActionButton
      disabled={!actions.ready}
      onPress={actions.retry}
      tone="primary"
    >
      Try again
    </ActionButton>
  )
}

/**
 * The words and the one action of a create that the branch check refused
 * (decision 293), or `null` for every other failure. A branch that is no
 * longer on GitHub offers Start from and the default branch, because Try
 * again would fail the same way. A GitHub account that cannot read the
 * repository gets Try again, which works once GitHub grants the access.
 * Each refusal names what the request asked for.
 */
function branchRefusal(
  failed: FailedCreate,
  actions: FailureActions,
): { body: string; action: ReactNode } | null {
  switch (failed.error.code) {
    case 'branch_not_found': {
      const { startFrom } = actions
      if (failed.startBranch === null || !startFrom) return null
      return {
        body: branchRefusalCopy.missing(failed.startBranch),
        action: (
          <ActionButton icon={GitBranch} onPress={startFrom.start}>
            {branchRefusalCopy.startFrom(startFrom.branch)}
          </ActionButton>
        ),
      }
    }
    case 'github_access_required': {
      const repository = actions.repositoryName(failed.repositoryId)
      if (repository === undefined) return null
      return {
        body: branchRefusalCopy.noAccess(repository),
        action: <TryAgain actions={actions} />,
      }
    }
    default:
      return null
  }
}

/**
 * The notice of a create request that failed, or `null` while none failed.
 * The draft stays. A start that failed before the server took the message
 * shows the message that the Worker saved for it. A refusal of the branch
 * check shows its own cause and action, and every other failure offers Try
 * again. Send stays on, as after each failed create.
 */
export function createFailure(
  create: CreateState,
  actions: FailureActions,
): ReactNode {
  if (create.state !== 'failed') return null
  const refusal = branchRefusal(create, actions)
  return (
    <Notice
      action={refusal?.action ?? <TryAgain actions={actions} />}
      body={refusal?.body ?? failureBody(create.error)}
      icon={CircleAlert}
      title="The workspace wasn't created"
      tone="danger"
    />
  )
}
