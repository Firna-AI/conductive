import { useContext } from 'react'
import { Loader } from '@firna/ui/loader'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { LucideIcon } from 'lucide-react'
import { Archive, CircleAlert, CirclePause } from 'lucide-react'
import type { ArchivedComputer } from '../../shared/generated/ArchivedComputer'
import type { WorkspaceStart } from '../../shared/generated/WorkspaceStart'
import type { WorkspaceState } from '../../shared/generated/WorkspaceState'
import {
  WORKSPACE_RESTORE_MS,
  workspaceRemovedAt,
} from '../../shared/workspaces'
import { Notice } from '../../ui/components/common/Notice'
import styles from '../../ui/components/workspace/StartingCard.module.css'
import { formatDuration } from '../../shared/transcript/duration'
import { problemOf as noticeProblemOf } from '../../shell/workspace/notice-copy'
import { formatDay } from '../state/format'
import { ActionButton } from '../ui/actions'
import { ChatClock, useNow } from '../ui/clock'

/**
 * The start of a sandbox at the end of the chat: a quiet card with a moving
 * mark, each step so far, and the time since the start began. The card
 * keeps its own tick from the clock of the chat while it shows that time.
 */
export function StartingCard(props: { start: WorkspaceStart | null }) {
  const theme = useSharedUiTheme()
  const { start } = props
  const now = useNow(useContext(ChatClock), start !== null)
  const title =
    start?.kind === 'resume' ? 'Resuming the sandbox' : 'Starting the sandbox'
  return (
    <section aria-label={title} className={styles.starting}>
      <div className={styles.card}>
        <Loader
          accessibilityLabel={title}
          color={theme.colors.muted}
          size={14}
          variant="dot-grid"
        />
        {title}
      </div>
      <div className={styles.log}>
        <ol className={styles.steps}>
          {(start?.steps ?? []).map((step) => (
            <li key={step.id}>
              <span aria-hidden className={styles.caret}>
                ›
              </span>
              {step.label}
            </li>
          ))}
        </ol>
        {start ? (
          <span className={styles.elapsed}>
            {formatDuration(now - start.startedAt)}
          </span>
        ) : null}
      </div>
    </section>
  )
}

export type SandboxProblem = 'stopped' | 'error' | 'archived'

/** The problem of a workspace in `state`, or null when its sandbox has none. */
export function workspaceProblemOf(
  state: WorkspaceState | undefined,
): SandboxProblem | null {
  return state === 'stopped' || state === 'error' || state === 'archived'
    ? state
    : null
}

interface Problem {
  icon: LucideIcon
  title: string
  body: string
  /** The one way forward, when the sandbox can come back. */
  action?: string
  tone: 'neutral' | 'danger'
}

const saved = 'Your files and chat are saved.'

/**
 * A failed first start leaves a new workspace with no files yet, so its bar
 * promises only the chat, with its queued messages.
 */
const chatSaved = 'Your chat is saved.'

/** The read-only chat of a workspace whose cloud computer is deleted. */
const deletedComputer =
  'Its cloud computer is deleted, and the chat is read-only.'

/**
 * An archived workspace whose state of the cloud computer the Worker sent:
 * the words of the bar of the app, without an action, because the chat
 * offers no Restore. So a cloud computer that can still exist gets the
 * words of a bar without Restore, which promise only the chat history.
 * The end of its 14 days is the one that the Worker sends, and the day of
 * its Archive is 14 days before it when the record has none. `now` is the
 * clock of the chat.
 */
function knownProblem(
  archivedAt: number | null,
  now: number,
  computer: ArchivedComputer,
): Problem {
  const end = computer.restoreUntil
  const words = noticeProblemOf(
    { problem: 'archived', computer: computer.state, removed: now >= end },
    {
      archivedOn: formatDay(archivedAt ?? end - WORKSPACE_RESTORE_MS),
      removedOn: formatDay(end),
    },
  )
  return {
    icon: words.icon,
    title: words.title,
    body: words.body,
    tone: words.tone,
  }
}

