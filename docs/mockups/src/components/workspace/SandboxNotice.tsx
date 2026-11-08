import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Archive, CircleAlert, CirclePause } from 'lucide-react'
import { archivedOn } from '../../fixtures/archive'
import { ActionButton } from '../common/actions'
import { EmptyState } from '../common/EmptyState'
import { Notice } from '../common/Notice'
import { refusedIcon } from '../orgs/suspension'
import styles from './SandboxNotice.module.css'
import type {
  SandboxNoticeState,
  SandboxPanelState,
  SandboxProblem,
} from './sandboxNoticeState'

type Problem = {
  icon: LucideIcon
  title: string
  /** The text of the bar under the chat. */
  body: string
  /** The text of the files and tools panels. */
  panelBody: string
  /** The one way forward, when the sandbox can come back. */
  action?: string
  tone: 'neutral' | 'danger'
}

const saved = 'Your files and chat are saved.'

/**
 * A refused start can last until the disk of the sandbox is gone, so its
 * notice promises only the chat history.
 */
const history = 'Your chat history is available.'

const problems: Readonly<Record<SandboxProblem, Problem>> = {
  stopped: {
    icon: CirclePause,
    title: 'Sandbox stopped',
    body: saved,
    panelBody: saved,
    action: 'Resume',
    tone: 'neutral',
  },
  error: {
    icon: CircleAlert,
    title: "The sandbox couldn't start",
    body: saved,
    panelBody: saved,
    action: 'Try again',
    tone: 'danger',
  },
  refused: {
    icon: refusedIcon,
    title: "The sandbox can't start",
    body: history,
    panelBody: history,
    tone: 'neutral',
  },
  archived: {
    icon: Archive,
    title: `Archived on ${archivedOn}`,
    body: 'Its cloud computer is deleted, and the chat is read-only.',
    panelBody: 'The files and the tools went with the cloud computer.',
    tone: 'neutral',
  },
}

function RecoveryButton(props: { label: string }) {
  return <ActionButton tone="primary">{props.label}</ActionButton>
}

/** The text of the bar: the refusal, or the saved message before the body. */
function barBody(state: SandboxNoticeState, body: string): string {
  switch (state.problem) {
    case 'refused':
      return state.reason
    case 'error':
      return state.message ? `${state.message} ${body}` : body
    case 'stopped':
    case 'archived':
      return body
  }
}

/**
 * The bar that replaces the composer while the sandbox is not running. A
 * refused start shows the words of the refusal, and no action, because the
 * start stays refused until its cause changes. A start that failed shows
 * the message that the app saved for it, such as the 20-minute limit of a
 * start, before the body.
 */
export function SandboxBar(props: SandboxNoticeState) {
  const problem = problems[props.problem]
  return (
    <Notice
      action={
        problem.action ? <RecoveryButton label={problem.action} /> : undefined
      }
      body={barBody(props, problem.body)}
      icon={problem.icon}
      title={problem.title}
      tone={problem.tone}
    />
  )
}

/**
 * What a panel shows while the sandbox is not running. The desktop layout
 * leaves the action and the words of a refusal to the chat bar beside it. A
 * phone shows the bar only on the Chat tab, so its panels show them too.
 */
export function SandboxPanel(props: {
  state: SandboxPanelState
  phone: boolean
}) {
  const theme = useSharedUiTheme()
  const { state } = props
  if (state.problem === 'starting') {
    return (
      <div className={styles.waiting}>
        <Spinner color={theme.colors.muted} size={13} />
        Waiting for the sandbox
      </div>
    )
  }
  const problem = problems[state.problem]
  const archived = state.problem === 'archived'
  return (
    <EmptyState
      action={
        props.phone && problem.action ? (
          <RecoveryButton label={problem.action} />
        ) : undefined
      }
      body={
        props.phone && state.problem === 'refused'
          ? state.reason
          : problem.panelBody
      }
      icon={problem.icon}
      title={archived ? 'Archived' : problem.title}
    />
  )
}
