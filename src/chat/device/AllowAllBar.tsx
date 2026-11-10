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
  repeatLabel,
  resultMessage,
  resultTitle,
  type ChangeResult,
} from './settings-results'

/** The 15 minutes of one workspace on this Mac, while they run. */
function runningWindow(
  state: MacSettingsState,
  workspaceId: string,
  now: number,
): DeviceWorkspaceWindow | null {
  if (state.kind !== 'ready') return null
  return (
    state.settings.workspaceWindows.find(
      (grant) => grant.workspaceId === workspaceId && grant.expiresAt > now,
    ) ?? null
  )
}

const looks = {
  done: { icon: CircleCheck, tone: styles.done },
  'done-not-saved': { icon: TriangleAlert, tone: styles.notSaved },
  failed: { icon: CircleAlert, tone: styles.failed },
} as const

/**
 * The result of the last Stop of the workspace that the bar names. While
 * 15 minutes run, a Stop that the Mac made and saved belongs to earlier 15
 * minutes, so it does not show. A Stop that the Mac did not save or did not
 * make shows until the next Stop, also when a later read shows the saved 15
 * minutes again.
 */
function shownStop(
  state: MacSettingsState,
  key: string,
  running: boolean,
): ChangeResult | null {
  if (!Object.hasOwn(state.results, key)) return null
  const result = state.results[key]
  return running && result.outcome.status === 'done' ? null : result
}

/**
 * The bar of the Mac app while every command of one workspace runs on this
 * Mac without asking (decision 62): the time left of its 15 minutes, from
 * the end time that the Mac keeps, and Stop. After a Stop, the bar names
 * its result until the next Stop of the workspace, also after the Stop
 * ended the 15 minutes, a read, or a new pairing. While 15 minutes run, the
 * bar keeps the time left and Stop beside a Stop that the Mac did not save
 * or did not make. When they no longer run, Try again repeats such a Stop
 * through the current pairing. The bar shows nothing at other times. The app
 * places it at the top of the workspace, and gives it the settings of
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
  const key = controlOf(stop)
  const result = shownStop(state, key, grant !== null)
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
      {grant ? (
        <>
          <span className={styles.left}>
            {timeLeft(grant.expiresAt, now)} left
          </span>
          <ActionButton
            busy={state.busy.includes(key)}
            icon={Square}
            onPress={() => void controller.change(stop)}
          >
            Stop
          </ActionButton>
        </>
      ) : null}
      {!grant && result && result.outcome.status !== 'done' ? (
        <ActionButton
          accessibilityLabel={repeatLabel(result)}
          busy={state.busy.includes(key)}
          disabled={state.kind !== 'ready'}
          onPress={() => void controller.change(stop)}
        >
          Try again
        </ActionButton>
      ) : null}
    </section>
  )
}
