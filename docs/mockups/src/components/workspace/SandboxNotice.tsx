import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { defined } from '../../defined'
import type { ArchiveDays } from '../../fixtures/archive'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'
import styles from '../../../../../src/ui/components/workspace/SandboxNotice.module.css'
import type { SandboxNoticeState } from '../../../../../src/ui/components/workspace/sandboxNoticeState'
import {
  barBody,
  keptBody,
  leftTheList,
  problemOf,
  type Problem,
} from './sandboxProblems'

type ArchivedNotice = Extract<SandboxNoticeState, { problem: 'archived' }>

/** A stop or a failed start, whose bar offers Resume or Try again. */
type RecoverableNotice = Extract<
  SandboxNoticeState,
  { problem: 'stopped' | 'error' }
>

/**
 * A notice as the mockups draw it: the notice of the contract, for an
 * archived workspace the days that its bar gives, and for a stop or a
 * failed start the page that Resume or Try again opens, when the catalogue
 * draws the next state of the same workspace.
 */
export type BarNotice =
  | Extract<SandboxNoticeState, { problem: 'refused' }>
  | (RecoverableNotice & { recoverTo?: string })
  | (ArchivedNotice & { days: ArchiveDays })

/** What a panel shows: the notice of the bar, or the wait of a start. */
export type PanelNotice = BarNotice | { problem: 'starting' }

/**
 * The screen that the one way forward leads to, when the mockups draw it.
 * A Restore and the retry of the one failed first start that they draw
 * open fixed pages. Resume and the other Try again open the page that the
 * notice names: the next state of the same workspace.
 */
function recoveryPath(state: BarNotice): string | undefined {
  switch (state.problem) {
    case 'archived':
      return paths.restored
    case 'error':
      return state.firstStart === true ? paths.retrying : state.recoverTo
    case 'stopped':
      return state.recoverTo
    case 'refused':
      return undefined
  }
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

/**
 * The bar under the chat while the sandbox is not running. It takes the
 * place of the composer, except after a failed first start, whose composer
 * stays under it. A refused start shows the words of the refusal, and no
 * action, because the start stays refused until its cause changes. A start
 * that failed shows the message that the app saved for it, such as the
 * 20-minute limit of a start, before the body. So does a stop, such as the
 * stop after an own computer went offline. An archived workspace offers
 * Restore until its last day while it names its cloud computer, and gives
 * the day when it leaves the list. A removed workspace gives the day of its
 * removal. On an own computer that an admin removed, the bar says that the
 * files stay on that server, and it offers no Restore.
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
