import {
  CircleAlert,
  CircleCheck,
  Square,
  Timer,
  TriangleAlert,
} from 'lucide-react'
import type { DeviceWorkspaceWindow } from '../../shared/device'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/mac/AllowAllBar.module.css'
import { ActionButton } from '../ui/actions'
import { systemClock, useNow, type Clock } from '../ui/clock'
import { timeLeft } from '../../shared/transcript/command-words'
import type { MacSettingsController, MacSettingsState } from './mac-settings'
import {
  controlOf,
  grantRuns,
  repeatable,
  repeatLabel,
  resultMessage,
  resultTitle,
  type ChangeResult,
} from './settings-results'

/** The grant of one workspace on this Mac, while it runs. */
function runningWindow(
  state: MacSettingsState,
  workspaceId: string,
  now: number,
): DeviceWorkspaceWindow | null {
  if (state.kind !== 'ready') return null
  return (
    state.settings.workspaceWindows.find(
      (grant) => grant.workspaceId === workspaceId && grantRuns(grant, now),
    ) ?? null
  )
}

const looks = {
  done: { icon: CircleCheck, tone: styles.done },
  'done-not-saved': { icon: TriangleAlert, tone: styles.notSaved },
  failed: { icon: CircleAlert, tone: styles.failed },
} as const

/**
 * The result of the last Stop or Keep of the workspace that the bar names.
 * While a grant runs, a change that the Mac made and saved does not show:
 * a Stop then belongs to an earlier grant, and a Keep shows as the grant
 * until Stop. A Stop that the Mac did not save or did not make shows until
 * the next change, also when a later read shows the saved 15 minutes
 * again. A Keep that failed shows only while its 15 minutes run.
 */
function shownResult(
  state: MacSettingsState,
  key: string,
  running: boolean,
): ChangeResult | null {
  if (!Object.hasOwn(state.results, key)) return null
  const result = state.results[key]
  if (running && result.outcome.status === 'done') return null
  if (!running && result.change.action === 'keep-workspace') return null
  return result
}

/**
 * The bar of the Mac app while every command of one workspace runs on this
 * Mac without asking (decision 62). For the 15 minutes it shows the time
 * left, from the end time that the Mac keeps, Keep until I stop, and Stop.
 * Keep turns them into a grant until Stop (Mac until-stop decision 2). A
 * grant until Stop shows Until you stop and Stop. After a Stop, the bar
 * names its result until the next change of the workspace, also after the
 * Stop ended the grant, a read, or a new pairing. While a grant runs, the
 * bar keeps its controls beside a change that the Mac did not save or did
 * not make. When no grant runs, Try again repeats such a Stop through the
 * current pairing. The bar shows nothing at other times. The app places it
 * at the top of the workspace, and gives it the settings of
 * `useMacSettings`, whose `refresh` it calls after an answer.
 */
export function AllowAllBar(props: {
  controller: MacSettingsController
  state: MacSettingsState
  workspaceId: string
  clock?: Clock
}) {
  const { controller, state, workspaceId } = props
  const listed =
    state.kind === 'ready' &&
    state.settings.workspaceWindows.some(
      (grant) => grant.workspaceId === workspaceId,
    )
  const now = useNow(props.clock ?? systemClock, listed)
  const grant = runningWindow(state, workspaceId, now)
  const stop = { action: 'stop-workspace', workspaceId } as const
  const keep = { action: 'keep-workspace', workspaceId } as const
  const key = controlOf(stop)
  const result = shownResult(state, key, grant !== null)
  const busy = state.busy.includes(key)
  const waits = Object.hasOwn(state.waiting, key) ? state.waiting[key] : null
  if (grant === null && result === null) return null
  const look = result ? looks[result.outcome.status] : null
  const Icon = look?.icon ?? Timer
  return (
    <section
      aria-label="Commands that run without asking"
      className={classes(
        styles.bar,
        look !== null && styles.result,
        look?.tone,
      )}
    >
      <Icon aria-hidden className={styles.icon} size={14} />
      {result ? (
        <span
          className={styles.text}
          role={result.outcome.status === 'done' ? 'status' : 'alert'}
        >
          <span className={styles.title}>{resultTitle(result)}</span>{' '}
          {resultMessage(result) ??
            'Each command from this workspace asks first.'}
        </span>
      ) : (
        <span className={styles.text}>
          Every command from this workspace runs on this Mac without asking.
        </span>
      )}
      {grant?.expiresAt === null ? (
        <span className={classes(styles.left, styles.open)}>
          Until you stop
        </span>
      ) : null}
      {grant && grant.expiresAt !== null ? (
        <>
          <span className={styles.left}>
            {timeLeft(grant.expiresAt, now)} left
          </span>
          <ActionButton
            busy={waits === 'keep-workspace'}
            disabled={busy}
            onPress={() => void controller.change(keep)}
          >
            Keep until I stop
          </ActionButton>
        </>
      ) : null}
      {grant ? (
        <ActionButton
          busy={waits === 'stop-workspace'}
          disabled={busy}
          icon={Square}
          onPress={() => void controller.change(stop)}
        >
          Stop
        </ActionButton>
      ) : null}
      {result &&
      repeatable(
        result,
        state.kind === 'ready' ? state.settings : null,
        now,
      ) ? (
        <ActionButton
          accessibilityLabel={repeatLabel(result)}
          busy={busy}
          disabled={state.kind !== 'ready'}
          onPress={() => void controller.change(stop)}
        >
          Try again
        </ActionButton>
      ) : null}
    </section>
  )
}
