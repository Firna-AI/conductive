import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { defined } from '../../defined'
import type { ArchiveDays } from '../../fixtures/archive'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { iconKeyOf, type IconKey } from '../../entries/components/common/icons'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { refusedIcon } from '../../../../../src/ui/components/orgs/suspension'
import styles from '../../../../../src/ui/components/workspace/SandboxNotice.module.css'
import {
  archiveStage,
  type SandboxNoticeState,
  type SandboxProblem,
} from '../../../../../src/ui/components/workspace/sandboxNoticeState'

type ArchivedNotice = Extract<SandboxNoticeState, { problem: 'archived' }>

/**
 * A notice as the mockups draw it: the notice of the contract, and for an
 * archived workspace the days that its bar gives.
 */
export type BarNotice =
  | Exclude<SandboxNoticeState, ArchivedNotice>
  | (ArchivedNotice & { days: ArchiveDays })

/** What a panel shows: the notice of the bar, or the wait of a start. */
export type PanelNotice = BarNotice | { problem: 'starting' }

type Problem = {
  icon: IconKey
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

/**
 * A failed first start leaves a new workspace with no files yet, so its
 * notice promises only the chat, with its queued messages.
 */
const chatSaved = 'Your chat is saved.'

const problems: Readonly<Record<Exclude<SandboxProblem, 'archived'>, Problem>> =
  {
    stopped: {
      icon: 'circle-pause',
      title: 'Sandbox stopped',
      body: saved,
      panelBody: saved,
      action: 'Resume',
      tone: 'neutral',
    },
    error: {
      icon: 'circle-alert',
      title: "The sandbox couldn't start",
      body: saved,
      panelBody: saved,
      action: 'Try again',
      tone: 'danger',
    },
    refused: {
      icon: iconKeyOf(refusedIcon),
      title: "The sandbox can't start",
      body: history,
      panelBody: history,
      tone: 'neutral',
    },
  }

/** The files and the tools of a cloud computer that the app deleted. */
const wentWith = 'The files and the tools went with the cloud computer.'

/** Whether an archived workspace left the list, as `archiveStage` says. */
function leftTheList(notice: ArchivedNotice): boolean {
  const stage = archiveStage(notice)
  return stage === 'deleting' || stage === 'removed'
}

/**
 * The words of an archived workspace, for its stage. Until its 14 days end,
 * the title gives the day of the Archive, and the body the day when the
 * workspace leaves the list, also without Restore. A cloud computer that
 * can still exist without Restore gets the words of a refused start, which
 * promise only the chat history. After the 14 days, the title gives the day
 * of the removal, and the body says that the workspace left the list, what
 * happens to its cloud computer, and that the chat is read-only. The words
 * say "removed" for the workspace, because the app keeps its data.
 */
function archivedProblem(
  notice: ArchivedNotice & { days: ArchiveDays },
): Problem {
  const { archivedOn, removedOn } = notice.days
  const leaves = `It leaves the list on ${removedOn}.`
  const left = 'It left the list.'
  const icon: IconKey = 'archive'
  const listed = { icon, title: `Archived on ${archivedOn}` }
  const removed = { icon, title: `Removed on ${removedOn}` }
  const tone = 'neutral'
  switch (archiveStage(notice)) {
    case 'available':
      return {
        ...listed,
        body: `Restore it until ${removedOn} to bring back its files and sessions. It leaves the list on that day.`,
        panelBody: 'The files and the tools come back with Restore.',
        action: 'Restore',
        tone,
      }
    case 'history':
      return {
        ...listed,
        body: `${history} ${leaves}`,
        panelBody: history,
        tone,
      }
    case 'deleted':
      return {
        ...listed,
        body: `Its cloud computer is deleted, and the chat is read-only. ${leaves}`,
        panelBody: wentWith,
        tone,
      }
    case 'deleting':
      return {
        ...removed,
        body: `${left} Its cloud computer is being deleted, and the chat is read-only.`,
        panelBody: 'The files and the tools go with the cloud computer.',
        tone,
      }
    case 'removed':
      return {
        ...removed,
        body: `${left} Its cloud computer is deleted, and the chat is read-only.`,
        panelBody: wentWith,
        tone,
      }
  }
}

/** The words and the action of a sandbox that is not running. */
function problemOf(state: BarNotice): Problem {
  if (state.problem !== 'archived') return problems[state.problem]
  return archivedProblem(state)
}

/**
 * The screen that the one way forward leads to, when the mockups draw it:
 * the start of a new cloud computer after the one failed first start that
 * they draw, and the workspace back in its section after a Restore.
 */
function recoveryPath(state: BarNotice): string | undefined {
  if (state.problem === 'archived') return paths.restored
  if (state.problem === 'error' && state.firstStart === true) {
    return paths.retrying
  }
  return undefined
}

/** The one way forward, as a link where the mockups draw its screen. */
function RecoveryButton(props: { label: string; state: BarNotice }) {
  const button = (
    <actionButton.Component moklyInstance="recover" tone="primary">
      {props.label}
    </actionButton.Component>
  )
  const to = recoveryPath(props.state)
  if (to === undefined) return button
  return (
    <ScreenLink asChild to={to}>
      {button}
    </ScreenLink>
  )
}

/** What stays of the workspace: a failed first start keeps only its chat. */
function keptBody(state: SandboxNoticeState, body: string): string {
  return state.problem === 'error' && state.firstStart ? chatSaved : body
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
 * The bar under the chat while the sandbox is not running. It takes the
 * place of the composer, except after a failed first start, whose composer
 * stays under it. A refused start shows the words of the refusal, and no
 * action, because the start stays refused until its cause changes. A start
 * that failed shows the message that the app saved for it, such as the
 * 20-minute limit of a start, before the body. An archived workspace offers
 * Restore until its last day while it names its cloud computer, and gives
 * the day when it leaves the list. A removed workspace gives the day of its
 * removal.
 */
export function SandboxBar(props: BarNotice) {
  const problem = problemOf(props)
  return (
    <notice.Component
      body={barBody(props, keptBody(props, problem.body))}
      icon={problem.icon}
      moklyInstance="sandbox-bar"
      title={problem.title}
      tone={problem.tone}
      {...defined({
        action: problem.action ? (
          <RecoveryButton label={problem.action} state={props} />
        ) : undefined,
      })}
    />
  )
}

/** The title of a panel: the state of an archived workspace, in one word. */
function panelTitle(state: BarNotice, problem: Problem): string {
  if (state.problem !== 'archived') return problem.title
  return leftTheList(state) ? 'Removed' : 'Archived'
}

/**
 * What a panel shows while the sandbox is not running. The desktop layout
 * leaves the action and the words of a refusal to the chat bar beside it. A
 * phone shows the bar only on the Chat tab, so its panels show them too.
 */
export function SandboxPanel(props: {
  state: PanelNotice
  phone: boolean
  /** The place of the panel, which names it for Mokly. */
  place: 'file' | 'files' | 'tools' | 'preview'
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
  const problem = problemOf(state)
  return (
    <emptyState.Component
      moklyInstance={`sandbox-${props.place}`}
      {...defined({
        action:
          props.phone && problem.action ? (
            <RecoveryButton label={problem.action} state={state} />
          ) : undefined,
      })}
      body={
        props.phone && state.problem === 'refused'
          ? state.reason
          : keptBody(state, problem.panelBody)
      }
      icon={problem.icon}
      title={panelTitle(state, problem)}
    />
  )
}
