import {
  CircleAlert,
  CircleCheck,
  Square,
  Timer,
  TriangleAlert,
} from 'lucide-react'
import type { DeviceSettings, DeviceWorkspaceWindow } from '../../shared/device'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/mac/AllowAllBar.module.css'
import { ActionButton } from '../ui/actions'
import { systemClock, useNow, type Clock } from '../ui/clock'
import { timeLeft } from '../../shared/transcript/command-words'
import type { MacSettingsController } from './mac-settings'
import {
  controlOf,
  grantRuns,
  repeatable,
  repeatLabel,
  resultMessage,
  resultTitle,
  stoppedMessage,
  type ChangeResult,
} from './settings-results'
import { shownSettings, type MacSettingsState } from './settings-view'
import { doneStop, doneStopGone } from './done-stop-time'

/** The grant of one workspace in the settings that show, while it runs. */
function runningWindow(
  settings: DeviceSettings | null,
  workspaceId: string,
  now: number,
): DeviceWorkspaceWindow | null {
  return (
    settings?.workspaceWindows.find(
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
 * again. A Keep that failed shows only while its 15 minutes run. A start
 * shows its result under the switch of Mac access of the Capabilities
 * control and in the notice of a new workspace, never on the bar.
 */
function shownResult(
  state: MacSettingsState,
  key: string,
  running: boolean,
): ChangeResult | null {
  if (!Object.hasOwn(state.results, key)) return null
  const result = state.results[key]
  if (result.change.action === 'start-workspace-until-stop') return null
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
 * names its result, also after the Stop ended the grant. A Stop that the
 * Mac made and saved shows for 5 seconds from its end, then goes, also in
 * a new mount of the bar. A Stop that the Mac
 * did not save or did not make shows until the next change of the
 * workspace, also after a read or a new pairing. While a grant runs, the
 * bar keeps its controls beside a change that the Mac did not save or did
 * not make. When no grant runs, Try again repeats such a Stop through the
 * current pairing. The bar shows nothing at other times. After a read that
 * failed, it still shows the grant of the kept settings, with Stop, because
 * that grant may still run. The app places it at the top of the workspace,
 * and gives it the settings of `useMacSettings`, whose `refresh` it calls
 * after an answer.
 */
export function AllowAllBar(props: {
  controller: MacSettingsController
  state: MacSettingsState
  workspaceId: string
  clock?: Clock
}) {
  const { controller, state, workspaceId } = props
  const clock = props.clock ?? systemClock
  const settings = shownSettings(state)?.settings ?? null
  const listed =
    settings?.workspaceWindows.some(
      (grant) => grant.workspaceId === workspaceId,
    ) ?? false
  const stop = { action: 'stop-workspace', workspaceId } as const
  const keep = { action: 'keep-workspace', workspaceId } as const
  const key = controlOf(stop)
  const done = doneStop(
    Object.hasOwn(state.results, key) ? state.results[key] : undefined,
  )
  // The bar renders each second while a done Stop shows, so that it goes.
  const gone = done !== null && doneStopGone(done, clock.now())
  const now = useNow(clock, listed || (done !== null && !gone))
  const grant = runningWindow(settings, workspaceId, now)
  const result = gone ? null : shownResult(state, key, grant !== null)
  // The pressed button spins and keeps the focus. The other one is off.
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
          {resultMessage(result) ?? stoppedMessage}
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
            disabled={busy && waits !== 'keep-workspace'}
            onPress={() => void controller.change(keep)}
          >
            Keep until I stop
          </ActionButton>
        </>
      ) : null}
      {grant ? (
        <ActionButton
          busy={waits === 'stop-workspace'}
          disabled={busy && waits !== 'stop-workspace'}
          icon={Square}
          tone="outline"
          onPress={() => void controller.change(stop)}
        >
          Stop
        </ActionButton>
      ) : null}
      {result && repeatable(result, settings, now) ? (
        <ActionButton
          accessibilityLabel={repeatLabel(result)}
          busy={busy}
          disabled={settings === null}
          onPress={() => void controller.change(stop)}
        >
          Try again
        </ActionButton>
      ) : null}
    </section>
  )
}
