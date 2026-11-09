import type { ReactNode } from 'react'
import { ArrowRight, CircleAlert, Hammer, Plug } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { firstBuildCopy as buildCopy } from '../../../docs/mockups/src/screens/firstBuildCopy'
import type { ApiError } from '../../app/api/client'
import { firstBuildOf } from '../../app/first-build'
import { mayChangeSettings } from '../../app/permissions'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import { formatElapsed, useNow } from '../../app/time'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import type { ImageBuild } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { modelLabel } from '../ui/ModelPicker'

const agentNames = { claude: 'Claude', codex: 'Codex' } as const

/** The notice of the build that runs, with its time, which moves on. */
function RunningBuild(props: { build: ImageBuild }) {
  const now = useNow(1_000)
  // A narrow phone keeps the time on one line.
  const elapsed = formatElapsed(now - props.build.startedAt).replaceAll(
    ' ',
    '\u00a0',
  )
  return (
    <Notice
      body={buildCopy.running.body}
      busy
      icon={Hammer}
      title={buildCopy.running.title(elapsed)}
    />
  )
}

/**
 * The notice over the composer while the org has no good image: its first
 * build runs, failed, or never started. A notice turns Send off, so no
 * create fails for want of an image. Only an admin builds the computer, so
 * only an admin gets the link to the Cloud computer tab, and a member reads
 * who can act. Once a build succeeded, no notice shows, also during a
 * later build. None shows while the builds load.
 */
export function useFirstBuildNotice(org: OrgSummary): ReactNode {
  const go = useGo()
  const builds = valueOf(useStore(useOrgModel(org.id).builds))
  const admin = mayChangeSettings(useOrgAccess(org))
  if (!builds) return null
  const first = firstBuildOf(builds)
  const open = admin ? (
    <ActionButton
      icon={ArrowRight}
      onPress={() => go(routes.settings(org.id, 'cloud-computer'))}
    >
      {buildCopy.open}
    </ActionButton>
  ) : undefined
  switch (first.state) {
    case 'succeeded':
      return null
    case 'running':
      return <RunningBuild build={first.build} />
    case 'failed':
      return (
        <Notice
          action={open}
          body={admin ? buildCopy.failed.admin : buildCopy.failed.member}
          icon={CircleAlert}
          title={buildCopy.failed.title}
          tone="danger"
        />
      )
    case 'none':
      return (
        <Notice
          action={open}
          body={admin ? buildCopy.none.admin : buildCopy.none.member}
          icon={Hammer}
          title={buildCopy.none.title}
        />
      )
  }
}

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