/**
 * The words of an archived workspace: the words of the bar of the app for
 * a known state of its cloud computer, as `knownProblem` gives them. An
 * unknown state, and a record of an older Worker without one, keep the
 * words of `legacyArchivedProblem`.
 */
function archivedProblem(
  archivedAt: number | null,
  now: number,
  computer: ArchivedComputer | undefined,
): Problem {
  switch (computer?.state) {
    case 'may-exist':
    case 'deleted':
      return knownProblem(archivedAt, now, computer)
    case 'unknown':
    case undefined:
      return legacyArchivedProblem(archivedAt, now)
  }
}

/**
 * An archived workspace without a known state of its cloud computer: until
 * its 14 days end, the day of its Archive and the day when it leaves the
 * list. After them, the day of its removal, and that it left the list. The
 * words say "removed" for the workspace, because the app keeps its data.
 * These words stay until `plans/follow-ups/archived-computer-unknown-outcome.md`
 * settles them. `now` is the clock of the chat.
 */
function legacyArchivedProblem(
  archivedAt: number | null,
  now: number,
): Problem {
  const base = { icon: Archive, tone: 'neutral' } as const
  if (archivedAt === null) {
    return { ...base, title: 'Archived', body: deletedComputer }
  }
  const removedAt = workspaceRemovedAt(archivedAt, now)
  if (removedAt !== null) {
    return {
      ...base,
      title: `Removed on ${formatDay(removedAt)}`,
      body: `It left the list. ${deletedComputer}`,
    }
  }
  const leavesOn = formatDay(archivedAt + WORKSPACE_RESTORE_MS)
  return {
    ...base,
    title: `Archived on ${formatDay(archivedAt)}`,
    body: `${deletedComputer} It leaves the list on ${leavesOn}.`,
  }
}

function problemOf(
  problem: SandboxProblem,
  archivedAt: number | null,
  now: number,
  computer: ArchivedComputer | undefined,
): Problem {
  switch (problem) {
    case 'stopped':
      return {
        icon: CirclePause,
        title: 'Sandbox stopped',
        body: saved,
        action: 'Resume',
        tone: 'neutral',
      }
    case 'error':
      return {
        icon: CircleAlert,
        title: "The sandbox couldn't start",
        body: saved,
        action: 'Try again',
        tone: 'danger',
      }
    case 'archived':
      return archivedProblem(archivedAt, now, computer)
  }
}

/**
 * The bar under the chat while the sandbox does not run: Resume when it
 * stopped, Try again when it did not start, and the read-only chat of an
 * archived workspace, with the day when it leaves the list, or the day of
 * its removal, and the words that a known state of its cloud computer
 * gives, as `archivedProblem` says. A failed start shows the message that
 * the workspace saved for it first. The bar takes the place of the
 * composer, except after a failed first start, whose composer stays under
 * it. The bar reads the time from the clock of the chat.
 */
export function SandboxBar(props: {
  problem: SandboxProblem
  archivedAt: number | null
  /**
   * What the app knows of the cloud computer of an archived workspace, with
   * the end of its 14 days. A record of an older Worker has none.
   */
  archivedComputer?: ArchivedComputer
  /** The message that the workspace saved for a failed start, or null. */
  message: string | null
  /** The failed first start of a new workspace, which has no files yet. */
  firstStart: boolean
  busy: boolean
  onResume: () => void
}) {
  const now = useNow(useContext(ChatClock), false)
  const problem = problemOf(
    props.problem,
    props.archivedAt,
    now,
    props.archivedComputer,
  )
  const failed = props.problem === 'error'
  const kept = failed && props.firstStart ? chatSaved : problem.body
  const body = failed && props.message ? `${props.message} ${kept}` : kept
  return (
    <Notice
      action={
        problem.action ? (
          <ActionButton
            busy={props.busy}
            onPress={props.onResume}
            tone="primary"
          >
            {problem.action}
          </ActionButton>
        ) : undefined
      }
      body={body}
      icon={problem.icon}
      title={problem.title}
      tone={problem.tone}
    />
  )
}
